#!/usr/bin/env python3
"""Generate placeholder Fossil Forge pattern tiles, overlays, and previews."""
from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

REPO = Path(__file__).resolve().parents[1]
OUT = REPO / "games" / "fossil-forge" / "Patterns"
TILE = 256
CANVAS = 1600


def save(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, optimize=True)
    print("wrote", path.relative_to(REPO))


def tile_scales() -> Image.Image:
    img = Image.new("RGBA", (TILE, TILE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for y in range(0, TILE, 32):
        for x in range(0, TILE, 32):
            ox = 16 if (y // 32) % 2 else 0
            cx, cy = x + ox + 16, y + 16
            d.ellipse((cx - 14, cy - 10, cx + 14, cy + 10), fill=(220, 220, 220, 255))
            d.arc((cx - 12, cy - 8, cx + 12, cy + 8), 200, 340, fill=(140, 140, 140, 255), width=2)
    return img


def tile_stripes() -> Image.Image:
    img = Image.new("RGBA", (TILE, TILE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for x in range(-TILE, TILE * 2, 28):
        d.polygon([(x, 0), (x + 12, 0), (x + 24, TILE), (x + 12, TILE)], fill=(210, 210, 210, 230))
    return img


def tile_spots() -> Image.Image:
    random.seed(42)
    img = Image.new("RGBA", (TILE, TILE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for _ in range(36):
        r = random.randint(6, 16)
        x = random.randint(0, TILE)
        y = random.randint(0, TILE)
        d.ellipse((x - r, y - r, x + r, y + r), fill=(200, 200, 200, 220))
    return img


def tile_feathers() -> Image.Image:
    img = Image.new("RGBA", (TILE, TILE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for i in range(8):
        x = 20 + i * 30
        d.polygon([(x, TILE), (x + 8, TILE - 40), (x + 16, TILE)], fill=(190, 190, 190, 210))
        d.line([(x + 8, TILE - 40), (x + 8, TILE - 8)], fill=(120, 120, 120, 200), width=2)
    return img


def preview_from_tile(tile: Image.Image, label: str) -> Image.Image:
    prev = Image.new("RGBA", (128, 128), (60, 50, 40, 255))
    for y in range(0, 128, 64):
        for x in range(0, 128, 64):
            prev.paste(tile.resize((64, 64), Image.Resampling.NEAREST), (x, y))
    d = ImageDraw.Draw(prev)
    d.rectangle((0, 0, 127, 127), outline=(232, 212, 77, 255), width=2)
    return prev


def overlay_flame() -> Image.Image:
    img = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx, base_y = CANVAS // 2, int(CANVAS * 0.72)
    for i, (w, h, color) in enumerate(
        [
            (180, 320, (255, 120, 20, 180)),
            (130, 260, (255, 200, 40, 200)),
            (80, 180, (255, 240, 120, 220)),
        ]
    ):
        x = cx - w // 2 + i * 8
        d.polygon(
            [(x, base_y), (x + w, base_y), (x + w // 2, base_y - h)],
            fill=color,
        )
    return img.filter(ImageFilter.GaussianBlur(radius=2))


def overlay_lightning() -> Image.Image:
    img = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pts = [
        (820, 200),
        (760, 520),
        (880, 520),
        (720, 980),
        (800, 620),
        (680, 620),
        (900, 280),
    ]
    d.line(pts, fill=(240, 248, 255, 240), width=18, joint="curve")
    d.line(pts, fill=(120, 180, 255, 200), width=8, joint="curve")
    return img.filter(ImageFilter.GaussianBlur(radius=1))


def accessory_spikes() -> Image.Image:
    img = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    spine_y = int(CANVAS * 0.52)
    for i, x in enumerate(range(520, 1100, 70)):
        h = 50 + (i % 3) * 18
        d.polygon([(x, spine_y), (x + 18, spine_y), (x + 9, spine_y - h)], fill=(180, 180, 190, 240))
        d.line([(x + 9, spine_y - h), (x + 9, spine_y + 20)], fill=(100, 100, 110, 200), width=2)
    return img


def main() -> None:
    tiles = {
        "scales": tile_scales(),
        "stripes": tile_stripes(),
        "spots": tile_spots(),
        "feathers": tile_feathers(),
    }
    for name, tile in tiles.items():
        save(tile, OUT / "Tiles" / f"{name}.png")
        save(preview_from_tile(tile, name), OUT / "Previews" / f"{name}.png")

    save(overlay_flame(), OUT / "Overlays" / "flame.png")
    save(preview_from_tile(overlay_flame().resize((256, 256)), "flame"), OUT / "Previews" / "flame.png")
    save(overlay_lightning(), OUT / "Overlays" / "lightning.png")
    save(preview_from_tile(overlay_lightning().resize((256, 256)), "lightning"), OUT / "Previews" / "lightning.png")
    save(accessory_spikes(), OUT / "Accessories" / "dorsal-spikes.png")
    save(preview_from_tile(accessory_spikes().resize((256, 256)), "spikes"), OUT / "Previews" / "dorsal-spikes.png")


if __name__ == "__main__":
    main()
