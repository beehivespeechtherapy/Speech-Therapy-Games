Boss sprite (PNG or SVG)
========================
The game loads whatever file `boss.image` points to in `config.json`
(default: `boss/samurai_boss.svg`).

Important: the file `samurai_boss.svg` in git right now is only a small
**placeholder** (simple shapes). If the boss on the site does not look like
your real samurai, open this exact path on your Mac in Finder, then open the
file in a text editor or design app:

  games/sound-ninjas/boss/samurai_boss.svg

If you still see the tiny placeholder, your finished artwork is not saved into
this project folder yet — copy or export your real samurai SVG **over** that
file (keep the name `samurai_boss.svg` unless you change `boss.image` in
`config.json` and in the `#game-config` block in `index.html` to match).

Use a real PNG only if the bytes are real PNG (correct `.png` extension). SVG
text saved as `.png` will not show in an `<img>` (you will only see the emoji).

After replacing the file, commit and push so GitHub Pages updates.
