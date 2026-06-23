#!/bin/bash
# Start a local server for the dinosaur recolor preview tool.
cd "$(dirname "$0")/.." || exit 1
PORT=8765
URL="http://localhost:${PORT}/tools/dino-recolor-preview.html"
echo ""
echo "  Dinosaur recolor preview"
echo "  Open in your browser:"
echo "  $URL"
echo ""
echo "  Press Ctrl+C to stop."
echo ""
python3 -m http.server "$PORT"
