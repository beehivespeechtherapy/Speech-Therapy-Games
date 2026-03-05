# Sound Ninjas

Guide your ninja through the castle! At each of 12 stops, complete a word discrimination task (choose the correct word from a minimal pair). Collect 5 weapons along the way in random order, then defeat the samurai boss by answering more discrimination challenges to attack.

## Features

- **Word set picker**: Choose which minimal pairs to practice (same style as Donut Detective and Butterfly Finder).
- **Word images**: Loaded from the repo `word-images/` folder (folder name per word set, e.g. `T:K Minimal Pairs - Initial`).
- **Castle waypoints**: The ninja moves along a path defined by `config.map.waypoints`. You can set your own coordinates using the **map coordinate picker** tool.

## Setting castle waypoints

1. Add a castle background image (e.g. to `assets/maps/castle.png`) and set `map.backgroundImage` in `config.json` to `"../../assets/maps/castle.png"` (or your path).
2. Open `tools/map-coordinate-picker.html` in your browser (serve the repo with e.g. `npx serve .` if needed).
3. Set the background image path to your castle image (e.g. `assets/maps/castle.png`).
4. Click on the map to place points. You need **13 points**: 1 start + 12 stops.
5. Copy the JSON list and paste it into `config.json` under `map.waypoints`.
6. Set `map.viewBoxWidth` and `map.viewBoxHeight` to the image dimensions shown in the picker.

## Config

- `numChallenges`: 12 (number of discrimination tasks in the castle).
- `weapons`: Array of 5 weapons (id, label, icon). Icons are emoji; you can replace with image paths later.
- `boss.hitsToDefeat`: Number of correct answers needed to defeat the boss (default 5).
- `wordSets`: Same structure as other games; each set can specify `prompt`, `targetSound`, `contrastSound`, and `pairs`.
- **Walking sprite sheet** (`protagonist.walkingSpriteSheet`): Optional. If present, the ninja uses a sprite sheet for the walk animation between waypoints. Set `url` to your `.png`; `frameWidth` and `frameHeight` to one frame’s size; `frames` to the total number of frames; and `columns` if the sheet is a grid (e.g. first row has 3 frames, second row has 2 → `"frames": 5, "columns": 3`). Omit `columns` for a single horizontal row.

## Running locally

From the repo root: `npx serve .` then open `games/sound-ninjas/index.html`.
