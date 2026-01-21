# Adding Your Game to Existing Speech-Therapy-Games Repository

## Step 1: Clone Your Existing Repository

Open Terminal and run:

```bash
# Navigate to a parent directory (not inside MY GAMES)
cd ~/Documents/Beehive\ Speech\ Therapy

# Clone your existing repository
git clone https://github.com/beehivespeechtherapy/Speech-Therapy-Games.git

# This will create a Speech-Therapy-Games folder
```

## Step 2: Copy Your Game Files

Copy all your game files into the cloned repository:

```bash
# Copy all files from MY GAMES to the repository
cp -r "MY GAMES"/* Speech-Therapy-Games/

# Or manually copy:
# - game.html
# - game.js
# - style.css
# - credits.html
# - games/ folder
# - images/ folder
```

## Step 3: Update the Main Index

The existing site has an index.html. You'll need to either:
- Replace it with your index.html, OR
- Update the existing one to include your game link

## Step 4: Commit and Push

```bash
cd Speech-Therapy-Games
git add .
git commit -m "Add Dragon Eggs F vs TH game"
git push
```

## Alternative: Manual Upload via GitHub Web Interface

1. Go to https://github.com/beehivespeechtherapy/Speech-Therapy-Games
2. Click "Add file" → "Upload files"
3. Drag and drop all your files from MY GAMES folder
4. Commit the changes

Your game will be live at: https://beehivespeechtherapy.github.io/Speech-Therapy-Games/game.html?game=f_vs_th_dragons
