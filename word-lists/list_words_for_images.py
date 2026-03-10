#!/usr/bin/env python3
"""
List all words that need images, per folder.
Use this to paste into Gemini/ChatGPT or to drive an image-generation script.
Output: CSV with folder, word (one row per word) and optional path.
"""
import json
from pathlib import Path

WORD_LISTS_DIR = Path(__file__).resolve().parent
# Point to your Word Images folder (same drive or absolute path)
# Beehive: Word Images is Games/Word Images; word-lists is Games/Speech-Therapy-Games/word-lists
WORD_IMAGES_ROOT = WORD_LISTS_DIR.parent.parent / "Word Images"


def main():
    json_path = WORD_LISTS_DIR / "word-sets.json"
    if not json_path.exists():
        json_path = Path.home() / "speech-therapy-games" / "word-images" / "word-sets.json"
    if not json_path.exists():
        print("word-sets.json not found. Run build_word_lists.py first.")
        return

    with open(json_path, encoding="utf-8") as f:
        sets = json.load(f)

    # (folder, word) -> unique
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

    # Report
    print("folder,word,path")
    for folder in sorted(by_folder.keys()):
        for word in sorted(by_folder[folder]):
            # Image path: Word Images/{folder}/{word}.png
            path = f"{folder}/{word}.png"
            print(f'"{folder}",{word},{path}')

    # Optional: list missing if Word Images exists
    if WORD_IMAGES_ROOT.exists():
        missing = []
        for folder in sorted(by_folder.keys()):
            fd = WORD_IMAGES_ROOT / folder
            for word in by_folder[folder]:
                for ext in (".png", ".jpg", ".jpeg"):
                    if (fd / f"{word}{ext}").exists():
                        break
                else:
                    missing.append((folder, word))
        if missing:
            print("\n# Missing images (folder, word):")
            for f, w in missing[:50]:
                print(f"  {f} / {w}.png")
            if len(missing) > 50:
                print(f"  ... and {len(missing) - 50} more.")


if __name__ == "__main__":
    main()
