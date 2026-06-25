#!/usr/bin/env python3
"""Regenerate games/fossil-forge/assets/parts-catalog.json from Dinosaur Parts/."""
from __future__ import annotations

import json
import os
import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
FORGE = REPO / "games" / "fossil-forge"
DP = FORGE / "Dinosaur Parts"

SPECIES = {
    "t-rex": "T-Rex",
    "triceratops": "Triceratops",
    "brachiosaurus": "Brachiosaurus",
    "velociraptor": "Velociraptor",
    "pterodactyl": "Pterodactyl",
    "stegosaurus": "Stegosaurus",
    "mosasaurus": "Mosasaurus",
    "spinosaurus": "Spinosaurus",
}
SLOT_FOLDERS = {
    "head": "Heads",
    "body": "Bodies",
    "frontLegs": "Legs (Front)",
    "backLegs": "Legs (Back)",
    "tail": "Tails",
}


def match_species(name: str) -> str | None:
    fln = name.lower().replace("-", "").replace(" ", "")
    for sid, label in SPECIES.items():
        key = label.lower().replace("-", "").replace(" ", "")
        if key in fln or (sid == "t-rex" and "trex" in fln.replace("-", "")):
            return sid
    return None


def is_duplicate_variant(filename: str) -> bool:
    """Skip Procreate export duplicates like 'T-Rex body 2.png'."""
    return bool(re.search(r"\s2\.png$", filename, re.I))


def file_mtime(path: Path) -> float:
    try:
        return os.path.getmtime(path)
    except OSError:
        return 0.0


def pick_newest_match(folder_path: Path, label: str) -> str | None:
    matches: list[str] = []
    for f in os.listdir(folder_path):
        if not f.endswith(".png") or is_duplicate_variant(f):
            continue
        fl = f.lower()
        key = label.lower().replace("-", "").replace(" ", "")
        if key in fl.replace("-", "").replace(" ", "") or (
            label == "T-Rex" and "t-rex" in fl
        ):
            matches.append(f)
    if not matches:
        return None
    matches.sort(key=lambda name: file_mtime(folder_path / name), reverse=True)
    return matches[0]


def detail_slot(filename: str) -> str | None:
    fl = filename.lower()
    if is_duplicate_variant(filename) or "head) 2" in fl:
        return None
    if re.search(r"details\s*\(head\)", fl):
        return "head"
    if re.search(r"details\s*[\(]?body", fl):
        return "body"
    if re.search(r"details\s*\(tail\)", fl):
        return "tail"
    if "legs" in fl and "front" in fl:
        return "frontLegs"
    if "legs" in fl and "back" in fl:
        return "backLegs"
    return None


def collect_details() -> dict[tuple[str, str], tuple[str, float]]:
    """Map (species, slot) -> (relative path, mtime), keeping newest per key."""
    details_by: dict[tuple[str, str], tuple[str, float]] = {}
    details_dir = DP / "Details"
    for f in os.listdir(details_dir):
        if not f.endswith(".png"):
            continue
        sp = match_species(f)
        slot = detail_slot(f)
        if not sp or not slot:
            continue
        rel = f"Dinosaur Parts/Details/{f}"
        mtime = file_mtime(details_dir / f)
        key = (sp, slot)
        prev = details_by.get(key)
        if not prev or mtime > prev[1]:
            details_by[key] = (rel, mtime)
    return details_by


def attach_details(
    base_rel: str, detail: tuple[str, float] | None, slot: str
) -> str | None:
    if not detail:
        return None
    detail_rel, detail_mtime = detail
    if slot == "frontLegs":
        base_mtime = file_mtime(FORGE / base_rel)
        # Newer leg bases already include claws; older detail overlays double them.
        if detail_mtime + 300 < base_mtime:
            return None
    return detail_rel


def main() -> None:
    details_index = collect_details()
    species_list = []
    asset_version = 0
    skipped_front_leg_details: list[str] = []

    for sid, label in SPECIES.items():
        slots = {}
        for slot, folder in SLOT_FOLDERS.items():
            folder_path = DP / folder
            picked = pick_newest_match(folder_path, label)
            if not picked:
                continue
            base_rel = f"Dinosaur Parts/{folder}/{picked}"
            base_mtime = file_mtime(folder_path / picked)
            asset_version = max(asset_version, int(base_mtime))

            entry: dict[str, str] = {"base": base_rel}
            detail = details_index.get((sid, slot))
            detail_rel = attach_details(base_rel, detail, slot)
            if detail and not detail_rel and slot == "frontLegs":
                skipped_front_leg_details.append(f"{sid}: {detail[0]}")
            if detail_rel:
                entry["details"] = detail_rel
                asset_version = max(asset_version, int(file_mtime(FORGE / detail_rel)))
            slots[slot] = entry

        species_list.append(
            {"id": sid, "label": label, "slots": slots, "onlySlots": None}
        )

    catalog = {
        "canvasSize": 1600,
        "assetVersion": asset_version,
        "layerOrder": ["tail", "body", "backLegs", "head", "frontLegs"],
        "species": species_list,
    }
    out = FORGE / "assets" / "parts-catalog.json"
    out.write_text(json.dumps(catalog, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {out} ({len(species_list)} species, assetVersion={asset_version})")

    if skipped_front_leg_details:
        print("Skipped front-leg detail overlays (base PNG newer than details):")
        for line in skipped_front_leg_details:
            print(f"  - {line}")

    print("\nPicked files:")
    for sp in species_list:
        for slot, part in sp["slots"].items():
            name = Path(part["base"]).name
            extra = " + details" if part.get("details") else ""
            print(f"  {sp['id']:14} {slot:10} {name}{extra}")

    embed = FORGE / "js" / "parts-catalog-embed.js"
    compact = json.dumps(catalog, separators=(",", ":"))
    embed.write_text(
        "// Fallback when fetch() is unavailable (e.g. file://). "
        "Synced from assets/parts-catalog.json\n"
        f"window.__FOSSIL_FORGE_CATALOG_EMBED__ = {compact};\n",
        encoding="utf-8",
    )
    print(f"\nWrote {embed}")


if __name__ == "__main__":
    main()
