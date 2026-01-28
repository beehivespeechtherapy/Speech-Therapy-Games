# Deployment Checklist - Fix 404 Error

## Common Causes of 404 Errors on GitHub Pages:

1. **File Case Sensitivity**: GitHub Pages is case-sensitive. Make sure:
   - `game.html` (not `Game.html` or `GAME.html`)
   - `game.js` (not `Game.js`)
   - `style.css` (not `Style.css`)

2. **File Location**: All files should be in the root of your repository, not in subfolders (unless referenced correctly)

3. **Index.html**: Must exist in the root directory

## Steps to Fix:

### Step 1: Verify File Structure
Your repository should have this structure:
```
Speech-Therapy-Games/
├── index.html          ← Must exist!
├── game.html           ← Must exist!
├── game.js             ← Must exist!
├── style.css           ← Must exist!
├── credits.html
├── games/
│   └── f_vs_th_dragons.json
└── images/
    └── (all your images)
```

### Step 2: Check GitHub Repository
1. Go to: https://github.com/beehivespeechtherapy/Speech-Therapy-Games
2. Verify these files exist in the root:
   - `index.html`
   - `game.html`
   - `game.js`
   - `style.css`

### Step 3: Verify GitHub Pages Settings
1. Go to: Settings → Pages
2. Source should be: "Deploy from a branch"
3. Branch: "main" (or "master")
4. Folder: "/ (root)"

### Step 4: Check File Names (Case Sensitivity)
Make sure the link in index.html matches exactly:
- Link: `game.html?game=f_vs_th_dragons`
- File must be: `game.html` (lowercase)

### Step 5: Clear Browser Cache
Sometimes GitHub Pages caches old versions. Try:
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Or open in incognito/private window

### Step 6: Wait for GitHub Pages to Update
After pushing changes, it can take 1-5 minutes for GitHub Pages to update.

## Quick Test URLs:

After deployment, test these URLs:
- Main page: https://beehivespeechtherapy.github.io/Speech-Therapy-Games/
- Game direct: https://beehivespeechtherapy.github.io/Speech-Therapy-Games/game.html?game=f_vs_th_dragons

## If Still Getting 404:

1. Check the repository file list on GitHub - are the files actually there?
2. Check the file names match exactly (case-sensitive)
3. Make sure you committed and pushed all files
4. Check GitHub Pages build logs in Settings → Pages
