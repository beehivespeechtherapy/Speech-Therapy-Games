#!/bin/bash
# Start a local server for Fossil Forge (and other games in this repo).
cd "$(dirname "$0")/.." || exit 1

PORT=8888
# Free the port if something is already listening
if lsof -ti:"$PORT" >/dev/null 2>&1; then
  echo "Stopping old process on port $PORT..."
  lsof -ti:"$PORT" | xargs kill 2>/dev/null
  sleep 0.5
fi

URL="http://127.0.0.1:${PORT}/games/fossil-forge/index.html"
echo ""
echo "  Fossil Forge — local server"
echo "  Open in your browser:"
echo "  $URL"
echo ""
echo "  Games menu: http://127.0.0.1:${PORT}/index.html"
echo ""
echo "  Press Ctrl+C to stop."
echo ""

python3 -m http.server "$PORT" --bind 127.0.0.1
