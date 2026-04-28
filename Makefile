##  Bridge — Makefile wrapper for just
##  Every recipe forwards to the justfile. Run `make install-just` if just
##  is missing — the wrapper will offer to install it on first use.

SHELL     := /bin/bash
JUST_DEST ?= $(HOME)/bin

# ── Passthrough recipes ────────────────────────────────────────────
# Keep this list in sync with the justfile. New recipes added to the
# justfile must be appended both to .PHONY and to the passthrough rule
# block below, otherwise `make <recipe>` will fall through to the
# implicit-rule machinery and fail with a confusing error.

.PHONY: default help \
        install dev start smoke \
        tmux-new svc-server svc-web svc-up svc-list svc-status \
        svc-read-server svc-read-web svc-session svc-shell svc-attach \
        svc-stop-server svc-stop-web svc-stop svc-down \
        svc-restart-server svc-restart-web svc-restart svc-reset \
        build typecheck ci clean \
        docker-build docker-run \
        version bump release

default: help

help: ## Show available targets.
	@echo "Makefile targets (passthrough to justfile):"
	@echo ""
	@echo "  make install               Install dependencies"
	@echo "  make dev                   Start server + web (foreground)"
	@echo "  make start                 Run the production-built server"
	@echo "  make smoke                 Run the orchestrator smoke test"
	@echo ""
	@echo "  make tmux-new              Create the tmux service session"
	@echo "  make svc-server            Start the server in a tmux window"
	@echo "  make svc-web               Start the web dev server in a tmux window"
	@echo "  make svc-up                Start every service window"
	@echo "  make svc-status            Show status for service windows"
	@echo "  make svc-stop              Stop every service window"
	@echo "  make svc-restart           Restart every service window"
	@echo "  make svc-reset             Recreate the tmux service session"
	@echo ""
	@echo "  make build                 Production build (web + server)"
	@echo "  make typecheck             Static type-checking"
	@echo "  make ci                    Aggregate CI gate (typecheck + build)"
	@echo "  make clean                 Remove build artifacts"
	@echo ""
	@echo "  make docker-build          Build the local Docker image"
	@echo "  make docker-run            Run the local Docker image"
	@echo ""
	@echo "  make version               Print the current package version"
	@echo "  make bump                  Bump version (default: patch)"
	@echo "  make release               Tag + push to trigger npm publish"
	@echo ""
	@echo "  make install-just          Install the just command runner"
	@echo "  make help                  Show this help"
	@echo ""
	@echo "  For arg-bearing recipes (bump major, docker-build tag=foo, …)"
	@echo "  invoke them through just directly: just bump major"

install dev start smoke tmux-new svc-server svc-web svc-up svc-list svc-status svc-read-server svc-read-web svc-session svc-shell svc-attach svc-stop-server svc-stop-web svc-stop svc-down svc-restart-server svc-restart-web svc-restart svc-reset build typecheck ci clean docker-build docker-run version bump release:
	@if ! command -v just >/dev/null 2>&1; then \
		read -p "just is not installed. Install now? [Y/n] " yn; \
		case "$${yn:-Y}" in \
			[Yy]*) $(MAKE) install-just;; \
			*) echo "Aborted."; exit 1;; \
		esac; \
	fi; \
	just $@

# ── Install just ───────────────────────────────────────────────────
# Cascades through preferred installers in order: brew (macOS default) →
# cargo (already-have-rust dev) → snap (some Linux) → official curl script
# (universal fallback, prints PATH advice if $JUST_DEST is not on $PATH).

.PHONY: install-just
install-just:
	@if command -v just >/dev/null 2>&1; then \
		echo "just is already installed: $$(command -v just)"; \
		just --version; \
		exit 0; \
	fi; \
	\
	DEST="$(JUST_DEST)"; \
	\
	if echo ":$$PATH:" | grep -q ":$$DEST:"; then \
		echo "Installing just to $$DEST (already in PATH)..."; \
		curl --proto '=https' --tlsv1.2 -sSf https://just.systems/install.sh | bash -s -- --to "$$DEST"; \
		exit 0; \
	fi; \
	\
	echo "$$DEST is not in PATH — trying package managers..."; \
	\
	if command -v brew >/dev/null 2>&1; then \
		echo "Installing via brew..."; \
		brew install just; \
	elif command -v cargo >/dev/null 2>&1; then \
		echo "Installing via cargo..."; \
		cargo install just; \
	elif command -v snap >/dev/null 2>&1; then \
		echo "Installing via snap..."; \
		snap install --classic --edge just; \
	else \
		echo "No package manager found — installing via official script to $$DEST..."; \
		mkdir -p "$$DEST"; \
		curl --proto '=https' --tlsv1.2 -sSf https://just.systems/install.sh | bash -s -- --to "$$DEST"; \
		echo ""; \
		echo "Add $$DEST to your PATH:"; \
		echo "  export PATH=\"$$DEST:\$$PATH\""; \
	fi
