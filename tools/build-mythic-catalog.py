#!/usr/bin/env python3
"""Regenerate games/mythic-mixup/assets/parts-catalog.json from Creature Parts/.

Uses Fill / Outline / Details / Custom / Overlay files. Combined Head/Body PNGs
in the slot-folder roots are ignored unless a Fill is missing for that slot.
"""
from __future__ import annotations

import json
import os
import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
GAME = REPO / "games" / "mythic-mixup"
DP = GAME / "Creature Parts"

SPECIES = {
    "cerberus": "Cerberus",
    "dragon": "Dragon",
    "griffin": "Griffin",
    "hippocampus": "Hippocampus",
    "kitsune": "Kitsune",
    "peryton": "Peryton",
    "unicorn": "Unicorn",
    "zheng": "Zheng",
}
SLOT_FOLDERS = {
    "head": "Heads",
    "body": "Bodies",
    "frontLegs": "Legs (Front)",
    "backLegs": "Legs (Back)",
    "tail": "Tails",
}
SLOT_FILE_KEYS = {
    "head": "head",
    "body": "body",
    "frontLegs": "frontlegs",
    "backLegs": "backlegs",
    "tail": "tail",
}
LAYER_ORDER = ["fill", "details", "custom", "outline"]


def file_mtime(path: Path) -> float:
    try:
        return os.path.getmtime(path)
    except OSError:
        return 0.0


def is_duplicate_variant(filename: str) -> bool:
    return bool(re.search(r"\s2\.png$", filename, re.I))


def compact(name: str) -> str:
    return name.lower().replace("-", "").replace(" ", "")


def match_species(name: str) -> str | None:
    fln = compact(name)
    for sid, label in SPECIES.items():
        if compact(label) in fln:
            return sid
    return None


def slot_from_name(filename: str) -> str | None:
    fl = filename.lower().replace("-", " ")
    if is_duplicate_variant(filename):
        return None
    if "front legs" in fl or "frontlegs" in fl.replace(" ", ""):
        return "frontLegs"
    if "back legs" in fl or "backlegs" in fl.replace(" ", ""):
        return "backLegs"
    if re.search(r"\bhead\b", fl):
        return "head"
    if re.search(r"\b(body|wing|fin)\b", fl):
        return "body"
    if re.search(r"\btail\b", fl):
        return "tail"
    return None


def overlay_kind(filename: str) -> str:
    fl = filename.lower()
    if "(custom)" in fl or "custom" in fl:
        return "custom"
    if "(details)" in fl or "details" in fl:
        return "details"
    if "fill" in fl:
        return "fill"
    if "outline" in fl:
        return "outline"
    return "outline"


def pick_in_folder(
    folder_path: Path, label: str, slot: str, require_token: str | None = None
) -> str | None:
    if not folder_path.is_dir():
        return None
    slot_key = SLOT_FILE_KEYS[slot]
    species_key = compact(label)
    matches: list[str] = []
    for f in os.listdir(folder_path):
        if not f.lower().endswith(".png") or is_duplicate_variant(f):
            continue
        fl = compact(f)
        if species_key not in fl:
            continue
        if slot_key not in fl:
            continue
        if require_token and require_token not in f.lower():
            continue
        matches.append(f)
    if not matches:
        return None
    matches.sort(key=lambda name: file_mtime(folder_path / name), reverse=True)
    return matches[0]


def pick_slot_layers(folder: str, label: str, slot: str) -> dict[str, str]:
    folder_path = DP / folder
    layers: dict[str, str] = {}

    fill_name = pick_in_folder(folder_path / "Fills", label, slot)
    if fill_name:
        layers["fill"] = f"Creature Parts/{folder}/Fills/{fill_name}"
    else:
        fallback = pick_in_folder(folder_path, label, slot)
        if fallback:
            layers["fill"] = f"Creature Parts/{folder}/{fallback}"

    outline_name = pick_in_folder(folder_path / "Outlines", label, slot)
    if outline_name:
        layers["outline"] = f"Creature Parts/{folder}/Outlines/{outline_name}"

    return layers


def collect_named_layers(folder: str, rel_prefix: str) -> dict[tuple[str, str], tuple[str, float]]:
    found: dict[tuple[str, str], tuple[str, float]] = {}
    overlay_dir = DP / folder
    if not overlay_dir.is_dir():
        return found
    for f in os.listdir(overlay_dir):
        if not f.lower().endswith(".png") or is_duplicate_variant(f):
            continue
        sp = match_species(f)
        slot = slot_from_name(f)
        if not sp or not slot:
            continue
        rel = f"{rel_prefix}/{f}"
        mtime = file_mtime(overlay_dir / f)
        key = (sp, slot)
        prev = found.get(key)
        if not prev or mtime > prev[1]:
            found[key] = (rel, mtime)
    return found


def collect_overlays() -> dict[tuple[str, str], list[dict[str, str]]]:
    found: dict[tuple[str, str], list[dict[str, str]]] = {}
    overlay_dir = DP / "Overlays"
    if not overlay_dir.is_dir():
        return found
    for f in os.listdir(overlay_dir):
        if not f.lower().endswith(".png") or is_duplicate_variant(f):
            continue
        sp = match_species(f)
        slot = slot_from_name(f)
        if not sp or not slot:
            continue
        rel = f"Creature Parts/Overlays/{f}"
        found.setdefault((sp, slot), []).append(
            {"kind": overlay_kind(f), "path": rel, "name": f}
        )
    kind_rank = {k: i for i, k in enumerate(LAYER_ORDER)}
    for key, items in found.items():
        items.sort(key=lambda item: (kind_rank.get(item["kind"], 99), item["name"].lower()))
        found[key] = [{"kind": item["kind"], "path": item["path"]} for item in items]
    return found


def opaque_bbox(path: Path, step: int = 4, alpha_cut: int = 12) -> tuple[int, int, int, int] | None:
    try:
        from PIL import Image
    except ImportError:
        return None
    im = Image.open(path).convert("RGBA")
    px = im.load()
    w, h = im.size
    minx, miny, maxx, maxy = w, h, -1, -1
    for y in range(0, h, step):
        for x in range(0, w, step):
            if px[x, y][3] >= alpha_cut:
                if x < minx:
                    minx = x
                if y < miny:
                    miny = y
                if x > maxx:
                    maxx = x
                if y > maxy:
                    maxy = y
    if maxx < minx:
        return None
    pad = step + 2
    minx = max(0, minx - pad)
    miny = max(0, miny - pad)
    maxx = min(w - 1, maxx + pad)
    maxy = min(h - 1, maxy + pad)
    return minx, miny, maxx, maxy


def union_bounds(paths: list[Path]) -> dict[str, int] | None:
    box: list[int] | None = None
    size: tuple[int, int] | None = None
    try:
        from PIL import Image
    except ImportError:
        return None
    for path in paths:
        bb = opaque_bbox(path)
        if not bb:
            continue
        im = Image.open(path)
        size = im.size
        if box is None:
            box = list(bb)
        else:
            box[0] = min(box[0], bb[0])
            box[1] = min(box[1], bb[1])
            box[2] = max(box[2], bb[2])
            box[3] = max(box[3], bb[3])
    if not box or not size:
        return None
    return {
        "x": box[0],
        "y": box[1],
        "w": box[2] - box[0] + 1,
        "h": box[3] - box[1] + 1,
        "srcW": size[0],
        "srcH": size[1],
    }


def main() -> None:
    details_index = collect_named_layers("Details", "Creature Parts/Details")
    custom_index = collect_named_layers("Custom", "Creature Parts/Custom")
    overlay_index = collect_overlays()
    species_list = []
    asset_version = 0
    image_paths: list[Path] = []
    canvas_w, canvas_h = 2160, 1620

    for sid, label in SPECIES.items():
        slots: dict[str, dict] = {}
        for slot, folder in SLOT_FOLDERS.items():
            layers = pick_slot_layers(folder, label, slot)
            custom = custom_index.get((sid, slot))
            if custom:
                layers["custom"] = custom[0]
                asset_version = max(asset_version, int(custom[1]))
            detail = details_index.get((sid, slot))
            if detail:
                layers["details"] = detail[0]
                asset_version = max(asset_version, int(detail[1]))
            overlays = overlay_index.get((sid, slot))
            if overlays:
                layers["overlays"] = overlays
                for item in overlays:
                    asset_version = max(asset_version, int(file_mtime(GAME / item["path"])))

            # Wing/fin overlays draw after back legs. If this slot has custom art
            # but no dedicated custom overlay file, reuse the slot custom so
            # markings (griffin/peryton coverts) still appear on top of the wing.
            if layers.get("custom") and layers.get("overlays"):
                if not any(item.get("kind") == "custom" for item in layers["overlays"]):
                    kind_rank = {k: i for i, k in enumerate(LAYER_ORDER)}
                    merged = list(layers["overlays"]) + [
                        {"kind": "custom", "path": layers["custom"]}
                    ]
                    merged.sort(key=lambda item: kind_rank.get(item["kind"], 99))
                    layers["overlays"] = merged

            if not layers:
                continue
            if "fill" in layers:
                layers["base"] = layers["fill"]
            elif "outline" in layers:
                layers["base"] = layers["outline"]
            elif "custom" in layers:
                layers["base"] = layers["custom"]
            elif "details" in layers:
                layers["base"] = layers["details"]

            for key in ("fill", "outline", "custom", "details"):
                rel = layers.get(key)
                if rel:
                    p = GAME / rel
                    asset_version = max(asset_version, int(file_mtime(p)))
                    image_paths.append(p)
            for item in layers.get("overlays") or []:
                image_paths.append(GAME / item["path"])

            slots[slot] = layers

        species_list.append(
            {"id": sid, "label": label, "slots": slots, "onlySlots": None}
        )

    if image_paths:
        try:
            from PIL import Image

            im = Image.open(image_paths[0])
            canvas_w, canvas_h = im.size
        except Exception:
            pass

    content_bounds = union_bounds(image_paths)
    if content_bounds:
        canvas_w = content_bounds["w"]
        canvas_h = content_bounds["h"]

    catalog = {
        "canvasSize": max(canvas_w, canvas_h),
        "canvasWidth": canvas_w,
        "canvasHeight": canvas_h,
        "contentBounds": content_bounds,
        "assetVersion": asset_version,
        "layerOrder": ["body", "tail", "backLegs", "frontLegs", "head"],
        "overlayAfterSlot": "backLegs",
        "species": species_list,
    }
    out_dir = GAME / "assets"
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / "parts-catalog.json"
    out.write_text(json.dumps(catalog, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {out} ({len(species_list)} species, assetVersion={asset_version})")
    print(f"Canvas {canvas_w}x{canvas_h} bounds={content_bounds}")

    print("\nPicked files:")
    for sp in species_list:
        for slot, part in sp["slots"].items():
            bits = []
            for key in LAYER_ORDER:
                if part.get(key):
                    bits.append(key)
            overlays = part.get("overlays") or []
            extra = " + overlays[" + ",".join(o["kind"] for o in overlays) + "]" if overlays else ""
            print(f"  {sp['id']:14} {slot:10} {', '.join(bits) or '—'}{extra}")

    js_dir = GAME / "js"
    js_dir.mkdir(parents=True, exist_ok=True)
    embed = js_dir / "parts-catalog-embed.js"
    compact_json = json.dumps(catalog, separators=(",", ":"))
    embed.write_text(
        "// Fallback when fetch() is unavailable (e.g. file://). "
        "Synced from assets/parts-catalog.json\n"
        f"window.__MYTHIC_MIXUP_CATALOG_EMBED__ = {compact_json};\n",
        encoding="utf-8",
    )
    print(f"\nWrote {embed}")


if __name__ == "__main__":
    main()
