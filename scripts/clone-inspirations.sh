#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
DEST="$REPO_ROOT/inspirations"
mkdir -p "$DEST"
cd "$DEST"

repos=(
  #"https://github.com/anthropics/claude-code.git"
  "https://github.com/gautam-msft/claude-plugin-mp.git"
  "https://github.com/anthropics/claude-plugins-official.git"
  "https://github.com/anthropics/knowledge-work-plugins.git"
  "https://github.com/obra/superpowers.git"
  "https://github.com/anthropics/skills.git"
  "https://github.com/wshobson/agents.git"
  "https://github.com/EveryInc/compound-engineering-plugin.git"
  "https://github.com/VoltAgent/awesome-claude-code-subagents.git"
  "https://github.com/thedotmack/claude-mem.git"
  "https://github.com/JuliusBrussee/caveman.git"
  "https://github.com/almutaz9000/fable-skill.git"
  "https://github.com/Dallenlol/fable-mode.git"
  "https://github.com/imMamdouhaboammar/get-fable.git"
  "https://github.com/UnpaidAttention/fable5-methodology.git"
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
