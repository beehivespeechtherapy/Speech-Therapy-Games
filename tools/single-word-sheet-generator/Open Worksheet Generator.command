#!/bin/bash
# Double-click this file in Finder to start the worksheet generator.
# Your browser opens automatically. Press Ctrl+C in Terminal when you're done.

set -e

TOOL_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$TOOL_DIR/../.." && pwd)"

if [ ! -f "$TOOL_DIR/server.py" ]; then
  echo "Could not find server.py in:"
  echo "  $TOOL_DIR"
  read -p "Press Return to close… " _
  exit 1
fi

export WORD_IMAGES_ROOT="$REPO_ROOT/word-images"
cd "$TOOL_DIR"
exec python3 server.py
