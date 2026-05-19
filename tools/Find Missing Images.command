#!/bin/bash
# Opens the Find Missing Images tool in your default browser.
# Double-click in Finder. Uses Chrome/Edge for the folder picker (Safari may not work).

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HTML="$SCRIPT_DIR/find-missing-images.html"

if [ ! -f "$HTML" ]; then
  echo "Could not find: $HTML"
  read -p "Press Return to close… " _
  exit 1
fi

open "$HTML"
