# Word Images for Speech Therapy Games

The games (Butterfly Finder, Donut Detective, Dragon Eggs, Itchy Dragon) load word-pair pictures from this folder so they work on the website and when you open them locally.

## Step-by-step: Add your Word Images here

### 1. Find your Word Images folder
On your Mac it’s at:
**`Beehive Speech Therapy` → `Games` → `Word Images`**

So the full path is something like:
`/Users/Amelia/Documents/Beehive Speech Therapy/Games/Word Images`

### 2. Open the Speech-Therapy-Games project
In Finder, go to:
**`Beehive Speech Therapy` → `Games` → `Speech-Therapy-Games`**

You should see folders like `games`, `assets`, and **`word-images`** (this folder).

### 3. Copy the *contents* of Word Images into word-images
- Open **Word Images** (the one under Games).
- Select **all the folders** inside it (e.g. `T:K Minimal Pairs - Initial`, `V:B Minimal Pairs - Initial`, etc.).  
  Don’t select the `.docx` file or `.DS_Store` unless you want them in the repo.
- Copy (Cmd+C).
- Open **Speech-Therapy-Games** → **word-images**.
- Paste (Cmd+V).

You should end up with something like:

```
Speech-Therapy-Games/
  word-images/
    T:K Minimal Pairs - Initial/
      can.png
      tan.png
      ...
    T:K Minimal Pairs - Final/
      back.png
      bat.png
      ...
    D:G Minimal Pairs - Initial/
      ...
    D:G Miminal Pairs - Final/
      ...
    V:B Minimal Pairs - Initial/
      ...
    V:B Minimal Pairs - Final/
      ...
    README.md   (this file)
```

### 4. Commit and push (so the website gets the images)
In Terminal (or Cursor’s terminal), from the **Speech-Therapy-Games** folder, run:

```bash
git add word-images/
git status
git commit -m "Add word images for games"
git push origin master
```

(Use `main` instead of `master` if your default branch is `main`.)

After that, the games on GitHub Pages will use these images. You can keep your original **Word Images** folder where it is; the games will use the copy inside **Speech-Therapy-Games/word-images** when they run from the repo or from the website.

## Folder names the games expect

The games look for these exact folder names inside `word-images/`:

- **T:K Minimal Pairs - Initial**
- **T:K Minimal Pairs - Final**
- **D:G Minimal Pairs - Initial**
- **D:G Miminal Pairs - Final** (note: “Miminal” to match your folder)
- **V:B Minimal Pairs - Initial**
- **V:B Minimal Pairs - Final**

Each folder should contain one `.png` (or `.jpg`) per word, e.g. `can.png`, `tan.png`, `Ed.png`, `v.png`, etc.
