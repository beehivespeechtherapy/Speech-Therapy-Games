#!/usr/bin/env python3
"""
List all words from word-sets.json and which still need images.

Scans Speech-Therapy-Games/word-images/ (including _library/).
For a plain missing-word list, you can also run from the repo root:

    python3 tools/list_missing_library_words.py --no-xlsx-compare
"""
import json
from pathlib import Path

WORD_LISTS_DIR = Path(__file__).resolve().parent
REPO_ROOT = WORD_LISTS_DIR.parent
WORD_IMAGES_ROOT = REPO_ROOT / "word-images"
LIBRARY_DIR = WORD_IMAGES_ROOT / "_library"

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}


def stem_exists(word: str, existing: set) -> bool:
    return word.strip().lower() in existing


def index_stems() -> set:
    stems = set()
    for root in (WORD_IMAGES_ROOT, LIBRARY_DIR):
        if not root.is_dir():
            continue
        for path in root.rglob("*"):
            if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS:
                s = path.stem.strip().lower()
                if s:
                    stems.add(s)
    return stems


def main():
    json_path = WORD_LISTS_DIR / "word-sets.json"
    if not json_path.exists():
        print("word-sets.json not found.")
        print("Use tools/word-list-tool.html and save as word-lists/word-sets.json")
        return

    with open(json_path, encoding="utf-8") as f:
        sets = json.load(f)

    by_folder = {}
    for s in sets:
        folder = (s.get("folder") or "").strip()
        if not folder:
            continue
        if folder not in by_folder:
            by_folder[folder] = set()
        for pair in s.get("pairs", []) or []:
            for w in pair:
                if w:
                    by_folder[folder].add(str(w).strip())

    existing = index_stems()

    print("folder,word,path")
    for folder in sorted(by_folder.keys()):
        for word in sorted(by_folder[folder]):
            path = f"word-images/{folder}/{word}.png"
            print(f'"{folder}",{word},{path}')

    missing = []
    for folder in sorted(by_folder.keys()):
        for word in sorted(by_folder[folder]):
            if not stem_exists(word, existing):
                missing.append((folder, word))

    unique_missing = {}
    for folder, word in missing:
        unique_missing.setdefault(word.lower(), (word, folder))

    print(f"\n# Missing images: {len(unique_missing)} unique word(s) "
          f"({len(missing)} folder slots)")
    print(f"# Scanned: {WORD_IMAGES_ROOT} and {LIBRARY_DIR}")
    print("# Tip: python3 generate_images_gemini.py --dry-run")
    for wl, (word, folder) in sorted(unique_missing.items(), key=lambda x: x[1][0].lower())[:50]:
        print(f"  {folder} / {word}.png")
    if len(unique_missing) > 50:
        print(f"  ... and {len(unique_missing) - 50} more.")


if __name__ == "__main__":
    main()
