#!/bin/bash
# Double-click this file in Finder to play Mythic Mix-Up.
# Do not open index.html directly — the game needs this local server
# so word lists, moss, and creature art can load.

set -e

GAME_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$GAME_DIR/../.." && pwd)"
PORT=8888
URL="http://127.0.0.1:${PORT}/games/mythic-mixup/index.html"

cd "$REPO_ROOT" || {
  echo "Could not find the Speech-Therapy-Games folder."
  read -p "Press Return to close this window… " _
  exit 1
}

echo ""
echo "  Mythic Mix-Up"
echo "  Opening: $URL"
echo ""
echo "  Keep this Terminal window open while you play."
echo "  Press Ctrl+C when you're done."
echo ""

if lsof -ti:"$PORT" >/dev/null 2>&1; then
  open "$URL"
  echo "  Using the server that is already running."
  echo ""
  read -p "Press Return to close this window (the game can stay open)… " _
  exit 0
fi

(sleep 0.5 && open "$URL") &
python3 -m http.server "$PORT" --bind 127.0.0.1
