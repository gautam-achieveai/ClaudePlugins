#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
DEST="$REPO_ROOT/inspirations"
mkdir -p "$DEST"
cd "$DEST"

repos=(
  "https://github.com/anthropics/claude-code.git"
  "https://github.com/gautam-msft/claude-plugin-mp.git"
  "https://github.com/anthropics/claude-plugins-official.git"
  "https://github.com/anthropics/knowledge-work-plugins.git"
  "https://github.com/obra/superpowers.git"
)

for url in "${repos[@]}"; do
  name=$(basename "$url" .git)
  if [ -d "$name" ]; then
    echo "Updating $name..."
    git -C "$name" pull --ff-only 2>/dev/null || echo "  (pull failed, skipping)"
  else
    echo "Cloning $name..."
    git clone "$url"
  fi
done

echo "Done."
