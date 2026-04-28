#!/usr/bin/env bash
#
# tx-start-server.sh — launched by `just svc-server` inside a tmux window.
#
# Responsibilities:
#   1. Resolve the project root regardless of caller cwd.
#   2. Activate the required runtime so the tmux shell matches the dev's
#      normal shell, not whatever zsh inherits from tmux.
#   3. Provide sensible env defaults (override from the parent shell).
#   4. Exec the actual service command — let it own stdout/stderr so
#      `cortex tmux read` shows the real process output.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# ── Runtime activation ─────────────────────────────────────────────
# This project requires Node >=22 (engines.node). There is no .nvmrc
# checked in, so the inherited shell environment must already have a
# compatible Node on PATH. If you use nvm and add a .nvmrc, uncomment
# the block below to ensure the right version is active inside tmux.
#
# export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# if [[ -s "$NVM_DIR/nvm.sh" ]]; then
#   . "$NVM_DIR/nvm.sh"
#   nvm use >/dev/null || nvm install >/dev/null
# fi

# ── Env defaults ───────────────────────────────────────────────────
# Use ${VAR:-default} so the parent shell's value (or .env) wins.
# export PORT="${PORT:-4200}"

# ── Launch ─────────────────────────────────────────────────────────
exec pnpm --filter @atlascrew/bridge run dev
