set dotenv-load := false

_pkg := "packages/server/package.json"

default:
    @just --list

# Install all dependencies
install:
    pnpm install

# Start dashboard in dev mode (server + web hot-reload)
dev:
    pnpm --parallel --filter @atlascrew/inferno-lab --filter @inferno-lab/web run dev

# Start server only
dev-server:
    pnpm --filter @atlascrew/inferno-lab run dev

# Build everything for production
build:
    pnpm --filter @inferno-lab/web run build
    pnpm --filter @atlascrew/inferno-lab run build

# Start the production server
start:
    node packages/server/dist/bin.js

# Type-check all packages
check:
    pnpm -r run type-check

# ── Docker ─────────────────────────────────────────────────

# Build docker image locally
docker-build tag="inferno-lab:local":
    docker build -t {{tag}} .

# Run docker image locally
docker-run tag="inferno-lab:local":
    docker run --rm -p 4200:4200 -v $(pwd)/config.yaml:/app/config.yaml {{tag}}

# ── Release ────────────────────────────────────────────────

# Show current version
version:
    @jq -r .version {{_pkg}}

# Bump version (just bump [patch|minor|major])
bump level="patch":
    #!/usr/bin/env bash
    set -euo pipefail
    current=$(jq -r .version {{_pkg}})
    IFS='.' read -r major minor patch <<< "$current"
    case "{{level}}" in
      patch) patch=$((patch + 1)) ;;
      minor) minor=$((minor + 1)); patch=0 ;;
      major) major=$((major + 1)); minor=0; patch=0 ;;
      *) echo "Usage: just bump [patch|minor|major]"; exit 1 ;;
    esac
    next="${major}.${minor}.${patch}"
    jq --arg v "$next" '.version = $v' {{_pkg}} > {{_pkg}}.tmp && mv {{_pkg}}.tmp {{_pkg}}
    echo "${current} → ${next}"

# Tag and push to trigger npm publish
release:
    #!/usr/bin/env bash
    set -euo pipefail
    version=$(jq -r .version {{_pkg}})
    tag="v${version}"
    if git rev-parse "$tag" >/dev/null 2>&1; then
      echo "Error: tag $tag already exists. Bump first: just bump [patch|minor|major]"
      exit 1
    fi
    echo "Tagging $tag..."
    git tag "$tag"
    git push origin "$tag"
    echo "Pushed $tag — npm publish workflow triggered"
