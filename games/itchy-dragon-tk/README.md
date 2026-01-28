# Itchy Dragon T/K Game

A speech therapy game where players help Henry the dragon scratch his itchy back by identifying words with the /k/ sound.

## Game Flow

1. **Introduction Screen**: Explains the story of Henry the dragon
2. **Dragon Screen**: Shows Henry with itchy spots that can be clicked
3. **Word Pair Screen**: Presents two words - one with /k/ sound, one with /t/ sound
4. **Scratching Animation**: When correct, shows a hand scratching the spot
5. **Spot Removal**: The scratched spot disappears
6. **Victory Screen**: Appears when all spots are gone

## Adding Images

### Dragon Images
The game requires three dragon images in `assets/dragon/`:
- `dragon.png` - Dragon without spots (currently using AI-generated)
- `dragon-with-spots.png` - Dragon with visible itchy spots (currently using AI-generated)
- `scratching-hand.png` - Hand/paw for scratching animation (currently using AI-generated)

### Word Pair Images
Each word pair needs an image in `assets/pairs/`. The images should be:
- Kid-friendly and colorful
- Clear representations of the word
- PNG or JPG format
- Named exactly as specified in `config.json`

Current word pairs:
- back.png, bat.png
- rack.png, rat.png
- beak.png, beet.png
- bike.png, bite.png
- shock.png, shot.png
- sick.png, sit.png
- puck.png, putt.png
- hike.png, height.png
- pick.png, pit.png
- kick.png, kit.png
- lick.png, lit.png
- lock.png, lot.png

### Victory GIF
The victory screen uses a celebration GIF. Save your GIF as:
- **Path:** `assets/victory/celebration.gif`

To use a different filename, update the `victory.gif` value in `config.json` and in the embedded config in `index.html`.

## Customizing the Game

### Changing Word Pairs

Edit `config.json` to modify word pairs:

1. Find the `spots` array
2. Each spot has a `pairs` array with two word objects
3. Update the `word`, `image`, and `alt` fields
4. Ensure `correctSound` matches the target sound you want students to identify

Example:
```json
{
  "id": 1,
  "x": 25,
  "y": 30,
  "correctSound": "k",
  "pairs": [
    {
      "word": "back",
      "sound": "k",
      "image": "assets/pairs/back.png",
      "alt": "A person's back"
    },
    {
      "word": "bat",
      "sound": "t",
      "image": "assets/pairs/bat.png",
      "alt": "Baseball bat"
    }
  ]
}
```

### Adjusting Spot Positions

The `x` and `y` values in each spot object control where the itchy spots appear on the dragon (in pixels from the top-left of the dragon image area).

If all spots are shifted left or right of the dragon, use **spot offset** in `config.json` (and the embedded config in `index.html`):
- `spotOffsetX`: add this many pixels to every spot’s x (positive = move right)
- `spotOffsetY`: add this many pixels to every spot’s y (positive = move down)

Example: if dots appear to the left of the dragon, increase `spotOffsetX` (e.g. `200`). Tweak until they line up on the dragon.

### Changing the Target Sound

Update `targetSound` and `contrastSound` in `config.json`:
```json
{
  "targetSound": "k",
  "contrastSound": "t"
}
```

## Testing

1. Open `index.html` in a web browser
2. Test clicking each itchy spot
3. Verify word pairs display correctly
4. Check that correct answers trigger scratching animation
5. Ensure victory screen appears when all spots are gone

## Deployment

This game is accessible through the main index.html at the repository root. Make sure to:
1. Add the game to the games list in the main `index.html`
2. Commit all files including images
3. Push to GitHub for GitHub Pages deployment
