Boss sprite (PNG or SVG)
========================
Put your boss artwork in this folder. The game reads the path from `boss.image` in
`config.json` (default: `boss/samurai_boss.svg`).

Use a real PNG file if you use a `.png` name (binary PNG only). If the file is
actually SVG markup, name it `.svg` — a file named `.png` that contains SVG will
not load in an `<img>` tag in most browsers (you will only see the emoji fallback).

Commit and push `games/sound-ninjas` (config.json, index.html, this folder, weapons/*.png)
so GitHub Pages picks up the sprite. On https the game loads `config.json` from the
server first so you are not stuck on old embedded JSON.

Replace the placeholder art with your own samurai artwork when ready.
