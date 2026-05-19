#!/bin/bash
# Launcher for the Single-Word Sheet Generator.
# Double-click this file in Finder. A Terminal window will open and start
# a tiny local server; your web browser opens automatically with the tool.
# Close the Terminal window (Ctrl+C) when you're done.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TOOL_DIR="$SCRIPT_DIR/single-word-sheet-generator"

echo "Single-Word Sheet Generator"
echo "  Folder: $TOOL_DIR"

if [ ! -f "$TOOL_DIR/server.py" ]; then
  echo
  echo "Could not find server.py at:"
  echo "  $TOOL_DIR/server.py"
  echo
  echo "Make sure the single-word-sheet-generator folder lives next to this .command file inside the tools/ folder."
  read -p "Press Return to close this window… " _
  exit 1
fi

REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
export WORD_IMAGES_ROOT="$REPO_ROOT/word-images"

cd "$TOOL_DIR"
exec python3 server.py
