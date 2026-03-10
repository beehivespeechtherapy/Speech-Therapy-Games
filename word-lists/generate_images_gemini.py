#!/usr/bin/env python3
"""
Generate clipart images for minimal-pair words using Google Gemini.
Run this from the word-lists folder (or set paths below). Requires GEMINI_API_KEY.

Usage:
  1. Get an API key: https://aistudio.google.com/app/apikey
  2. Set it: export GEMINI_API_KEY="your-key"   (or put in .env)
  3. Run: python3 generate_images_gemini.py

Options:
  --dry-run     List words that would be generated (no API calls)
  --folder "X"  Only generate for this folder name (e.g. "T:K Minimal Pairs - Initial")
  --limit N     Stop after N images (default: no limit)
"""

import argparse
import json
import os
import sys
import time
import warnings
from pathlib import Path

# Hide noisy warnings (Python 3.9 EOL, urllib3/OpenSSL) so quota messages are easier to see
warnings.filterwarnings("ignore", message=".*Python version 3.9.*")
warnings.filterwarnings("ignore", message=".*urllib3.*OpenSSL.*")
warnings.filterwarnings("ignore", message=".*LibreSSL.*")

WORD_LISTS_DIR = Path(__file__).resolve().parent
WORD_IMAGES_ROOT = WORD_LISTS_DIR.parent.parent / "Word Images"

# Load .env from this folder (no extra package needed)
_env = WORD_LISTS_DIR / ".env"
if _env.exists():
    for line in _env.read_text().strip().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def load_words_per_folder():
    json_path = WORD_LISTS_DIR / "word-sets.json"
    if not json_path.exists():
        json_path = Path.home() / "speech-therapy-games" / "word-images" / "word-sets.json"
    if not json_path.exists():
        print("word-sets.json not found. Run build_word_lists.py first.")
        return None
    with open(json_path, encoding="utf-8") as f:
        sets = json.load(f)
    by_folder = {}
    for s in sets:
        folder = s.get("folder", "")
        if not folder:
            continue
        if folder not in by_folder:
            by_folder[folder] = set()
        for pair in s.get("pairs", []):
            for w in pair:
                by_folder[folder].add(w.strip())
    return by_folder


def image_exists(folder_path: Path, word: str) -> bool:
    for ext in (".png", ".jpg", ".jpeg"):
        if (folder_path / f"{word}{ext}").exists():
            return True
    return False


def generate_and_save_image(client, word: str, folder_path: Path, delay_seconds: float = 1.0, model: str = "gemini-2.5-flash-preview-05-20") -> bool:
    """Call Gemini to generate one image and save as word.png. Returns True on success."""
    prompt = (
        f'Generate a single, simple clipart-style illustration of the word "{word}". '
        "Style: friendly, clear, suitable for a children's speech therapy game. "
        "White or plain background. No text or labels in the image. One main object only."
    )
    import re
    max_retries = 3
    for attempt in range(max_retries):
        try:
            from google.genai.types import GenerateContentConfig
            from google.genai import errors as genai_errors
            config = GenerateContentConfig(response_modalities=["TEXT", "IMAGE"])
            response = client.models.generate_content(
                model=model,
                contents=prompt,
                config=config,
            )
            print(f"  [OK] Got API response for \"{word}\".")
            break
        except Exception as e:
            err_str = str(e)
            # Quota exceeded (429): wait and retry
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "quota" in err_str.lower():
                wait_sec = 60
                match = re.search(r"retry in (\d+(?:\.\d+)?)\s*s", err_str, re.I)
                if match:
                    wait_sec = max(45, int(float(match.group(1))) + 5)
                if attempt < max_retries - 1:
                    print(f"  [Quota limit] Waiting {wait_sec}s before retry ({attempt + 1}/{max_retries})...")
                    time.sleep(wait_sec)
                    continue
                print(f"  [Skip] {word}: quota exceeded. Wait an hour or try again tomorrow.")
                print("  See https://ai.google.dev/gemini-api/docs/rate-limits")
                return False
            if "response_modalities" in err_str or "IMAGE" in err_str:
                print(f"  [Skip] {word}: image generation not available. {e}")
                return False
            raise

    # Extract image from response (support common response shapes)
    out_path = folder_path / f"{word}.png"
    saved = False
    if response.candidates:
        parts = getattr(response.candidates[0].content, "parts", []) or []
        for part in parts:
            inline = getattr(part, "inline_data", None)
            if not inline:
                continue
            data = getattr(inline, "data", None) or getattr(inline, "image_bytes", None)
            if not data:
                continue
            if isinstance(data, bytes):
                out_path.write_bytes(data)
            elif isinstance(data, str):
                import base64
                out_path.write_bytes(base64.b64decode(data))
            else:
                out_path.write_bytes(bytes(data))
            saved = True
            break
    if not saved:
        # Debug: show what we got so we can fix extraction if API shape changed
        has_candidates = bool(response.candidates)
        num_parts = len(getattr(response.candidates[0].content, "parts", [])) if response.candidates else 0
        print(f"  [No image] {word}: response had no image data (candidates={has_candidates}, parts={num_parts}).")
        return False

    print(f"  Saved: {out_path.relative_to(WORD_IMAGES_ROOT)}")
    time.sleep(delay_seconds)
    return True


def main():
    parser = argparse.ArgumentParser(description="Generate word images with Gemini")
    parser.add_argument("--dry-run", action="store_true", help="Only list missing images, no API calls")
    parser.add_argument("--list-for-browser", action="store_true", help="Write a checklist file for generating these in Gemini in the browser (no API calls)")
    parser.add_argument("--folder", type=str, help="Only process this folder name (e.g. 'T:K Minimal Pairs - Initial')")
    parser.add_argument("--limit", type=int, default=0, help="Stop after N new images (0 = no limit)")
    parser.add_argument("--delay", type=float, default=3.0, help="Seconds between API calls (default 3; use 5–10 if you hit quota)")
    parser.add_argument("--model", type=str, default="gemini-2.5-flash-preview-05-20", help="Image model; if quota is 0, try: --model gemini-2.5-flash-image")
    args = parser.parse_args()

    by_folder = load_words_per_folder()
    if not by_folder:
        sys.exit(1)

    if args.folder:
        if args.folder not in by_folder:
            print(f"Folder not found: {args.folder}")
            sys.exit(1)
        by_folder = {args.folder: by_folder[args.folder]}

    # Build list of (folder, word) that need images
    todo = []
    for folder in sorted(by_folder.keys()):
        fd = WORD_IMAGES_ROOT / folder
        for word in sorted(by_folder[folder]):
            if not image_exists(fd, word):
                todo.append((folder, word))

    if not todo:
        print("No missing images. All words in the selected sets already have an image.")
        return

    print(f"Found {len(todo)} missing image(s).")
    print(f"Using model: {args.model}")
    print(f"Images are saved to: {WORD_IMAGES_ROOT.resolve()}")
    if args.dry_run:
        for folder, word in todo[:30]:
            print(f"  {folder} / {word}.png")
        if len(todo) > 30:
            print(f"  ... and {len(todo) - 30} more.")
        return

    if args.list_for_browser:
        checklist_path = WORD_LISTS_DIR / "missing_images_browser_checklist.txt"
        with open(checklist_path, "w", encoding="utf-8") as f:
            f.write("# Generate each word in Gemini in the browser, then save as word.png in the folder below.\n")
            f.write("# Save location: Beehive Speech Therapy → Games → Word Images → [folder]\n\n")
            for folder, word in todo:
                f.write(f"{word}\n  → Folder: {folder}\n  → Save as: {word}.png\n\n")
        print(f"Wrote {len(todo)} items to {checklist_path}")
        print("Open that file and use it as a checklist while generating in gemini.google.com")
        return

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Set GEMINI_API_KEY in your environment or in a .env file in this folder.")
        print("Get a key: https://aistudio.google.com/app/apikey")
        sys.exit(1)

    try:
        from google import genai
    except ImportError:
        print("Install the Gemini SDK: pip install google-genai")
        sys.exit(1)

    client = genai.Client(api_key=api_key)
    done = 0
    for folder, word in todo:
        fd = WORD_IMAGES_ROOT / folder
        fd.mkdir(parents=True, exist_ok=True)
        if generate_and_save_image(client, word, fd, args.delay, args.model):
            done += 1
        if args.limit and done >= args.limit:
            print(f"Stopped after {done} images (--limit {args.limit}).")
            break

    print(f"Done. Generated {done} image(s).")


if __name__ == "__main__":
    main()
