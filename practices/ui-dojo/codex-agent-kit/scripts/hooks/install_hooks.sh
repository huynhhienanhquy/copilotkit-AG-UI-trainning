#!/usr/bin/env bash
# Install codex-agent-kit git hooks into the current repository.
# Run from the repository root: bash scripts/hooks/install_hooks.sh
set -euo pipefail
HOOK_SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/pre-commit"
GIT_HOOKS_DIR="$(git rev-parse --git-dir)/hooks"
cp "$HOOK_SRC" "$GIT_HOOKS_DIR/pre-commit"
chmod +x "$GIT_HOOKS_DIR/pre-commit"
echo "Installed pre-commit hook into $GIT_HOOKS_DIR"
