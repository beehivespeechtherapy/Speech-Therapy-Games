Boss sprite (PNG)
=================
Put your boss artwork in this folder. The game expects:

  samurai_boss.png

That path matches boss.image in config.json by default. You can change boss.image
to any other filename in this folder (or a URL path) if you prefer.

Commit and push games/sound-ninjas (config.json, index.html, this PNG, weapons/*.png)
so GitHub Pages picks up the samurai sprite and Grappling Hook; the game now loads
config.json from the server first on https so you are not stuck on old embedded JSON.

Replace samurai_boss.png with your own samurai artwork when ready (the repo may use a
small placeholder character image so it is not a desktop screenshot).
