#!/bin/bash
# Push word-images/_library PNGs in batches (GitHub rejects packs > 2GB).
set -e
cd "$(dirname "$0")/.."
BATCH=400
LOG="tools/push-library-progress.log"
batch=2

echo "=== $(date) === Starting library push (batch size $BATCH)" | tee -a "$LOG"

while true; do
  listfile=$(mktemp)
  comm -23 \
    <(find word-images/_library -name '*.png' | sort) \
    <(git ls-files word-images/_library | sort) > "$listfile"
  remaining=$(wc -l < "$listfile" | tr -d ' ')
  if [ "$remaining" -eq 0 ]; then
    echo "=== $(date) === All _library PNGs are in git." | tee -a "$LOG"
    rm -f "$listfile"
    break
  fi
  echo "=== $(date) === Batch $batch: $remaining PNGs left; staging up to $BATCH..." | tee -a "$LOG"
  head -n "$BATCH" "$listfile" | while IFS= read -r f; do
    [ -n "$f" ] && git add "$f"
  done
  rm -f "$listfile"
  staged=$(git diff --cached --name-only 2>/dev/null | wc -l | tr -d ' ')
  if [ "$staged" -eq 0 ]; then
    echo "=== $(date) === Nothing staged; stopping." | tee -a "$LOG"
    break
  fi
  git commit -m "Add _library clipart (batch $batch)"
  echo "=== $(date) === Pushing $staged files..." | tee -a "$LOG"
  git push origin master
  echo "=== $(date) === Batch $batch pushed ($staged files)." | tee -a "$LOG"
  batch=$((batch + 1))
done

echo "=== $(date) === Finished. Tracked: $(git ls-files word-images/_library | wc -l | tr -d ' ') PNGs" | tee -a "$LOG"
