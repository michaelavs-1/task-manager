#!/bin/bash
cd /Users/michaelavshalom/task-manager
echo "👀 מעקב אחר שינויים..."
while true; do
  if [[ -n $(git status --porcelain) ]]; then
    FILE=$(git status --porcelain | head -1 | awk '{print $2}' | xargs basename 2>/dev/null)
    git add .
    git commit -m "auto: $FILE"
    git push
    echo "✅ נדחף ב-$(date '+%H:%M:%S')"
  fi
  sleep 3
done
