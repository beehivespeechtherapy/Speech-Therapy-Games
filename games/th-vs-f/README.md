# Speech Therapy Games

A web-based speech therapy game for auditory discrimination practice, specifically targeting /th/ vs /f/ minimal pairs.

## Game: Dragon Eggs - F vs TH

Help the dragon collect eggs by identifying words with the /th/ sound!

## Setup for GitHub Pages

### Step 1: Create a GitHub Repository

1. Go to [GitHub.com](https://github.com) and sign in
2. Click the "+" icon in the top right, then "New repository"
3. Name it (e.g., "speech-therapy-games")
4. Choose Public or Private
5. **Don't** initialize with README (we already have one)
6. Click "Create repository"

### Step 2: Initialize Git and Push to GitHub

Open Terminal (or Command Prompt) and navigate to this folder, then run:

```bash
# Initialize git repository
git init

# Add all files
git add .

# Make your first commit
git commit -m "Initial commit: Speech therapy game"

# Add your GitHub repository as remote (replace YOUR_USERNAME and REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Step 3: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click "Settings" tab
3. Scroll down to "Pages" in the left sidebar
4. Under "Source", select "Deploy from a branch"
5. Choose "main" branch and "/ (root)" folder
6. Click "Save"
7. Wait a few minutes, then your site will be live at:
   `https://YOUR_USERNAME.github.io/REPO_NAME/`

### Step 4: Update Links (if needed)

If your repository name is different from "MY GAMES", you may need to update the links in `index.html` to match your repository structure.

## File Structure

```
MY GAMES/
├── index.html          # Main menu
├── game.html          # Game page
├── game.js            # Game logic
├── style.css          # Styling
├── credits.html       # Attribution page
├── games/
│   └── f_vs_th_dragons.json  # Game data
└── images/
    ├── words/         # Word images
    └── ...            # Game assets
```

## Features

- Player-paced gameplay (click eggs to progress)
- Visual word choices with images
- Text-to-speech audio
- Progress tracking
- Celebration screen on completion

## License

Check `credits.html` for image attributions and licenses.
