#!/usr/bin/env python3
"""Export an image-prompts CSV for every word that does NOT yet have a clipart image.

Defaults assume the repo layout:
  Speech-Therapy-Games/
    word-lists/word-sets.json
    word-images/<set-folder>/<word>.png
    tools/export_image_prompts.py   <-- this script

Usage (from the project root):
    python3 tools/export_image_prompts.py

Options:
    --all-words            Export prompts for every word, even ones that
                           already have an image (useful to regenerate).
    --output PATH          Where to write the CSV (default: tools/image-prompts.csv).
    --word-sets PATH       Override the word-sets.json path.
    --word-images-root DIR Override the root folder containing per-set folders.
    --library-dir DIR      Optional shared library to also scan for existing images
                           (default: word-images/_library if it exists).
    --template TEXT        Override the prompt template. The string {word} is
                           replaced with the lowercase word.
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path
from typing import Dict, Iterable, List, Set, Tuple


IMAGE_EXTENSIONS: Set[str] = {".png", ".jpg", ".jpeg", ".webp", ".gif"}

DEFAULT_PROMPT_TEMPLATE = (
    "clean vector clipart of {word}, centered, isolated, plain white "
    "background, minimal style, bold outline, no text, square composition"
)


def find_repo_root(start: Path) -> Path:
    """Return the project root by walking up to a folder that contains
    both ``word-lists`` and ``word-images``."""
    here = start.resolve()
    for candidate in [here, *here.parents]:
        if (candidate / "word-lists").is_dir() and (candidate / "word-images").is_dir():
            return candidate
    return start.resolve()


def load_sets(path: Path) -> List[dict]:
    if not path.is_file():
        raise SystemExit(f"word-sets.json not found at: {path}")
    with path.open(encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, list):
        raise SystemExit("word-sets.json must be a JSON array of set objects.")
    return data


def collect_words(sets: Iterable[dict]) -> List[Tuple[str, str]]:
    """Return a de-duplicated list of (folder, word) tuples in stable order."""
    seen: Set[Tuple[str, str]] = set()
    ordered: List[Tuple[str, str]] = []
    for s in sets:
        folder = (s.get("folder") or "").strip()
        if not folder:
            continue
        for pair in s.get("pairs", []) or []:
            for raw in pair:
                if not raw:
                    continue
                word = str(raw).strip()
                if not word:
                    continue
                key = (folder, word)
                if key in seen:
                    continue
                seen.add(key)
                ordered.append(key)
    return ordered


def _norm_folder(name: str) -> str:
    """Normalize folder names so trailing spaces / case quirks don't cause
    false 'missing' reports."""
    return (name or "").strip().lower()


def index_existing_image_stems(roots: Iterable[Path]) -> Dict[str, Set[str]]:
    """Return a dict of {normalized_folder: set(lowercase_stems)} for every
    image found under each of the provided roots. The special key ``"*"``
    collects every stem found anywhere (used as a library/global fallback).
    """
    by_folder: Dict[str, Set[str]] = {"*": set()}
    for root in roots:
        if not root or not root.is_dir():
            continue
        for path in root.rglob("*"):
            if not path.is_file():
                continue
            if path.suffix.lower() not in IMAGE_EXTENSIONS:
                continue
            stem = path.stem.strip().lower()
            if not stem:
                continue
            folder_key = _norm_folder(path.parent.name)
            by_folder.setdefault(folder_key, set()).add(stem)
            by_folder["*"].add(stem)
    return by_folder


def word_exists_anywhere(word: str, index: Dict[str, Set[str]]) -> bool:
    """An image with this stem exists somewhere on disk (library or any folder).
    Once we have it anywhere, we can mirror it into every folder that needs it,
    so it does NOT need to be regenerated.
    """
    target = word.strip().lower()
    return target in index.get("*", set())


def word_exists_in_folder(folder: str, word: str, index: Dict[str, Set[str]]) -> bool:
    """An image with this stem exists in this specific folder OR in _library."""
    target = word.strip().lower()
    folder_stems = index.get(_norm_folder(folder))
    if folder_stems and target in folder_stems:
        return True
    library_stems = index.get("_library")
    if library_stems and target in library_stems:
        return True
    return False


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--word-sets", type=Path, default=None,
                        help="Path to word-sets.json (default: <repo>/word-lists/word-sets.json)")
    parser.add_argument("--word-images-root", type=Path, default=None,
                        help="Path to the folder that contains per-set image folders "
                             "(default: <repo>/word-images)")
    parser.add_argument("--library-dir", type=Path, default=None,
                        help="Optional extra folder to scan for existing images "
                             "(default: <word-images-root>/_library if present)")
    parser.add_argument("--output", type=Path, default=None,
                        help="Where to write the CSV (default: tools/image-prompts.csv)")
    parser.add_argument("--all-words", action="store_true",
                        help="Include every word, even those with an existing image.")
    parser.add_argument("--per-folder", action="store_true",
                        help="List every folder-slot that lacks an image in that "
                             "specific folder. By default we only list a word once "
                             "if no image exists anywhere (so we don't regenerate "
                             "duplicates we can simply copy into the folder).")
    parser.add_argument("--template", type=str, default=DEFAULT_PROMPT_TEMPLATE,
                        help="Prompt template; {word} is replaced with the lowercase word.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    repo_root = find_repo_root(Path(__file__).parent)
    word_sets_path = args.word_sets or (repo_root / "word-lists" / "word-sets.json")
    word_images_root = args.word_images_root or (repo_root / "word-images")
    library_dir = args.library_dir
    if library_dir is None:
        candidate = word_images_root / "_library"
        if candidate.is_dir():
            library_dir = candidate
    output_path = args.output or (repo_root / "tools" / "image-prompts.csv")

    sets = load_sets(word_sets_path)
    words = collect_words(sets)
    index = index_existing_image_stems([word_images_root, library_dir])

    # First pass: build the unique-word view (the practical "what needs
    # generating" list, since a word generated in one folder can be mirrored
    # into all the others that need it).
    unique_words: List[Tuple[str, str]] = []  # (representative_folder, word_lower)
    seen_lower: Set[str] = set()
    for folder, word in words:
        key = word.strip().lower()
        if key in seen_lower:
            continue
        seen_lower.add(key)
        unique_words.append((folder, key))

    missing_unique = [(folder, word) for folder, word in unique_words
                      if not word_exists_anywhere(word, index)]

    if args.all_words:
        rows = words
    elif args.per_folder:
        rows = [(folder, word) for folder, word in words
                if not word_exists_in_folder(folder, word, index)]
    else:
        rows = missing_unique

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["folder", "word", "prompt"])
        for folder, word in rows:
            prompt = args.template.format(word=word)
            writer.writerow([folder, word, prompt])

    total_slots = len(words)
    total_unique = len(unique_words)
    existing_stems = len(index.get("*", set()))
    print(f"Word-sets: {word_sets_path}")
    print(f"Image roots scanned: {word_images_root}"
          + (f" and {library_dir}" if library_dir else ""))
    print(f"Total (folder, word) slots in sets: {total_slots}")
    print(f"Unique words across all sets:       {total_unique}")
    print(f"Unique image stems already on disk: {existing_stems}")
    print(f"Unique words still missing an image: {len(missing_unique)}")
    if args.all_words:
        print(f"\nWrote ALL {len(rows)} slots to: {output_path}")
    elif args.per_folder:
        per_folder_missing = len(rows)
        print(f"Per-folder slots missing an image in that folder: {per_folder_missing}")
        print(f"Wrote per-folder missing CSV to: {output_path}")
    else:
        print(f"\nWrote unique-missing CSV ({len(rows)} rows) to: {output_path}")

    if not args.all_words and rows:
        # Friendly preview grouped by folder
        by_folder: Dict[str, List[str]] = {}
        for folder, word in rows:
            by_folder.setdefault(folder, []).append(word)
        if args.per_folder:
            print(f"\nMissing slots span {len(by_folder)} set folder(s).")
        else:
            print(f"\nUnique missing words (first 30 shown):")
            for _, word in rows[:30]:
                print(f"  - {word}")
            if len(rows) > 30:
                print(f"  ... plus {len(rows) - 30} more.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
