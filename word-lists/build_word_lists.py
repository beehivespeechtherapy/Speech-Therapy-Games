#!/usr/bin/env python3
"""
Build word lists for minimal pairs in Beehive format.
- Uses folder names with colon: "T:K Minimal Pairs - Initial"
- Outputs CSV (row-per-pair) and merges into word-sets.json
- Each set has at least 12 pairs (from minimal_pair_lexicon.py)
"""
import csv
import json
import re
from pathlib import Path

from minimal_pair_lexicon import LEXICON, get_pairs

WORD_LISTS_DIR = Path(__file__).resolve().parent
WORD_IMAGES_BASE = "Word Images"  # folder under Beehive Games
MIN_PAIRS = 12
POSITION_NUM = {"Initial": "1", "Medial": "2", "Final": "3"}


def beehive_folder(sound_a: str, sound_b: str, position: str) -> str:
    """Match Beehive folder naming: T:K Minimal Pairs - Initial"""
    return f"{sound_a}:{sound_b} Minimal Pairs - {position}"


def _sound_code(s: str) -> str:
    u = s.upper()
    if u in ("TH", "SH", "CH", "NG"):
        return s.lower()
    return s.lower()[0]


def set_id(sound_a: str, sound_b: str, position: str, target: str) -> str:
    """e.g. tk-k1, dg-g2, vb-b1, thf-f1"""
    a, b = _sound_code(sound_a), _sound_code(sound_b)
    t = _sound_code(target)
    num = POSITION_NUM.get(position, "1")
    return f"{a}{b}-{t}{num}"


def label(sound_a: str, sound_b: str, position: str, target: str) -> str:
    """e.g. T/K Minimal Pairs - Initial K"""
    return f"{sound_a}/{sound_b} Minimal Pairs - {position} {target}"


def prompt_for(target: str) -> str:
    return f"Which word has the /{target.lower()}/ sound?"


def build_sets_from_lexicon():
    """Yield (set_id, set_label, prompt, target_sound, contrast_sound, folder, pairs_list)."""
    seen = set()
    for (sound_a, sound_b, position), pairs in LEXICON.items():
        if pairs is None or len(pairs) < MIN_PAIRS:
            continue
        folder = beehive_folder(sound_a, sound_b, position)
        # Set 1: target = sound_a
        key1 = (sound_a, sound_b, position, sound_a)
        if key1 not in seen:
            seen.add(key1)
            yield {
                "id": set_id(sound_a, sound_b, position, sound_a),
                "label": label(sound_a, sound_b, position, sound_a),
                "prompt": prompt_for(sound_a),
                "targetSound": sound_a.lower(),
                "contrastSound": sound_b.lower(),
                "folder": folder,
                "pairs": pairs[:20],
            }
        # Set 2: target = sound_b (reversed pairs)
        key2 = (sound_a, sound_b, position, sound_b)
        if key2 not in seen:
            seen.add(key2)
            rev_pairs = [(b, a) for (a, b) in pairs[:20]]
            yield {
                "id": set_id(sound_a, sound_b, position, sound_b),
                "label": label(sound_a, sound_b, position, sound_b),
                "prompt": prompt_for(sound_b),
                "targetSound": sound_b.lower(),
                "contrastSound": sound_a.lower(),
                "folder": folder,
                "pairs": rev_pairs,
            }


def to_csv_rows(sets):
    """Convert list of set dicts to CSV rows (row-per-pair)."""
    rows = []
    for s in sets:
        for w1, w2 in s["pairs"]:
            rows.append({
                "setId": s["id"],
                "setLabel": s["label"],
                "prompt": s["prompt"],
                "targetSound": s["targetSound"],
                "contrastSound": s["contrastSound"],
                "folder": s["folder"],
                "word1": w1,
                "word2": w2,
            })
    return rows


def load_existing_json():
    p = WORD_LISTS_DIR / "word-sets.json"
    if not p.exists():
        return []
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def merge_with_existing(new_sets, existing):
    """Merge new sets into existing. Existing wins on same id (keep your edits). For same id, optionally expand pairs from lexicon."""
    by_id = {s["id"]: s for s in existing}
    for s in new_sets:
        sid = s["id"]
        if sid not in by_id:
            by_id[sid] = s
        else:
            # Keep existing set but ensure at least MIN_PAIRS if we have more in new
            cur = by_id[sid]
            if len(cur["pairs"]) < MIN_PAIRS and len(s["pairs"]) >= MIN_PAIRS:
                cur["pairs"] = s["pairs"]
            # Keep existing label/prompt/folder
    return list(by_id.values())


def main():
    sets = list(build_sets_from_lexicon())
    print(f"Built {len(sets)} sets from lexicon (min {MIN_PAIRS} pairs each).")

    fieldnames = ["setId", "setLabel", "prompt", "targetSound", "contrastSound", "folder", "word1", "word2"]
    rows = to_csv_rows(sets)

    # CSV
    if rows:
        csv_path = WORD_LISTS_DIR / "word-sets-generated.csv"
        try:
            with open(csv_path, "w", newline="", encoding="utf-8") as f:
                w = csv.DictWriter(f, fieldnames=fieldnames)
                w.writeheader()
                w.writerows(rows)
            print(f"Wrote {csv_path} ({len(rows)} rows).")
        except PermissionError:
            fallback = Path.home() / "speech-therapy-games" / "word-images" / "word-sets-generated.csv"
            fallback.parent.mkdir(parents=True, exist_ok=True)
            with open(fallback, "w", newline="", encoding="utf-8") as f:
                w = csv.DictWriter(f, fieldnames=fieldnames)
                w.writeheader()
                w.writerows(rows)
            print(f"Wrote {fallback} ({len(rows)} rows). Copy to word-lists/ if needed.")

    # JSON: merge with existing
    existing = load_existing_json()
    merged = merge_with_existing(sets, existing)
    json_path = WORD_LISTS_DIR / "word-sets.json"
    try:
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(merged, f, indent=2)
        print(f"Wrote {json_path} ({len(merged)} sets total).")
    except PermissionError:
        fallback = Path.home() / "speech-therapy-games" / "word-images" / "word-sets.json"
        with open(fallback, "w", encoding="utf-8") as f:
            json.dump(merged, f, indent=2)
        print(f"Wrote {fallback}. Copy to Beehive word-lists/word-sets.json if needed.")
    print("You can open word-list-tool.html and paste/upload word-sets-generated.csv to re-download word-sets.json if you prefer.")


if __name__ == "__main__":
    main()
