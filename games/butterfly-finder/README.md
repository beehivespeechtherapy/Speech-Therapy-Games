# Butterfly Finder

An “I Spy”–style game: butterflies are hidden behind flowers. Players click flowers to reveal what’s behind them. Find all the butterflies in any order to win.

Inspired by the [Find the Flutters](https://docs.google.com/presentation/d/1m1v1u5t-WbvSy9eKsCEZDajCB_w9bFMih0bFbUZbG3c/edit?usp=sharing) concept, with a 4×4 flower grid layout to make the butterflies a bit harder to find.

## Flow

1. **Intro** – Message: “Find the butterflies hidden behind the flowers! Click a flower to see what's behind it. You can find them in any order.” + **Start**.
2. **Choose word set** – Pick which word pairs to practice (T/K, D/G, or V/B). Clicking a set starts the game.
3. **Game** – 4×4 grid of flowers (16 flowers). Ten butterflies are randomly placed behind ten of the flowers. Click a flower to reveal what’s behind it (butterfly or empty). Butterflies can be found in any order.
4. **Celebration** – When all ten butterflies are found: “You found all the butterflies, great job!” + optional image + **Play again**.

## Adding your own images

See **`assets/README.md`** for the list of images to add:

- **16 flower images** – `flowers/flower1.png` … `flowers/flower16.png`
- **10 butterfly images** – `butterflies/butterfly1.png` … `butterflies/butterfly10.png`
- Optional: `intro.png`, `celebration.png`

Use your own clipart to avoid copyright issues.

## Running locally

Open `index.html` in a browser, or serve the repo (e.g. `npx serve .`) and go to `games/butterfly-finder/index.html`.
