#!/usr/bin/env bash
set -euo pipefail

USAGE="Usage: $0 [--target <path>] [--sync]"
TARGET="."
SYNC=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target|-t)
      if [[ $# -lt 2 || -z "$2" || "$2" == -* ]]; then
        echo "Missing path for $1" >&2
        exit 1
      fi
      TARGET="$2"; shift 2;;
    --sync|-s) SYNC=1; shift;;
    -h|--help) echo "$USAGE"; exit 0;;
    *) echo "Unknown option: $1" >&2; echo "$USAGE" >&2; exit 1;;
  esac
done

KIT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="$(mkdir -p "$TARGET" && cd "$TARGET" && pwd)"
if [[ "$TARGET" == "$KIT_ROOT" ]]; then
  echo "Target must differ from the kit source directory." >&2
  exit 1
fi

echo "Installing Codex Agent Kit into: $TARGET"

# Copy a kit-relative file; preserve existing content unless --sync was given.
# Create parent directories and stop installation on copy errors.
install_file() {
  local src="$KIT_ROOT/$1"
  local dst="$TARGET/$1"
  if [[ ( -e "$dst" || -L "$dst" ) && $SYNC -eq 0 ]]; then
    echo "  Skipped: $1 (exists, use --sync to overwrite)"
  else
    mkdir -p "$(dirname "$dst")"
    cp "$src" "$dst"
  fi
}

# Copy hidden and regular files under a kit-relative directory, excluding caches.
# Install individually so preservation never falls back to overwriting files.
install_dir() {
  local src="$KIT_ROOT/$1"
  local file
  mkdir -p "$TARGET/$1"
  while IFS= read -r -d '' file; do
    install_file "${file#"$KIT_ROOT/"}"
  done < <(find "$src" -type d -name __pycache__ -prune -o -type f -print0)
  echo "  Copied dir: $1"
}

for directory in .agents/skills agents rules workflows examples templates scripts guides; do
  install_dir "$directory"
done
for file in AGENTS.md definition-of-done.md .cursorrules .clinerules .github/copilot-instructions.md; do
  install_file "$file"
done

# Automatic regeneration would overwrite files preserved above.
echo "Done. Codex Agent Kit installed into $TARGET"
echo "After editing rules, run python scripts/build_agents_md.py from the target repository."
