# Final S vs Z

## Setup

1. Edit `config.json` to add your word pairs
2. Run the image download tool: `node ../tools/download-images.js ./ --interactive`
3. Test locally: Open `index.html` in your browser
4. Deploy: Commit and push to GitHub

## Config Structure

Each challenge needs:
- `id`: Unique number
- `correctSound`: The target sound students should listen for
- `pairs`: Array of 2 word objects, each with:
  - `word`: The word text
  - `sound`: The sound it contains (must match correctSound for one pair)
  - `image`: Path to image file (will be set by download tool)
  - `alt`: Alt text describing the image

## Next Steps

1. Add 10-12 challenges to `config.json`
2. Run image downloader
3. Test the game
4. Share with students!
