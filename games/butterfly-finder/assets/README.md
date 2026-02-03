# Butterfly Finder – Asset Guide

Add your own clipart images **inside this `assets` folder**. The game looks for images here.

## Required images

Place files in the paths below (relative to this `assets` folder).

### Intro (optional)
- **`intro.png`** – Optional image for the welcome screen (e.g. a butterfly or garden scene). If missing, the intro still shows the message and Start button.

### Flowers (grid)
Use **16 flower images** so the grid has variety and butterflies are a bit harder to spot. You can use 16 different images or repeat a smaller set.

- **`flowers/flower1.png`** through **`flowers/flower16.png`** – Flower images that “hide” the butterflies. Filenames must be exactly `flower1.png`, `flower2.png`, … `flower16.png`.

### Butterflies (10)
- **`butterflies/butterfly1.png`** through **`butterflies/butterfly10.png`** – Ten butterfly images revealed when the player finds them. Each can be a different butterfly design.

### Celebration screen
- **`celebration.png`** – Optional image for the “You found all the butterflies!” screen (e.g. all butterflies together). If missing, only the message and Play again button show.

### Word pairs (V vs B discrimination)
Images for the “Which word has the /v/ sound?” popup. Each file name is the word in lowercase; the letter **V** uses **`v.png`**. If an image is missing, the game shows only the word text.

- **`pairs/bale.png`**, **`pairs/veil.png`**
- **`pairs/base.png`**, **`pairs/vase.png`**
- **`pairs/bat.png`**, **`pairs/vat.png`**
- **`pairs/bee.png`**, **`pairs/v.png`** (letter V)
- **`pairs/bent.png`**, **`pairs/vent.png`**
- **`pairs/berry.png`**, **`pairs/very.png`**
- **`pairs/best.png`**, **`pairs/vest.png`**
- **`pairs/boat.png`**, **`pairs/vote.png`**
- **`pairs/boo.png`**, **`pairs/view.png`**
- **`pairs/broom.png`**, **`pairs/vroom.png`**

(20 images total; the game works with or without them.)

## Folder structure (after adding your files)

```
assets/
├── README.md           (this file)
├── intro.png           (optional)
├── celebration.png     (optional)
├── flowers/
│   ├── flower1.png
│   └── … flower16.png
├── butterflies/
│   ├── butterfly1.png
│   └── … butterfly10.png
└── pairs/
    ├── bale.png
    ├── veil.png
    └── … (see Word pairs above for all 20)
```


## File format
- PNG or JPG. Keep file sizes reasonable (e.g. under 500 KB per image) for faster loading.
