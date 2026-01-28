# How to Share Your Speech Therapy Games Website

Your games are ready to be shared! Follow these steps to make them accessible to anyone with a link.

## Quick Steps to Deploy

### Step 1: Commit and Push Your Changes

Open Terminal in this directory and run:

```bash
# Add all your changes
git add .

# Commit with a message
git commit -m "Add games and fix file:// compatibility"

# Push to GitHub
git push origin master
```

**Note:** If you get an error about the branch name, try `main` instead of `master`:
```bash
git push origin main
```

### Step 2: Enable GitHub Pages

1. Go to your GitHub repository:
   ```
   https://github.com/beehivespeechtherapy/Speech-Therapy-Games
   ```

2. Click **Settings** (top menu)

3. Click **Pages** (left sidebar)

4. Under "Source", select:
   - **Branch:** `master` (or `main` if that's your default branch)
   - **Folder:** `/ (root)`

5. Click **Save**

6. Wait 1-2 minutes for GitHub to deploy your site

### Step 3: Get Your Shareable Link

Once GitHub Pages is enabled, your website will be available at:

```
https://beehivespeechtherapy.github.io/Speech-Therapy-Games/
```

**This is the link you can share with anyone!** 🎉

## Your Game Links

Once deployed, your individual games will be at:

- **Main page (all games):**
  ```
  https://beehivespeechtherapy.github.io/Speech-Therapy-Games/
  ```

- **Candy Mountain (K vs T):**
  ```
  https://beehivespeechtherapy.github.io/Speech-Therapy-Games/games/k-vs-t/index.html
  ```

- **S vs SH Sounds:**
  ```
  https://beehivespeechtherapy.github.io/Speech-Therapy-Games/games/s-vs-sh/index.html
  ```

- **Itchy Dragon T/K:**
  ```
  https://beehivespeechtherapy.github.io/Speech-Therapy-Games/games/itchy-dragon-tk/index.html
  ```

## Updating Your Site

Every time you make changes:

1. **Commit and push:**
   ```bash
   git add .
   git commit -m "Your update message"
   git push origin master
   ```

2. **Wait 1-2 minutes** - GitHub Pages automatically updates

3. **Refresh your browser** - Your changes will be live!

## Troubleshooting

### "Page not found" after enabling GitHub Pages

- Wait 2-3 minutes (deployment takes time)
- Check the **Actions** tab in GitHub to see if deployment succeeded
- Make sure you selected the correct branch (`master` or `main`)

### Changes not showing up

- Hard refresh your browser: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
- Check the Actions tab to ensure deployment completed
- Wait a few more minutes

### Need help?

Check the Actions tab in your GitHub repository - it will show if there are any deployment errors.

## Custom Domain (Optional)

If you want a custom domain like `speechgames.com`:

1. Buy a domain (e.g., from Namecheap, Google Domains)
2. Create a file called `CNAME` in your repository root with just:
   ```
   www.yourdomain.com
   ```
3. Configure DNS with your domain provider to point to `beehivespeechtherapy.github.io`

---

**That's it!** Your games are now shareable with anyone who has the link. 🚀
