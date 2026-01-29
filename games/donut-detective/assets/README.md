# Donut Detective – Asset Guide

Add your own clipart images **inside this `assets` folder** (not in the game root). The game looks for images here. Use this checklist when adding files.

## Required images

Place files in the paths below (relative to this `assets` folder).

### Intro screen
- **`chef.png`** – Clipart of a chef (shown on the welcome screen next to the bakery message).

### Donut grid (15 donuts)
- **`donuts/donut1.png`** through **`donuts/donut15.png`** – 15 different donut images for the 3×5 grid. Each donut should look distinct (e.g. different icing, sprinkles, drizzle). Filenames must be exactly `donut1.png`, `donut2.png`, … `donut15.png`.

### Ingredients (5)
- **`ingredients/flour.png`** – Flour (bag or pile).
- **`ingredients/water.png`** – Water (jug or droplet).
- **`ingredients/oil.png`** – Oil (bottle or droplet).
- **`ingredients/eggs.png`** – Eggs.
- **`ingredients/sugar.png`** – Sugar (bag or bowl).

### Bowl phase
- **`bowl.png`** – Empty mixing bowl (shown on “Put the ingredients in the bowl!” screen).

### Victory screen
- **`finished-donut.png`** – Finished donut(s) or baked treat (shown on the “You did it!” screen).

### Word pairs (discrimination tasks)
Optional pictures for the “Which word has the G sound?” tasks. Each file name is the word in lowercase; the word “Ed” uses **`ed.png`**. If an image is missing, the game shows only the word text.

- **`pairs/mug.png`**, **`pairs/mud.png`**
- **`pairs/bug.png`**, **`pairs/bud.png`**
- **`pairs/bag.png`**, **`pairs/bad.png`**
- **`pairs/egg.png`**, **`pairs/ed.png`** (for “Ed”)
- **`pairs/leg.png`**, **`pairs/lead.png`**
- **`pairs/dig.png`**, **`pairs/did.png`**
- **`pairs/beg.png`**, **`pairs/bed.png`**
- **`pairs/rag.png`**, **`pairs/rad.png`**
- **`pairs/hag.png`**, **`pairs/had.png`**
- **`pairs/tag.png`**, **`pairs/tad.png`**

(20 images total; the game works with or without them.)

## Optional
- **`audio/victory.mp3`** – Custom victory music. If you don’t add this, the game uses the shared `../../assets/audio/victory.mp3`.

## File format
- Use **PNG** (with transparency if you want) or **JPG** for images.
- Keep file sizes reasonable (e.g. under 500 KB per image) for faster loading.

## Folder structure (after adding your files)

```
assets/
├── README.md          (this file)
├── chef.png
├── bowl.png
├── finished-donut.png
├── donuts/
│   ├── donut1.png
│   ├── donut2.png
│   └── … donut15.png
├── pairs/
│   ├── mug.png
│   ├── mud.png
│   ├── … (see “Word pairs” above for full list)
│   └── tad.png
├── ingredients/
│   ├── flour.png
│   ├── water.png
│   ├── oil.png
│   ├── eggs.png
│   └── sugar.png
└── audio/
    └── victory.mp3    (optional)
```
