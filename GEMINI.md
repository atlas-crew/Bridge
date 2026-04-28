# Inferno Lab - Unified Control Plane

Inferno Lab is a web-based process orchestration dashboard designed to manage a security testing stack (Apparatus, Chimera, and Crucible) as native child processes. It provides a unified interface for process management, real-time health monitoring, and live log aggregation.

## Project Structure

This is a **pnpm monorepo** organized as follows:

- **`packages/shared`**: Common TypeScript types, WebSocket protocol definitions, and the Zod configuration schema (`config-schema.ts`).
- **`packages/server`**: Node.js/Express 5 + WebSocket backend. Acts as the process supervisor, health poller, and log buffer.
- **`packages/web`**: React 19 + Vite dashboard UI using Tailwind CSS 4 and Zustand for state management.
- **`brand/`**: Visual assets, including banners, icons, and the Recursive-based typography system.
- **`examples/`**: Deployment templates (systemd units, Caddyfile, production YAML).

## Architecture & Technology Stack

- **Runtime**: Node.js v22+
- **Backend**: Express 5 (REST API), `ws` (WebSocket for real-time state/logs), `js-yaml` (Config parsing), `zod` (Validation).
- **Frontend**: React 19, Vite 6, Tailwind CSS 4, Radix UI (Primitives), Lucide (Icons).
- **Orchestration**: Manages child processes with topological dependency sorting.
- **Monitoring**: Active health polling via HTTP endpoints with latency tracking.
- **Logs**: Buffered log streaming from stdout/stderr with `readyPattern` detection for fast startup.

## Building and Running

The project uses `just` as a command runner.

### Development
```bash
# Install dependencies
pnpm install

# Start both server and web dashboard with hot-reload
just dev

# Start server only (useful for API/Orchestrator testing)
just dev-server
```

### Production
```bash
# Full build (web assets are bundled into the server package)
just build

# Start the production server (serves dashboard at :4200 by default)
just start
```

### Validation & Docker
```bash
# Run type-checks across all packages
just check

# Build local Docker image
just docker-build
```

## Configuration

The lab is configured via `config.yaml`. Key concepts include:

- **`services`**: Map of process definitions (cwd, command, args, env, ports).
- **`readyPattern`**: A regex matched against stdout to determine when a service is "ready" before health checks pass.
- **`dependencies`**: Ensures services start in the correct order (e.g., API before Web).
- **`profiles`**: Named subsets of services (e.g., `full-lab`, `testing`) that can be started/stopped as a group.

## Development Conventions

- **Shared Types**: Always define new WebSocket messages or configuration changes in `packages/shared`.
- **Zod Validation**: All external configuration and incoming state should be validated against the shared Zod schemas.
- **Graceful Shutdown**: The server implements a cascade shutdown that ensures all managed child processes are terminated on `SIGTERM/SIGINT`.
- **Styling**: Use Tailwind CSS 4 utility classes. Prefer the Recursive font family for a consistent sans/mono aesthetic.
- **Real-time Flow**: State updates (Health, Status, Logs) flow from Server -> WebSocket -> Zustand Store -> UI.
