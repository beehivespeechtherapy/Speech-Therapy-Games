# Speech Therapy Minimal Pairs Game Framework

A web-based framework for creating interactive speech therapy games focused on minimal pairs practice. Students progress a protagonist along a visual map by correctly identifying target sounds in word pairs.

## Features

- **Mobile-first design** - Optimized for iPad with touch-friendly controls
- **Minimal boilerplate** - Each game needs only a config file and images
- **Shared framework** - Core game engine used by all games (no code duplication)
- **Easy deployment** - Works on GitHub Pages or any static hosting
- **Automated image download** - CLI tool to fetch clipart from Pixabay
- **Progress tracking** - LocalStorage saves student progress
- **Customizable** - Easy to theme and adapt for different sound contrasts

## Quick Start

### 1. Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd SpeechTherapyGame

# Install CLI tools
cd tools
npm install
cp .env.example .env
# Edit .env and add your Pixabay API key (get free key at https://pixabay.com/api/docs/)
```

### 2. Create Your First Game

```bash
# From the tools directory
node create-game.js --name "s-vs-sh" --title "S vs SH Sounds"
```

### 3. Add Word Pairs

Edit `games/s-vs-sh/config.json` to add your minimal pairs:

```json
{
  "title": "S vs SH Sounds",
  "challenges": [
    {
      "id": 1,
      "correctWord": "sun",
      "correctSound": "s",
      "pairs": [
        {
          "word": "sun",
          "sound": "s",
          "image": "assets/pairs/sun.jpg",
          "alt": "A bright yellow sun"
        },
        {
          "word": "shun",
          "sound": "sh",
          "image": "assets/pairs/shun.jpg",
          "alt": "Person turning away"
        }
      ]
    }
    // Add 10-12 more challenges...
  ],
  "victory": {
    "message": "Congratulations! You've mastered S vs SH sounds!",
    "music": "../../assets/audio/victory.mp3"
  }
}
```

### 4. Download Images

```bash
# From the tools directory
node download-images.js ../games/s-vs-sh --auto
```

### 5. Test Locally

```bash
# Start a local server (Python example)
python3 -m http.server 8000

# Or use any other local server
# Then open: http://localhost:8000/games/s-vs-sh/
```

### 6. Deploy

```bash
# Commit your game
git add games/s-vs-sh
git commit -m "Add S vs SH sounds game"
git push

# Enable GitHub Pages in repository settings
# Your games will be available at: https://yourusername.github.io/SpeechTherapyGame/
```

## Directory Structure

```
SpeechTherapyGame/
├── core/                   # Shared framework (used by all games)
│   ├── engine.js          # Game logic and state management
│   ├── ui.js              # DOM rendering and interactions
│   ├── animator.js        # Protagonist movement animations
│   ├── audio.js           # Victory music handling
│   └── styles.css         # Responsive styles
│
├── assets/                 # Shared assets
│   ├── protagonist/       # Character sprites (idle, walking, celebrating)
│   ├── ui/                # UI icons (flag, etc.)
│   └── audio/             # Victory music
│
├── tools/                  # CLI development tools
│   ├── create-game.js     # Scaffold new games
│   ├── download-images.js # Download clipart from Pixabay
│   ├── package.json       # Node dependencies
│   └── .env               # API keys (gitignored)
│
├── template/               # Template for new games
│   ├── index.html
│   ├── config.json
│   └── assets/pairs/
│
├── games/                  # Individual game instances
│   ├── s-vs-sh/
│   ├── th-vs-f/
│   └── ...
│
└── index.html             # Landing page with links to all games
```

## Game Configuration

Each game's `config.json` defines:

- **title**: Game display name
- **description**: Brief description of the sound contrast
- **targetSound**: The sound being practiced
- **contrastSound**: The contrasting sound
- **challenges**: Array of minimal pair challenges (10-12 recommended)
- **victory**: Victory message and music path

### Challenge Structure

Each challenge contains:
- **id**: Unique number
- **correctWord**: The target word students should choose
- **correctSound**: The target sound (for reference)
- **pairs**: Array of exactly 2 word objects with:
  - **word**: The word text
  - **sound**: The sound it contains
  - **image**: Path to image file
  - **alt**: Descriptive alt text for accessibility

## CLI Tools

### create-game.js

Scaffolds a new game from the template.

```bash
node create-game.js --name <game-name> --title <game-title>

# Example
node create-game.js --name "r-vs-w" --title "R vs W Practice"
```

### download-images.js

Downloads clipart images from Pixabay for all words in a game's config.

```bash
node download-images.js <game-directory> [--interactive|--auto]

# Auto mode (uses first result)
node download-images.js ../games/s-vs-sh --auto

# Interactive mode (choose from options) - requires inquirer
node download-images.js ../games/s-vs-sh --interactive
```

## Customization

### Changing Colors/Theme

Edit game's `index.html` to override CSS variables:

```html
<style>
  :root {
    --primary-color: #2196F3;  /* Blue instead of green */
    --secondary-color: #FF5722; /* Red-orange */
  }
</style>
```

### Custom Protagonist

Replace images in `assets/protagonist/`:
- `idle.png` - Default standing pose
- `walking.png` - Moving along path
- `celebrating.png` - Victory dance

Recommended size: 100x100px, transparent background PNG

### Custom Victory Music

Add an MP3 file to `assets/audio/victory.mp3` (5-10 seconds, ~100-200KB)

Free sources:
- Freesound.org
- Pixabay Music
- YouTube Audio Library

## How It Works

1. **Engine** (core/engine.js) loads the game config and manages state
2. **UI** (core/ui.js) renders challenges and the visual map
3. **Student clicks** on a word pair
4. **Engine validates** the answer:
   - Correct → Protagonist moves forward
   - Wrong → Protagonist moves backward
5. **Animator** (core/animator.js) smoothly moves the character
6. **Victory** is reached when all challenges are completed
7. **Progress** is saved to LocalStorage for resume

## Browser Compatibility

- ✅ iOS Safari 12+ (iPad target)
- ✅ Chrome/Edge (desktop)
- ✅ Firefox (desktop)
- ✅ Safari (desktop)

## Accessibility

- Touch targets minimum 44x44px (iOS guidelines)
- ARIA labels on interactive elements
- Keyboard navigation support
- Alt text on all images
- High contrast mode support
- Reduced motion support

## Development

### Local Testing

```bash
# Python
python3 -m http.server 8000

# Node
npx serve

# PHP
php -S localhost:8000
```

### File an Issue

Found a bug? Have a feature request?
[Create an issue on GitHub](#)

## License

MIT License - Feel free to use for educational purposes

## Credits

Framework developed for speech therapy minimal pairs practice.

Images from Pixabay (free for commercial use, no attribution required)
