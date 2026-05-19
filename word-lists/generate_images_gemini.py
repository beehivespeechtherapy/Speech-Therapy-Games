#!/usr/bin/env python3
"""
Generate clipart images for minimal-pair words using Google Gemini.

Images are saved to Speech-Therapy-Games/word-images/_library/ (master copy)
and optionally mirrored into per-set folders with ``--mirror-sets``. Games load from ``_library/`` only.

Requires GEMINI_API_KEY in word-lists/.env or tools/.env.

Usage (from word-lists/ or repo root):

  python3 generate_images_gemini.py --dry-run
  python3 generate_images_gemini.py --list-for-browser
  python3 generate_images_gemini.py --folder "T:J Minimal Pairs - Initial"
  python3 generate_images_gemini.py --limit 10
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import sys
import time
import warnings
from pathlib import Path
from typing import Dict, List, Set, Tuple

warnings.filterwarnings("ignore", message=".*Python version 3.9.*")
warnings.filterwarnings("ignore", message=".*urllib3.*OpenSSL.*")
warnings.filterwarnings("ignore", message=".*LibreSSL.*")

WORD_LISTS_DIR = Path(__file__).resolve().parent
REPO_ROOT = WORD_LISTS_DIR.parent
WORD_IMAGES_ROOT = REPO_ROOT / "word-images"
LIBRARY_DIR = WORD_IMAGES_ROOT / "_library"

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}


def load_dotenv(path: Path) -> None:
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


load_dotenv(WORD_LISTS_DIR / ".env")
load_dotenv(REPO_ROOT / "tools" / ".env")


def load_word_sets(path: Path) -> List[dict]:
    if not path.is_file():
        return []
    with path.open(encoding="utf-8") as f:
        data = json.load(f)
    return data if isinstance(data, list) else []


def word_to_folders(sets: List[dict]) -> Dict[str, List[str]]:
    mapping: Dict[str, Set[str]] = {}
    for s in sets:
        folder = (s.get("folder") or "").strip()
        if not folder:
            continue
        for pair in s.get("pairs", []) or []:
            for raw in pair:
                if not raw:
                    continue
                word = str(raw).strip()
                if word:
                    mapping.setdefault(word.lower(), set()).add(folder)
    return {w: sorted(folders) for w, folders in mapping.items()}


def collect_words(sets: List[dict]) -> Dict[str, str]:
    """Map lowercase stem -> display spelling (first seen)."""
    out: Dict[str, str] = {}
    for s in sets:
        for pair in s.get("pairs", []) or []:
            for raw in pair:
                if not raw:
                    continue
                w = str(raw).strip()
                if w and w.lower() not in out:
                    out[w.lower()] = w
    return out


def index_existing_images(word_images_root: Path, library_dir: Path) -> Set[str]:
    """Lowercase stems found in _library or any folder under word-images/."""
    stems: Set[str] = set()
    for root in (word_images_root, library_dir):
        if not root.is_dir():
            continue
        for path in root.rglob("*"):
            if not path.is_file():
                continue
            if path.suffix.lower() not in IMAGE_EXTENSIONS:
                continue
            stem = path.stem.strip().lower()
            if stem:
                stems.add(stem)
    return stems


def destination_paths(
    word: str,
    folder_map: Dict[str, List[str]],
    word_images_root: Path,
    library_dir: Path,
    mirror_sets: bool,
) -> List[Path]:
    paths: List[Path] = []
    library_dir.mkdir(parents=True, exist_ok=True)
    paths.append(library_dir / f"{word}.png")
    if mirror_sets:
        for folder in folder_map.get(word.lower(), []):
            dest_dir = word_images_root / folder
            dest_dir.mkdir(parents=True, exist_ok=True)
            paths.append(dest_dir / f"{word}.png")
    return paths


def write_png_to_paths(paths: List[Path], data: bytes) -> int:
    if not paths:
        return 0
    paths[0].parent.mkdir(parents=True, exist_ok=True)
    paths[0].write_bytes(data)
    count = 1
    for p in paths[1:]:
        p.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(paths[0], p)
        count += 1
    return count


def generate_and_save_image(
    client,
    word: str,
    dest_paths: List[Path],
    delay_seconds: float,
    model: str,
) -> bool:
    prompt = (
        f'Generate a single, simple clipart-style illustration of the word "{word}". '
        "Style: friendly, clear, suitable for a children's speech therapy game. "
        "White or plain background. No text or labels in the image. One main object only."
    )
    max_retries = 3
    response = None
    for attempt in range(max_retries):
        try:
            from google.genai.types import GenerateContentConfig

            config = GenerateContentConfig(response_modalities=["TEXT", "IMAGE"])
            response = client.models.generate_content(
                model=model,
                contents=prompt,
                config=config,
            )
            print(f'  [OK] Got API response for "{word}".')
            break
        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "quota" in err_str.lower():
                wait_sec = 60
                match = re.search(r"retry in (\d+(?:\.\d+)?)\s*s", err_str, re.I)
                if match:
                    wait_sec = max(45, int(float(match.group(1))) + 5)
                if attempt < max_retries - 1:
                    print(f"  [Quota limit] Waiting {wait_sec}s before retry ({attempt + 1}/{max_retries})...")
                    time.sleep(wait_sec)
                    continue
                print(f"  [Skip] {word}: quota exceeded. Wait and try again later.")
                print("  See https://ai.google.dev/gemini-api/docs/rate-limits")
                return False
            if "response_modalities" in err_str or "IMAGE" in err_str:
                print(f"  [Skip] {word}: image generation not available. {e}")
                return False
            raise

    if not response or not response.candidates:
        print(f"  [No image] {word}: empty response.")
        return False

    png_bytes: bytes | None = None
    parts = getattr(response.candidates[0].content, "parts", []) or []
    for part in parts:
        inline = getattr(part, "inline_data", None)
        if not inline:
            continue
        data = getattr(inline, "data", None) or getattr(inline, "image_bytes", None)
        if not data:
            continue
        if isinstance(data, bytes):
            png_bytes = data
        elif isinstance(data, str):
            import base64

            png_bytes = base64.b64decode(data)
        else:
            png_bytes = bytes(data)
        break

    if not png_bytes:
        print(f"  [No image] {word}: response had no image data (parts={len(parts)}).")
        return False

    n = write_png_to_paths(dest_paths, png_bytes)
    try:
        rel = dest_paths[0].relative_to(REPO_ROOT)
    except ValueError:
        rel = dest_paths[0]
    print(f"  Saved: {rel} (+{n - 1} mirror copy/copies)")
    time.sleep(delay_seconds)
    return True


def build_todo(
    words: Dict[str, str],
    existing_stems: Set[str],
    folder_map: Dict[str, List[str]],
    only_folder: str | None,
) -> List[Tuple[str, str]]:
    todo: List[Tuple[str, str]] = []
    for wl, display in sorted(words.items(), key=lambda x: x[1].lower()):
        if wl in existing_stems:
            continue
        folders = folder_map.get(wl, [])
        if only_folder:
            if only_folder not in folders:
                continue
            ex = only_folder
        else:
            ex = folders[0] if folders else ""
        todo.append((display, ex))
    return todo


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="List missing words only")
    parser.add_argument(
        "--list-for-browser",
        action="store_true",
        help="Write missing_images_browser_checklist.txt for gemini.google.com",
    )
    parser.add_argument("--folder", type=str, help="Only words used in this set folder name")
    parser.add_argument("--limit", type=int, default=0, help="Stop after N new images (0 = no limit)")
    parser.add_argument("--delay", type=float, default=3.0, help="Seconds between API calls")
    parser.add_argument(
        "--model",
        type=str,
        default="gemini-2.5-flash-preview-05-20",
        help="Image model (try gemini-2.5-flash-image if quota issues)",
    )
    parser.add_argument("--word-sets", type=Path, default=WORD_LISTS_DIR / "word-sets.json")
    parser.add_argument("--word-images-root", type=Path, default=WORD_IMAGES_ROOT)
    parser.add_argument("--library-dir", type=Path, default=LIBRARY_DIR)
    parser.add_argument(
        "--mirror-sets",
        action="store_true",
        help="Also copy into per-set folders (legacy). Default: _library/ only.",
    )
    args = parser.parse_args()

    sets = load_word_sets(args.word_sets)
    if not sets:
        print(f"word-sets.json not found or empty: {args.word_sets}")
        print("Export CSV from Google Sheets, run tools/word-list-tool.html, save word-sets.json here.")
        sys.exit(1)

    words = collect_words(sets)
    folder_map = word_to_folders(sets)
    existing = index_existing_images(args.word_images_root, args.library_dir)
    todo = build_todo(words, existing, folder_map, args.folder or None)

    if not todo:
        print("No missing images. Every word in word-sets.json has a PNG in _library/ or a set folder.")
        return

    print(f"Found {len(todo)} missing word(s).")
    print(f"Master library: {args.library_dir.resolve()}")
    print(f"Set folders under: {args.word_images_root.resolve()}")
    print(f"Model: {args.model}")

    if args.dry_run:
        for display, ex in todo[:40]:
            suffix = f"  (e.g. {ex})" if ex else ""
            print(f"  {display}.png{suffix}")
        if len(todo) > 40:
            print(f"  ... and {len(todo) - 40} more.")
        return

    if args.list_for_browser:
        checklist_path = WORD_LISTS_DIR / "missing_images_browser_checklist.txt"
        with checklist_path.open("w", encoding="utf-8") as f:
            f.write(
                "# Generate each word in Gemini in the browser, then save as word.png.\n"
                f"# Master copy: word-images/_library/\n"
                f"# Also copy into the set folder(s) listed below.\n\n"
            )
            for display, ex in todo:
                f.write(f"{display}\n")
                f.write(f"  → Save as: {display}.png\n")
                f.write(f"  → Master: word-images/_library/{display}.png\n")
                if ex:
                    f.write(f"  → Set folder: word-images/{ex}/\n")
                other = [fd for fd in folder_map.get(display.lower(), []) if fd != ex]
                for fd in other[:3]:
                    f.write(f"  → Also used in: word-images/{fd}/\n")
                if len(other) > 3:
                    f.write(f"  → ... and {len(other) - 3} more set folder(s)\n")
                f.write("\n")
        print(f"Wrote {len(todo)} items to {checklist_path}")
        return

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Set GEMINI_API_KEY in word-lists/.env or tools/.env")
        print("Get a key: https://aistudio.google.com/app/apikey")
        sys.exit(1)

    try:
        from google import genai
    except ImportError:
        print("Install the Gemini SDK: pip3 install google-genai")
        sys.exit(1)

    client = genai.Client(api_key=api_key)
    mirror = args.mirror_sets
    done = 0
    for display, _ex in todo:
        dests = destination_paths(
            display, folder_map, args.word_images_root, args.library_dir, mirror
        )
        if generate_and_save_image(client, display, dests, args.delay, args.model):
            done += 1
            existing.add(display.lower())
        if args.limit and done >= args.limit:
            print(f"Stopped after {done} images (--limit {args.limit}).")
            break

    print(f"Done. Generated {done} image(s).")
    if mirror and done:
        print("Copies were mirrored into each set folder from word-sets.json.")


if __name__ == "__main__":
    main()
