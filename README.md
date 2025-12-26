# Speech Therapy Minimal Pairs Game Framework

A web-based framework for creating interactive speech therapy games focused on minimal pairs practice. Students progress a protagonist character along a visual map by correctly identifying target sounds in word pairs.

## Features

- **Mobile-first design** - Optimized for iPad with touch-friendly controls
- **Zero build step** - Pure HTML/CSS/JavaScript, no compilation required
- **Minimal boilerplate** - Each game needs only a config file and images
- **Shared framework** - Core game engine used by all games (no code duplication)
- **Easy deployment** - Works on GitHub Pages or any static hosting
- **Automated asset downloads** - CLI tools to fetch clipart and GIFs from Pixabay and Giphy
- **Progress tracking** - LocalStorage saves student progress
- **Customizable** - Easy to theme and adapt for different sound contrasts
- **Kid-friendly** - Colorful animations, celebration GIFs, and confetti

## Table of Contents

- [Quick Start](#quick-start)
- [Creating a New Game](#creating-a-new-game)
- [Testing Your Game](#testing-your-game)
- [Deploying Your Game](#deploying-your-game)
- [Directory Structure](#directory-structure)
- [Game Configuration Reference](#game-configuration-reference)
- [CLI Tools Reference](#cli-tools-reference)
- [Customization Guide](#customization-guide)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

- **Node.js** (v14+) for CLI tools
- **API Keys** (free):
  - Pixabay API key from https://pixabay.com/api/docs/
  - Giphy API key from https://developers.giphy.com/ (optional)

### 1. Clone and Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd SpeechTherapyGame

# Install CLI tool dependencies
cd tools
npm install

# Configure API keys
cp .env.example .env
# Edit .env and add your Pixabay API key
```

### 2. Create Your First Game

```bash
# From the tools directory
# Create a game with auto-downloaded assets
node create-game.js --name "s-vs-sh" --title "S vs SH Sounds" --protagonist ninja --background jungle
```

### 3. Add Word Pairs and Download Images

```bash
# Edit the config file
# Add your minimal pairs to games/s-vs-sh/config.json

# Download all images automatically
node download-images.js ../games/s-vs-sh --auto
```

### 4. Test Locally

```bash
# Start a local server (from project root)
cd ..
python3 -m http.server 8000

# Open in browser
open http://localhost:8000/games/s-vs-sh/
```

### 5. Deploy

See [Deploying Your Game](#deploying-your-game) section below.

---

## Creating a New Game

### Step-by-Step Guide

#### Step 1: Scaffold the Game

From the `tools/` directory, run:

```bash
node create-game.js --name "your-game-name" --title "Your Game Title" [options]
```

**Required Arguments:**
- `--name <game-name>`: Directory name (lowercase, hyphens only, e.g., "r-vs-w")
- `--title <game-title>`: Display title (e.g., "R vs W Sounds")

**Optional Arguments:**
- `--protagonist <type>`: Auto-download character sprite (see options below)
- `--background <theme>`: Auto-download themed background (see options below)

**Available Protagonists:**
ninja, pirate, parrot, robot, astronaut, dragon, knight, princess, superhero, wizard, cat, dog, bear, monkey, elephant

**Available Backgrounds:**
jungle, castle, space, ocean, desert, winter, city, forest, mountain

**Examples:**

```bash
# Minimal setup (uses default ninja and no background)
node create-game.js --name "l-vs-r" --title "L vs R Practice"

# Full setup with themed assets
node create-game.js --name "space-adventure" --title "Space Sound Adventure" --protagonist robot --background space

# Ocean-themed pirate game
node create-game.js --name "pirate-treasure" --title "Pirate Treasure Hunt" --protagonist pirate --background ocean
```

This creates:
```
games/your-game-name/
├── index.html          # Game page (uses core framework)
├── config.json         # Game configuration
├── assets/
│   ├── pairs/         # Word pair images (empty, populated by download tool)
│   └── protagonist/   # Character sprites (if --protagonist was used)
└── README.md          # Setup instructions
```

#### Step 2: Configure Your Game

Edit `games/your-game-name/config.json`:

```json
{
  "title": "S vs SH Sounds",
  "description": "Practice distinguishing S and SH sounds",
  "targetSound": "s",
  "contrastSound": "sh",
  "protagonist": {
    "character": "ninja",
    "images": {
      "idle": "assets/protagonist/idle.png",
      "walking": "assets/protagonist/walking.png",
      "celebrating": "assets/protagonist/celebrating.png"
    }
  },
  "map": {
    "theme": "jungle",
    "pathStyle": "winding",
    "backgroundImage": "../../assets/maps/jungle-bg.jpg"
  },
  "challenges": [
    {
      "id": 1,
      "correctWord": "sun",
      "correctSound": "s",
      "pairs": [
        {
          "word": "sun",
          "sound": "s",
          "image": "assets/pairs/sun.png",
          "alt": "A bright yellow sun in the sky"
        },
        {
          "word": "shun",
          "sound": "sh",
          "image": "assets/pairs/shun.png",
          "alt": "Person turning away"
        }
      ]
    },
    {
      "id": 2,
      "correctWord": "sip",
      "correctSound": "s",
      "pairs": [
        {
          "word": "sip",
          "sound": "s",
          "image": "assets/pairs/sip.png",
          "alt": "Person sipping from a cup"
        },
        {
          "word": "ship",
          "sound": "sh",
          "image": "assets/pairs/ship.png",
          "alt": "Large sailing ship on water"
        }
      ]
    }
    // Add 8-10 more challenges...
  ],
  "victory": {
    "message": "Congratulations! You've mastered these sounds!",
    "music": "../../assets/audio/victory.mp3",
    "gif": "assets/victory.gif"
  }
}
```

**Key Configuration Points:**

1. **Target/Contrast Sounds**: Used in the challenge prompt ("Listen for the 'S' sound")
2. **Challenges**: Add 10-12 for a complete game experience
3. **Correct Word**: The word students should select
4. **Correct Sound**: Must match targetSound (used for validation)
5. **Alt Text**: Important for accessibility - describe the image clearly
6. **Path Style**: Options are `winding`, `zigzag`, `mountainous`, `ascending`, `straight`

#### Step 3: Download Images

From the `tools/` directory:

```bash
# Auto mode: Downloads first matching result for each word
node download-images.js ../games/your-game-name --auto

# This will:
# 1. Download clipart images for all words in your config
# 2. Download a random celebration GIF from Giphy
# 3. Update config.json with correct image paths
```

**What gets downloaded:**
- All word pair images → `games/your-game-name/assets/pairs/`
- Victory celebration GIF → `games/your-game-name/assets/victory.gif`
- Config updated with all image paths

**Customizing the Victory GIF:**

Option 1: Let it auto-download (random funny GIF each game creation)
```bash
node download-images.js ../games/your-game-name --auto
```

Option 2: Specify your own Giphy URL in config.json
```json
"victory": {
  "gif": "https://media.giphy.com/media/YOUR-GIF-ID/giphy.gif"
}
```

#### Step 4: Test Your Game

See [Testing Your Game](#testing-your-game) section below.

#### Step 5: Update Landing Page

Add your game to `index.html` in the project root:

```javascript
const games = [
  {
    name: 's-vs-sh',
    title: 'S vs SH Sounds',
    description: 'Practice distinguishing S and SH sounds'
  },
  {
    name: 'your-game-name',
    title: 'Your Game Title',
    description: 'Your game description'
  },
  // ... more games
];
```

---

## Testing Your Game

### Local Development Server

You need a local web server to test (file:// protocol won't work due to CORS).

**Option 1: Python (easiest)**
```bash
# From project root
python3 -m http.server 8000

# Open browser to:
# http://localhost:8000/games/your-game-name/
```

**Option 2: Node.js**
```bash
# From project root
npx serve

# Opens automatically in browser
```

**Option 3: PHP**
```bash
# From project root
php -S localhost:8000

# Open: http://localhost:8000/games/your-game-name/
```

**Option 4: VS Code Live Server Extension**
- Install "Live Server" extension
- Right-click `index.html` → "Open with Live Server"

### Testing Checklist

- [ ] **Landing page** shows your game in the list
- [ ] **Game loads** without errors (check browser console)
- [ ] **All images display** correctly (word pairs, protagonist, background)
- [ ] **Challenge prompt** shows correct sound (e.g., "Listen for the 'S' sound")
- [ ] **Correct answers** move protagonist forward
- [ ] **Wrong answers** move protagonist backward
- [ ] **Progress persists** when you refresh the page
- [ ] **Victory screen** appears after completing all challenges
- [ ] **Victory GIF** displays and animates
- [ ] **Confetti animation** works
- [ ] **Play Again button** resets the game

### Testing on iPad

1. Deploy to a test URL (see deployment options)
2. Or use local network:
   ```bash
   # Find your local IP
   ifconfig | grep "inet " | grep -v 127.0.0.1

   # On iPad, navigate to:
   http://YOUR-LOCAL-IP:8000/games/your-game-name/
   ```

### Common Issues

**Images not loading:**
- Check browser console for 404 errors
- Verify image paths in config.json
- Re-run `node download-images.js ../games/your-game-name --auto`

**Protagonist not showing:**
- Check `config.json` protagonist.images paths
- Verify files exist in `assets/protagonist/`

**Victory GIF not showing:**
- Check if `assets/victory.gif` exists
- Check `config.json` victory.gif path
- Try re-downloading: `node download-images.js ../games/your-game-name --auto`

---

## Deploying Your Game

### GitHub Pages (Recommended - Free & Easy)

**Step 1: Push to GitHub**
```bash
# From project root
git add .
git commit -m "Add new speech therapy game"
git push origin main
```

**Step 2: Enable GitHub Pages**
1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under "Source", select **main branch**
4. Click **Save**
5. Wait 1-2 minutes for deployment

**Step 3: Access Your Games**
```
https://YOUR-USERNAME.github.io/SpeechTherapyGame/
https://YOUR-USERNAME.github.io/SpeechTherapyGame/games/s-vs-sh/
```

### Netlify (Alternative - Also Free)

**Option 1: Drag & Drop**
1. Go to https://app.netlify.com/drop
2. Drag your project folder
3. Done! Get instant URL

**Option 2: Connect to Git**
1. Sign up at https://netlify.com
2. Click "New site from Git"
3. Connect your repository
4. Deploy settings:
   - Build command: (leave empty)
   - Publish directory: `.` (root)
5. Click "Deploy site"

**Your URL:** `https://random-name-12345.netlify.app/`

### Vercel (Alternative)

```bash
# Install Vercel CLI
npm i -g vercel

# From project root
vercel

# Follow prompts, then get instant URL
```

### Custom Domain (Optional)

**For GitHub Pages:**
1. Buy domain (e.g., speechgames.com)
2. Add CNAME file to project root:
   ```
   speechgames.com
   ```
3. Configure DNS with your domain provider:
   ```
   Type: CNAME
   Name: www
   Value: YOUR-USERNAME.github.io
   ```

**For Netlify/Vercel:**
- Follow their custom domain setup in dashboard

### Self-Hosting

Upload to any web server:
```bash
# Example: Upload via SCP
scp -r SpeechTherapyGame/ user@yourserver.com:/var/www/html/

# Or use FTP client like FileZilla
```

No server-side code needed - it's 100% static files!

---

## Directory Structure

```
SpeechTherapyGame/
├── index.html                 # Landing page (lists all games)
│
├── core/                      # Shared framework (DO NOT EDIT per-game)
│   ├── engine.js             # Game state management & logic
│   ├── ui.js                 # DOM rendering & interactions
│   ├── animator.js           # Protagonist movement animations
│   ├── audio.js              # Victory music handling
│   └── styles.css            # Responsive styles & animations
│
├── assets/                    # Shared assets (optional)
│   ├── maps/                 # Background images (downloaded)
│   ├── protagonist/          # Shared character sprites (optional)
│   └── audio/                # Shared audio files
│
├── template/                  # Template for new games
│   ├── index.html            # Game HTML template
│   ├── config.json           # Config template
│   └── assets/pairs/         # Empty directory for images
│
├── tools/                     # CLI development tools
│   ├── create-game.js        # Scaffold new games
│   ├── download-images.js    # Download clipart & GIFs
│   ├── download-protagonist.js  # Download character sprites
│   ├── download-background.js   # Download themed backgrounds
│   ├── package.json          # Node dependencies (axios, dotenv)
│   ├── .env                  # API keys (gitignored)
│   └── .env.example          # Template for .env
│
└── games/                     # Individual game instances
    ├── s-vs-sh/              # Example: S vs SH sounds
    │   ├── index.html        # Game page (loads core framework)
    │   ├── config.json       # Game-specific configuration
    │   ├── assets/
    │   │   ├── pairs/       # Word pair images
    │   │   ├── protagonist/ # Character sprites (optional, game-specific)
    │   │   └── victory.gif  # Celebration GIF
    │   └── README.md        # Setup instructions
    │
    └── r-vs-w/              # Another game
        └── ...
```

---

## Game Configuration Reference

### Complete config.json Schema

```json
{
  "title": "Game Title",
  "description": "Brief description of the sound contrast",
  "targetSound": "s",
  "contrastSound": "sh",

  "protagonist": {
    "character": "ninja",
    "images": {
      "idle": "assets/protagonist/idle.png",
      "walking": "assets/protagonist/walking.png",
      "celebrating": "assets/protagonist/celebrating.png"
    }
  },

  "map": {
    "theme": "jungle",
    "pathStyle": "winding",
    "backgroundImage": "../../assets/maps/jungle-bg.jpg"
  },

  "challenges": [
    {
      "id": 1,
      "correctWord": "word-to-select",
      "correctSound": "s",
      "pairs": [
        {
          "word": "word1",
          "sound": "s",
          "image": "assets/pairs/word1.png",
          "alt": "Description of image"
        },
        {
          "word": "word2",
          "sound": "sh",
          "image": "assets/pairs/word2.png",
          "alt": "Description of image"
        }
      ]
    }
  ],

  "victory": {
    "message": "Congratulations! You've mastered these sounds!",
    "music": "../../assets/audio/victory.mp3",
    "gif": "assets/victory.gif"
  }
}
```

### Configuration Options

**Path Styles:**
- `winding` - Sinusoidal wave pattern
- `zigzag` - Up and down movement
- `mountainous` - Random hills and valleys
- `ascending` - Climbing upward
- `straight` - Simple horizontal line

**Map Themes:**
- Affects background color if no backgroundImage specified
- Available: jungle, castle, space, ocean, desert

**Victory Configuration:**
- `message`: Shown on victory screen
- `music`: Path to MP3 file (optional)
- `gif`: Path to GIF or Giphy URL (auto-downloaded if not specified)

---

## CLI Tools Reference

### create-game.js

Scaffolds a new game from the template.

```bash
node create-game.js --name <game-name> --title <game-title> [options]
```

**Options:**
- `--name <name>`: Game directory name (required)
- `--title <title>`: Display title (required)
- `--protagonist <type>`: Auto-download character sprite
- `--background <theme>`: Auto-download background image
- `--help, -h`: Show help

**What it does:**
1. Creates `games/<name>/` directory
2. Copies template files
3. Updates config.json with title and settings
4. Downloads protagonist sprites (if specified)
5. Downloads background image (if specified)
6. Creates a README with next steps

### download-images.js

Downloads clipart images and celebration GIF for a game.

```bash
node download-images.js <game-directory> [--auto|--interactive]
```

**Options:**
- `<game-directory>`: Path to game (e.g., `../games/s-vs-sh`)
- `--auto, -a`: Auto-select first result (default)
- `--interactive, -i`: Choose from multiple options (requires inquirer - not yet implemented)
- `--help, -h`: Show help

**What it does:**
1. Reads config.json
2. Extracts all unique words from challenges
3. Searches Pixabay for clipart (kid-friendly, vector graphics)
4. Downloads images to `assets/pairs/`
5. Downloads random celebration GIF from Giphy (if not in config)
6. Updates config.json with image paths

**Search Strategy:**
- Queries: `"<word> clipart cartoon illustration"`
- Filters: vector images, 300x300 minimum, safe search
- Rating: G-rated content only

### download-protagonist.js

Downloads character sprites from Pixabay.

```bash
node download-protagonist.js <character-type> [--game-dir <path>]
```

**Options:**
- `<character-type>`: ninja, pirate, robot, etc.
- `--game-dir <path>`: Download to specific game (optional)

**Examples:**
```bash
# Download to shared assets
node download-protagonist.js dragon

# Download to specific game
node download-protagonist.js pirate --game-dir ../games/pirate-adventure
```

### download-background.js

Downloads themed background images from Pixabay.

```bash
node download-background.js <theme>
```

**Themes:**
jungle, castle, space, ocean, desert, winter, city, forest, mountain

**Example:**
```bash
node download-background.js jungle
# Downloads to: assets/maps/jungle-bg.jpg
```

---

## Customization Guide

### Changing Colors

Edit your game's `index.html`:

```html
<style>
  :root {
    --primary-color: #2196F3;     /* Blue (default: green) */
    --secondary-color: #FF5722;   /* Orange (default: orange) */
    --success-color: #4CAF50;     /* Green for correct answers */
    --error-color: #f44336;       /* Red for wrong answers */
  }
</style>
```

### Using Custom Images

**Replace Downloaded Images:**
1. Place your images in `assets/pairs/`
2. Update paths in config.json
3. Recommended: PNG with transparent background, 300x300px minimum

**Custom Protagonist:**
1. Create three images:
   - `idle.png` - Standing pose
   - `walking.png` - Movement pose
   - `celebrating.png` - Victory pose
2. Place in `assets/protagonist/`
3. Update config.json paths
4. Recommended: 100x100px, transparent background PNG

**Custom Background:**
1. Add image to game directory
2. Update config.json:
   ```json
   "map": {
     "backgroundImage": "assets/my-background.jpg"
   }
   ```

### Custom Victory GIF

**Option 1: Use Giphy URL**
```json
"victory": {
  "gif": "https://media.giphy.com/media/g9582DNuQppxC/giphy.gif"
}
```

**Option 2: Use Local File**
1. Download GIF to `assets/victory.gif`
2. Update config:
   ```json
   "victory": {
     "gif": "assets/victory.gif"
   }
   ```

### Adding Victory Music

1. Find a short MP3 (5-10 seconds, ~100-200KB)
2. Free sources:
   - https://freesound.org
   - https://pixabay.com/music/
   - YouTube Audio Library
3. Place in game assets or use shared:
   ```json
   "victory": {
     "music": "assets/victory.mp3"
   }
   ```

---

## Troubleshooting

### Images Not Downloading

**Problem:** `node download-images.js` returns no results

**Solutions:**
1. Check API key in `.env`:
   ```bash
   cat .env
   # Should show: PIXABAY_API_KEY=your-key-here
   ```
2. Verify internet connection
3. Try different word terms (more generic terms work better)
4. Download manually and update paths in config.json

### Game Not Loading

**Problem:** Blank page or errors in console

**Solutions:**
1. Check browser console for errors (F12)
2. Verify local server is running
3. Check file paths in config.json (must be relative)
4. Ensure all core files exist in `core/` directory

### Protagonist Not Visible

**Problem:** Character doesn't appear on path

**Solutions:**
1. Check `config.json` protagonist paths
2. Verify images exist: `ls games/your-game/assets/protagonist/`
3. Check browser console for 404 errors
4. Try re-downloading: `node download-protagonist.js ninja --game-dir ../games/your-game`

### Victory GIF Not Playing

**Problem:** Victory screen shows but no GIF

**Solutions:**
1. Check if file exists: `ls games/your-game/assets/victory.gif`
2. Verify config.json has correct path
3. Try different GIF URL (some Giphy links expire)
4. Check browser console for CORS errors

### Progress Not Saving

**Problem:** Game restarts from beginning

**Solutions:**
1. LocalStorage only works with http://, not file://
2. Use a local server (see Testing section)
3. Check browser console for LocalStorage errors
4. Clear browser cache and try again

### Deployment Issues

**GitHub Pages not updating:**
1. Wait 2-3 minutes after push
2. Check Settings → Pages shows correct branch
3. Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)
4. Check Actions tab for build errors

**404 errors after deployment:**
1. Verify all paths are relative (no leading /)
2. Check case sensitivity (GitHub Pages is case-sensitive)
3. Ensure all files are committed and pushed

---

## Browser Compatibility

- ✅ **iOS Safari 12+** (iPad target platform)
- ✅ **Chrome 80+** (desktop)
- ✅ **Firefox 75+** (desktop)
- ✅ **Safari 13+** (desktop)
- ✅ **Edge 80+** (desktop)

## Accessibility Features

- **Touch-friendly** - 44x44px minimum touch targets (iOS guidelines)
- **ARIA labels** - Screen reader support on all interactive elements
- **Keyboard navigation** - Full keyboard support
- **Alt text** - All images have descriptive alt text
- **High contrast** - Readable colors and large text
- **Reduced motion** - Respects prefers-reduced-motion setting

## Performance

- **Zero build time** - No compilation or bundling
- **Minimal dependencies** - Pure vanilla JavaScript
- **Small footprint** - Core framework < 50KB total
- **Fast loading** - Static files served from CDN
- **Offline-capable** - Can be converted to PWA

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - Free to use for educational purposes

## Credits

- **Framework**: Developed for speech therapy minimal pairs practice
- **Images**: Pixabay (free for commercial use, no attribution required)
- **GIFs**: Giphy (free API tier)
- **Inspiration**: Speech-language pathologists and educators

---

## Support

**Questions or issues?**
- Check [Troubleshooting](#troubleshooting) section
- Search existing GitHub issues
- Create a new issue with detailed description

**Need help?**
- Include browser console errors
- Share your config.json
- Describe steps to reproduce

---

**Happy Game Creating!** 🎮✨
