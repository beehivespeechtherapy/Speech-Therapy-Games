# Candy Mountain

Pick up 12 pieces of candy along a path! At each candy the player clicks the candy, then completes a discrimination task (choose the word with the target sound). The character only moves after a correct answer. Default word set: **T/K Minimal Pairs - Initial**; all word sets in the repo (T/K, D/G, V/B) are available from the choose screen.

## Setup

1. **Custom waypoints (path)**  
   Open `tools/map-coordinate-picker.html` in your browser. Load the same background image (`../assets/maps/candymountain.png`). Click 13 points in order: **start**, then **candy 1**, **candy 2**, … **candy 12** (the last click is the finish). Copy the JSON and paste it into `config.json` under `map.waypoints`. Set `map.viewBoxWidth` and `map.viewBoxHeight` to your image size (e.g. 1024 if the image is 1024×1024).

2. **Word pair images**  
   The default set uses `assets/pairs/` (can.png, tan.png, etc.). You can copy these from another game (e.g. `games/t-vs-d/assets/pairs/`) or use the word-images folder and pick a word set that points there.

3. **Test**  
   Open `index.html` via a local server (e.g. `npx serve .` from repo root) or double-click and accept file:// if your browser allows.

## Config

- **map.waypoints**: Array of 13 `{x, y}` points (start + 12 candies). Use the coordinate picker to get values.
- **map.viewBoxWidth / viewBoxHeight**: Match your background image size.
- **challenges**: 12 challenges (default T/K Initial). Replaced when the player picks a word set.
- **wordSets**: Same structure as other games; each set has `id`, `label`, `prompt`, `targetSound`, `contrastSound`, `pairs`.

## Flow

1. Player chooses a word set (or uses default if no word sets).
2. Map shows with path and 12 candy markers (🍬). Character is at the start.
3. Player **clicks the next candy** → discrimination task modal opens.
4. Correct answer → character moves to that candy; that candy is marked collected. Wrong → try again, no move.
5. After collecting all 12 candies, victory screen.
