#!/usr/bin/env python3
"""Copy images from ``word-images/_library/`` into every per-set folder that
needs them, using spellings from ``word-lists/word-sets.json``.

Use this when set folders look empty (or are missing some PNGs) but the
master copies still exist in ``_library/``. This script never deletes anything;
it only creates missing files (unless you pass ``--force``).

Examples (from the project root):

    python3 tools/mirror_library_to_sets.py --dry-run
    python3 tools/mirror_library_to_sets.py
    python3 tools/mirror_library_to_sets.py --only-folder "T:J Minimal Pairs - Initial"
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path
from typing import Dict, List, Set, Tuple


IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}


def find_repo_root(start: Path) -> Path:
    here = start.resolve()
    for candidate in [here, *here.parents]:
        if (candidate / "word-lists").is_dir() and (candidate / "word-images").is_dir():
            return candidate
    return start.resolve()


REPO_ROOT = find_repo_root(Path(__file__).parent)


def index_library(library_dir: Path) -> Dict[str, Path]:
    """Map lowercase stem -> actual Path (first wins if duplicates)."""
    out: Dict[str, Path] = {}
    if not library_dir.is_dir():
        return out
    for p in library_dir.iterdir():
        if not p.is_file() or p.suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        key = p.stem.strip().lower()
        if key and key not in out:
            out[key] = p
    return out


def collect_folder_word_slots(word_sets_path: Path) -> List[Tuple[str, str]]:
    """Return list of (folder, word) for every word in every pair, de-duplicated
    per folder (the same word can appear in more than one minimal pair).
    """
    with word_sets_path.open(encoding="utf-8") as f:
        sets = json.load(f)
    seen: Set[Tuple[str, str]] = set()
    slots: List[Tuple[str, str]] = []
    for s in sets:
        folder = (s.get("folder") or "").strip()
        if not folder:
            continue
        for pair in s.get("pairs", []) or []:
            for raw in pair:
                if not raw:
                    continue
                w = str(raw).strip()
                if not w:
                    continue
                key = (folder, w)
                if key in seen:
                    continue
                seen.add(key)
                slots.append((folder, w))
    return slots


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--word-sets", type=Path, default=REPO_ROOT / "word-lists" / "word-sets.json")
    p.add_argument("--word-images-root", type=Path, default=REPO_ROOT / "word-images")
    p.add_argument("--library-dir", type=Path, default=REPO_ROOT / "word-images" / "_library")
    p.add_argument("--only-folder", type=str, default="",
                   help="Only mirror into this exact set folder name (optional).")
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--force", action="store_true",
                   help="Overwrite an existing PNG in a set folder (default: skip if present).")
    return p.parse_args()


def main() -> int:
    args = parse_args()
    lib_index = index_library(args.library_dir)
    if not lib_index:
        print(f"No images found under {args.library_dir}", file=sys.stderr)
        return 1

    slots = collect_folder_word_slots(args.word_sets)
    if args.only_folder:
        slots = [(f, w) for f, w in slots if f == args.only_folder]
        if not slots:
            print(f"No words found for folder {args.only_folder!r} in word-sets.json.", file=sys.stderr)
            return 1

    copied = 0
    skipped_no_lib = 0
    skipped_dest_exists = 0
    errors: List[str] = []

    for folder, word in slots:
        stem_lc = word.lower()
        src = lib_index.get(stem_lc)
        if not src:
            skipped_no_lib += 1
            continue
        dest_dir = args.word_images_root / folder
        dest = dest_dir / f"{word}{src.suffix.lower()}"

        if dest.exists() and not args.force:
            skipped_dest_exists += 1
            continue

        if args.dry_run:
            copied += 1
            continue

        try:
            dest_dir.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dest)
            copied += 1
        except OSError as exc:
            errors.append(f"{src} -> {dest}: {exc}")

    action = "Would copy" if args.dry_run else "Copied"
    print(f"{action}: {copied}")
    print(f"Skipped (no matching file in _library): {skipped_no_lib}")
    print(f"Skipped (destination already exists): {skipped_dest_exists}")
    if errors:
        print(f"Errors: {len(errors)}")
        for e in errors[:20]:
            print(f"  {e}")
        if len(errors) > 20:
            print(f"  ... and {len(errors) - 20} more.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
