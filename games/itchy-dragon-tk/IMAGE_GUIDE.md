# Image Generation Guide

## Current Status

✅ **Dragon images**: Generated and ready (dragon.png, dragon-with-spots.png, scratching-hand.png)
⚠️ **Word pair images**: Currently using SVG placeholders - need to be replaced with actual images

## Generating Word Pair Images

You have several options for generating the word pair images:

### Option 1: Use AI Image Generation
You can use AI image generators like:
- DALL-E (OpenAI)
- Midjourney
- Stable Diffusion
- Google Gemini (as mentioned in the repository README)

**Prompt template:**
```
A simple, colorful cartoon illustration of [WORD]. Kid-friendly style, suitable for a speech therapy game. Clean, simple design with transparent or white background. The image should be clear and easily recognizable.
```

### Option 2: Use Pixabay (as in other games)
The repository has tools for downloading images from Pixabay. You can:
1. Get a free Pixabay API key from https://pixabay.com/api/docs/
2. Add it to `tools/.env`
3. Use the download tool (though it may need adaptation for this game structure)

### Option 3: Use Free Clipart Sites
- OpenClipart
- Flaticon
- Freepik
- Unsplash (for some words)

## Image Requirements

- **Format**: PNG or JPG
- **Size**: Recommended 400x400px or larger (square aspect ratio works best)
- **Style**: Kid-friendly, colorful, cartoon-style
- **Background**: Transparent PNG or solid color background
- **Naming**: Must match exactly as in config.json (e.g., `back.png`, `bat.png`, etc.)

## Words That Need Images

1. back
2. bat
3. rack
4. rat
5. beak
6. beet
7. bike
8. bite
9. shock
10. shot
11. sick
12. sit
13. puck
14. putt
15. hike
16. height
17. pick
18. pit
19. kick
20. kit

## Replacing Placeholder Images

Once you have the images:
1. Save them as PNG or JPG files
2. Place them in `assets/pairs/` directory
3. Update `config.json` to change `.svg` extensions to `.png` or `.jpg`
4. The game will automatically use the new images

## Testing

After adding images, test the game by:
1. Opening `index.html` in a browser
2. Clicking through each itchy spot
3. Verifying all images display correctly
4. Checking that images are clear and appropriate for children
