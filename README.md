# Speech Therapy Minimal Pairs Game Framework

A web-based framework for creating interactive speech therapy games focused on minimal pairs practice. Students progress a protagonist character along a visual map by correctly identifying target sounds in word pairs.

---

## 🎯 Complete Tutorial: Creating a T vs D Game from Scratch

This tutorial walks through every step of creating a new minimal pairs game, from setup to deployment. We'll create a "T vs D Sounds" game with a ninja dojo theme as our example.

### Prerequisites

- **Node.js** (v14+) installed
- **Pixabay API key** (free at https://pixabay.com/api/docs/) for word pair images
- **Google Gemini** account (free at https://gemini.google.com) for backgrounds/protagonists
- Basic text editor

### Step 1: Scaffold the Game

From the `tools/` directory, create the game structure:

```bash
cd tools
node create-game.js --name "t-vs-d" --title "T vs D Sounds"
```

This creates:
```
games/t-vs-d/
├── index.html
├── config.json
├── assets/
│   ├── pairs/
│   └── protagonist/
└── README.md
```

### Step 2: Create the Background Image with Gemini

1. Navigate to https://gemini.google.com
2. Enter this prompt:
   ```
   Please create a top-down cartoon map of a ninja dojo to be used for a children's game.
   It should have a winding path that mainly heads from left to right. The style should be
   colorful, kid-friendly, and suitable for a speech therapy game. The path should be
   clearly visible and wind through the dojo environment.
   ```
3. Review the generated image. If needed, iterate with refinements like:
   - "Make the path more visible"
   - "Add more colorful dojo elements"
   - "Make it more kid-friendly"
4. Once satisfied, download the image as `dojo-bg.png`
5. Save it to `assets/maps/dojo-bg.png` in your project root

### Step 3: Create the Protagonist with Gemini

1. Go back to https://gemini.google.com
2. Enter this prompt:
   ```
   Please create a cute cartoon ninja character for a children's speech therapy game.
   The ninja should be kid-friendly, simple, and work well as a small sprite on a game map.
   Make it colorful and appealing to children. The background should be transparent.
   ```
3. Download the generated image
4. Save it as `games/t-vs-d/assets/protagonist/idle.png`
5. (Optional) prompt Gemini with "render an image of this chacter walking" and "render an image of this character jumping up and down in celebration".  Save these two images as `walking.png` and `celebrating.png`, respectively.
6. (If Necessary) Remove the background of each image with GIMP by "adding alpha layer" to the image, and using the fuzzy select tool to select the background, then "Edit->Clear" to remove it.  Finally "Export Image As" to save it as a png.

**Note:** For simplicity, we can reuse this same image for all three animation states (idle, walking, celebrating). Update the config later to reflect this.

### Step 4: Edit the Game Configuration

Open `games/t-vs-d/config.json` and replace its contents with your T vs D minimal pairs:

```json
{
  "title": "T vs D Sounds",
  "description": "Practice with T vs D Sounds",
  "targetSound": "t",
  "contrastSound": "d",
  "protagonist": {
    "character": "ninja",
    "images": {
      "idle": "assets/protagonist/idle.png", // Use the same, or different images here, depending on what you want.
      "walking": "assets/protagonist/idle.png",
      "celebrating": "assets/protagonist/idle.png"
    }
  },
  "map": {
    "theme": "dojo",
    "pathStyle": "winding",
    "backgroundImage": "../../assets/maps/dojo-bg.png"
  },
  "challenges": [
    {
      "id": 1,
      "correctSound": "t",
      "pairs": [
        {
          "word": "toe",
          "sound": "t",
          "image": "assets/pairs/toe.png",
          "alt": "A cartoon toe"
        },
        {
          "word": "dough",
          "sound": "d",
          "image": "assets/pairs/dough.png",
          "alt": "Ball of dough"
        }
      ]
    },
    {
      "id": 2,
      "correctSound": "t",
      "pairs": [
        {
          "word": "ten",
          "sound": "t",
          "image": "assets/pairs/ten.png",
          "alt": "Number 10"
        },
        {
          "word": "den",
          "sound": "d",
          "image": "assets/pairs/den.png",
          "alt": "Animal den or cave"
        }
      ]
    }
    // ... add 10 more challenges (see full example in games/t-vs-d/)
  ],
  "victory": {
    "message": "Congratulations! You've mastered T and D sounds!",
    "music": "../../assets/audio/victory.mp3",
    "gif": "https://media.giphy.com/media/g9582DNuQppxC/giphy.gif"
  }
}
```

**Pro tip:** The 12 T vs D minimal pairs we used are:
1. toe/dough, 2. ten/den, 3. tore/door, 4. tin/din, 5. tuck/duck, 6. tip/dip,
7. tie/die, 8. train/drain, 9. town/down, 10. tear/deer, 11. tank/dank, 12. tall/doll

### Step 5: Download Word Pair Images with Pixabay

Now use the automated Pixabay tool to download all 24 word images:

1. Make sure you have a Pixabay API key in `tools/.env`:
   ```bash
   # In tools/.env file:
   PIXABAY_API_KEY=your-key-here
   ```

   Get a free API key at https://pixabay.com/api/docs/

2. From the `tools/` directory, run:
   ```bash
   node download-images.js ../games/t-vs-d --auto
   ```

This will:
- Extract all 24 words from your config.json
- Search Pixabay for kid-friendly clipart/illustrations for each word
- Download images to `games/t-vs-d/assets/pairs/`
- Update config.json with correct file extensions

**If an image isn't quite right:**

You can replace individual images using the download-from-url tool:

1. Browse https://pixabay.com manually to find a better image
2. Copy the Pixabay URL
3. Run:
   ```bash
   node download-from-url.js t-vs-d <word> "<pixabay-url>"
   ```

**Example:**
```bash
# Replace the "dough" image with a better one
node download-from-url.js t-vs-d dough "https://pixabay.com/vectors/dough-bread-baking-12345/"
```

### Step 6: Choose your celebration gif.

Navigate to https://giphy.com and find a good gif.  Make sure to use the "Copy Link" to get a durable link that won't change in the future, and copy it to the "gif" value of the "victory" section of the config

### Step 7: Test Your Game Locally

1. Start a local web server from the project root:
   ```bash
   cd /path/to/SpeechTherapyGame
   python3 -m http.server 8000
   ```

2. Open your browser to:
   ```
   http://localhost:8000/games/t-vs-d/
   ```

3. **Testing Checklist:**
   - [ ] Background displays correctly
   - [ ] Ninja protagonist appears on the path
   - [ ] Challenge modal pops up with word pair images
   - [ ] Prompt shows "Listen for the 'T' sound"
   - [ ] Correct answers move ninja forward
   - [ ] Wrong answers move ninja backward
   - [ ] All challenges work
   - [ ] Victory screen appears with GIF and confetti
   - [ ] "Play Again" button resets the game

4. **Common fixes:**
   - Images not showing? Check file names match config.json exactly (case-sensitive!)
   - Protagonist missing? Verify `idle.png` exists in `assets/protagonist/`
   - Background missing? Check path in config: `../../assets/maps/dojo-bg.png`

### Step 8: Deploy to GitHub Pages

1. Commit your changes:
   ```bash
   git add .
   git commit -m "Add T vs D dojo game"
   git push origin master
   ```

3. Access your game at:
   ```
   https://beehivespeechtherapy.github.io/Speech-Therapy-Games/
   ```
