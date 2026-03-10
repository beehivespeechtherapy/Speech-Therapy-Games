#!/usr/bin/env python3
"""
Generate clipart images for minimal-pair words using OpenAI DALL·E (optional).
Requires: pip install openai
Set OPENAI_API_KEY in environment, or create .env with OPENAI_API_KEY=sk-...
Run from word-lists/; images are written to ../Word Images/{folder}/{word}.png
(Adjust WORD_IMAGES_ROOT if your path is different.)
"""
import json
import os
import time
from pathlib import Path

WORD_LISTS_DIR = Path(__file__).resolve().parent
# Beehive: Word Images is Games/Word Images
WORD_IMAGES_ROOT = WORD_LISTS_DIR.parent.parent / "Word Images"


def load_words_per_folder():
    json_path = WORD_LISTS_DIR / "word-sets.json"
    if not json_path.exists():
        json_path = Path.home() / "speech-therapy-games" / "word-images" / "word-sets.json"
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


def main():
    try:
        from openai import OpenAI
    except ImportError:
        print("Install: pip install openai")
        return

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("Set OPENAI_API_KEY in environment or .env")
        return

    client = OpenAI()
    by_folder = load_words_per_folder()

    for folder in sorted(by_folder.keys()):
        out_dir = WORD_IMAGES_ROOT / folder
        out_dir.mkdir(parents=True, exist_ok=True)
        for word in sorted(by_folder[folder]):
            path = out_dir / f"{word}.png"
            if path.exists():
                continue
            prompt = f"Simple, friendly clipart illustration of \"{word}\", white or transparent background, suitable for a children's speech therapy game. No text in the image."
            try:
                resp = client.images.generate(model="dall-e-3", prompt=prompt, size="1024x1024", n=1)
                url = resp.data[0].url
                # OpenAI returns URL; you'd need to download with requests and save
                print(f"  {folder} / {word}.png -> {url}")
                # Optional: download and save (requires requests)
                # import urllib.request; urllib.request.urlretrieve(url, path)
            except Exception as e:
                print(f"  Error {word}: {e}")
            time.sleep(1)  # rate limit

    print("Done. If you only see URLs, add a download step (requests/urllib) to save to path.")


if __name__ == "__main__":
    main()
