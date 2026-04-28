# Bridge — task runner
# Install: brew install just   (or: make install-just)
# Usage:   just <recipe>   |   just --list

set dotenv-load := false
set shell       := ["zsh", "-c"]

# ── Project identity ───────────────────────────────────────────────
# `project` is the lowercased, underscore-normalized form of the directory
# name. It is used as the default tmux session name and as the prefix for
# every tmux service window. Override the session at runtime by exporting
# TMUX_SESSION before invoking `just` (useful for parallel checkouts).
project     := "command_plane"
svc_session := env("TMUX_SESSION", project)

# Each long-running local service gets its own window: `<project>-<role>`.
tmux_server_window := project + "-server"
tmux_web_window    := project + "-web"

# Workspace package paths (used by version/bump/release recipes).
_server_pkg := "packages/server/package.json"

# ── Default ────────────────────────────────────────────────────────

# Show available recipes.
default:
    @just --list

# ── tmux session helpers ───────────────────────────────────────────

# Idempotently create the tmux session used by all svc-* recipes.
tmux-new:
    @session="{{ svc_session }}"; \
    if tmux has-session -t "$session" 2>/dev/null; then \
        echo "tmux session '$session' already exists"; \
    else \
        tmux new-session -d -s "$session" -n shell; \
        echo "created tmux session '$session'"; \
    fi

# Internal: start a service in a dedicated tmux window. Idempotent — if the
# window exists and the process is running, this is a no-op; if the window
# exists but the process exited, restart it; otherwise create the window.
_svc-start window cmd: tmux-new
    @session="{{ svc_session }}"; window="{{ window }}"; cmd="{{ cmd }}"; \
    if tmux list-windows -t "$session" -F "#{window_name}" | grep -qx "$window"; then \
        if cortex tmux running "$window" >/dev/null 2>&1; then \
            echo "$window is already running"; \
        else \
            tmux send-keys -t "$session:$window" "cd \"$PWD\" && $cmd" C-m; \
        fi; \
    else \
        tmux new-window -d -t "$session:" -n "$window"; \
        tmux send-keys -t "$session:$window" "cd \"$PWD\" && $cmd" C-m; \
    fi
    @cortex tmux read {{ window }} 20

# Internal: stop a service window if it exists.
_svc-stop window:
    @if tmux list-windows -t "{{ svc_session }}" -F "#{window_name}" | grep -qx "{{ window }}"; then cortex tmux kill {{ window }}; fi

# ── Foreground recipes ─────────────────────────────────────────────
# These run in the current shell, blocking until killed. Prefer the svc-*
# variants below when running inside an agent or alongside other work.

# Install dependencies.
install:
    pnpm install

# Start server + web together (foreground, parallel pnpm).
dev:
    pnpm --parallel --filter @atlascrew/bridge --filter @bridge/web run dev

# Start the production-built server (requires `just build` first).
start:
    node packages/server/dist/bin.js

# Smoke test: starts a profile, waits for healthy, tears down.
smoke:
    node packages/server/scripts/smoke-test.mjs

# ── Background service recipes (svc-*) ─────────────────────────────
# These launch the same processes in dedicated tmux windows so an agent can
# keep working while services run. Each maps to a thin shell wrapper in
# scripts/ that handles env setup before exec'ing the real command — keep
# that env logic out of the justfile.

# Start the API/WebSocket server in a tmux window.
svc-server:
    @just _svc-start {{ tmux_server_window }} "./scripts/tx-start-server.sh"

# Start the Vite web dev server in a tmux window.
svc-web:
    @just _svc-start {{ tmux_web_window }} "./scripts/tx-start-web.sh"

# Start every service window.
svc-up: svc-server svc-web

# List the windows in the service session.
svc-list: tmux-new
    @cortex tmux list

# Show status for every service window.
svc-status:
    @echo "== {{ tmux_server_window }} =="
    @cortex tmux status {{ tmux_server_window }} || true
    @echo "== {{ tmux_web_window }} =="
    @cortex tmux status {{ tmux_web_window }} || true

# Read recent output from the server window.
svc-read-server:
    @cortex tmux read {{ tmux_server_window }} 50

# Read recent output from the web window.
svc-read-web:
    @cortex tmux read {{ tmux_web_window }} 50

# Print the tmux session name (useful for `tmux attach -t $(just svc-session)`).
svc-session:
    @echo "{{ svc_session }}"

# Attach to (or switch to) the service session's shell window.
svc-shell: tmux-new
    @session="{{ svc_session }}"; \
    tmux select-window -t "$session:shell"; \
    if [ -n "$TMUX" ]; then \
        tmux switch-client -t "$session"; \
    else \
        tmux attach-session -t "$session"; \
    fi

# Alias for svc-shell.
svc-attach: svc-shell

# Stop the server window.
svc-stop-server:
    @just _svc-stop {{ tmux_server_window }}

# Stop the web window.
svc-stop-web:
    @just _svc-stop {{ tmux_web_window }}

# Stop every service window.
svc-stop: svc-stop-server svc-stop-web

# Alias for svc-stop.
svc-down: svc-stop

# Restart the server window.
svc-restart-server: svc-stop-server
    @just svc-server

# Restart the web window.
svc-restart-web: svc-stop-web
    @just svc-web

# Restart every service window.
svc-restart: svc-stop
    @just svc-up

# Recreate the tmux session (kills every window in it).
svc-reset:
    @if tmux has-session -t "{{ svc_session }}" 2>/dev/null; then tmux kill-session -t "{{ svc_session }}"; fi
    @just tmux-new

# ── Quality recipes ────────────────────────────────────────────────
# No linter or test runner is currently configured. Add `lint` and `test`
# recipes (and wire them into `ci`) when those tools land.

# Production build (web bundle, then server bundle).
build:
    pnpm --filter @bridge/web run build
    pnpm --filter @atlascrew/bridge run build

# Static type-check across all workspaces.
typecheck:
    pnpm -r run type-check

# Aggregate quality gate. Used in CI and pre-merge.
ci: typecheck build

# Remove build artifacts.
clean:
    pnpm --filter @atlascrew/bridge run clean
    rm -rf packages/web/dist

# ── Docker ─────────────────────────────────────────────────────────

# Build docker image locally.
docker-build tag="bridge:local":
    docker build -t {{tag}} .

# Run docker image locally.
docker-run tag="bridge:local":
    docker run --rm -p 4200:4200 -v $(pwd)/config.yaml:/app/config.yaml {{tag}}

# ── Release ────────────────────────────────────────────────────────

# Show current version.
version:
    @jq -r .version {{_server_pkg}}

# Bump version (just bump [patch|minor|major]).
bump level="patch":
    #!/usr/bin/env bash
    set -euo pipefail
    current=$(jq -r .version {{_server_pkg}})
    IFS='.' read -r major minor patch <<< "$current"
    case "{{level}}" in
      patch) patch=$((patch + 1)) ;;
      minor) minor=$((minor + 1)); patch=0 ;;
      major) major=$((major + 1)); minor=0; patch=0 ;;
      *) echo "Usage: just bump [patch|minor|major]"; exit 1 ;;
    esac
    next="${major}.${minor}.${patch}"
    jq --arg v "$next" '.version = $v' {{_server_pkg}} > {{_server_pkg}}.tmp && mv {{_server_pkg}}.tmp {{_server_pkg}}
    echo "${current} → ${next}"

# Tag and push to trigger npm publish.
release:
    #!/usr/bin/env bash
    set -euo pipefail
    version=$(jq -r .version {{_server_pkg}})
    tag="v${version}"
    if git rev-parse "$tag" >/dev/null 2>&1; then
      echo "Error: tag $tag already exists. Bump first: just bump [patch|minor|major]"
      exit 1
    fi
    echo "Tagging $tag..."
    git tag "$tag"
    git push origin "$tag"
    echo "Pushed $tag — npm publish workflow triggered"
