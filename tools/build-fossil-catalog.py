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


def detail_slot(filename: str) -> str | None:
    fl = filename.lower()
    if "head) 2" in fl:
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


def main() -> None:
    details_by: dict[tuple[str, str], str] = {}
    for f in os.listdir(DP / "Details"):
        if not f.endswith(".png"):
            continue
        sp = match_species(f)
        slot = detail_slot(f)
        if sp and slot:
            details_by[(sp, slot)] = f"Dinosaur Parts/Details/{f}"

    species_list = []
    for sid, label in SPECIES.items():
        slots = {}
        for slot, folder in SLOT_FOLDERS.items():
            folder_path = DP / folder
            base = None
            for f in os.listdir(folder_path):
                if not f.endswith(".png"):
                    continue
                fl = f.lower()
                key = label.lower().replace("-", "").replace(" ", "")
                if key in fl.replace("-", "").replace(" ", "") or (
                    label == "T-Rex" and "t-rex" in fl
                ):
                    base = f"Dinosaur Parts/{folder}/{f}"
                    break
            if base:
                entry: dict[str, str] = {"base": base}
                if (sid, slot) in details_by:
                    entry["details"] = details_by[(sid, slot)]
                slots[slot] = entry
        only = ["head", "body"] if sid == "pterodactyl" else None
        species_list.append(
            {"id": sid, "label": label, "slots": slots, "onlySlots": only}
        )

    catalog = {
        "canvasSize": 1600,
        "layerOrder": ["tail", "body", "backLegs", "frontLegs", "head"],
        "species": species_list,
    }
    out = FORGE / "assets" / "parts-catalog.json"
    out.write_text(json.dumps(catalog, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {out} ({len(species_list)} species)")


if __name__ == "__main__":
    main()
