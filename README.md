<div align="center">

![Bridge](brand/lockups/bridge-lockup.svg)

![Node.js](https://img.shields.io/badge/Node.js-v22+-green)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue)
![React](https://img.shields.io/badge/React-19-61dafb)
![WebSocket](https://img.shields.io/badge/WebSocket-Real--time-orange)
![License](https://img.shields.io/badge/License-MIT-black)

**Service orchestration layer for the Atlas Crew Security stack.**
Manages [Apparatus](https://github.com/nickcrew/apparatus), [Chimera](https://github.com/nickcrew/chimera), [Crucible](https://github.com/nickcrew/crucible), Signal Horizon, and Synapse as native child processes from a single web dashboard.

</div>

---

## What is Bridge?

Bridge is a **single-host service orchestrator**. It supervises long-running security stack processes, tracks their health and resource usage, streams their logs, and exposes a single web dashboard for operators to control the lifecycle of the whole stack — without container or cluster overhead. Atlas Crew Security uses Bridge as the orchestration layer for its security tooling.

Capabilities:

- **Process management** — Start, stop, restart, force-stop services with dependency-ordered lifecycle (topological sort on startup, reverse on shutdown)
- **Health monitoring** — HTTP polling with latency tracking, failure detection, and restart escalation (SIGTERM → SIGKILL with configurable grace period)
- **Resource monitoring** — Per-service CPU and memory sampling, surfaced live on each service card
- **Log aggregation** — Real-time log streaming with per-service filtering, full-text search, auto-scroll control, and a resizable panel
- **Profiles** — Named subsets for different workflows (`full-lab`, `apparatus-only`, `edge-protection`, `chimera-stack`, `testing`)
- **In-browser config editor** — Edit the active `config.yaml` from the dashboard; the server hot-reloads without restarting running services
- **Env variable substitution** — `$DEV_ROOT/Apparatus`-style references in any config string make the same file portable across machines
- **Recent-stderr surfacing** — Failing services show their last stderr lines inline on the card so debugging doesn't require scrolling to the log panel

## Architecture

```
bridge/
├── packages/shared     # @bridge/shared — types, Zod config schema, WS protocol
├── packages/server     # @atlascrew/bridge — Express + WebSocket backend (publishable)
└── packages/web        # @bridge/web — Vite + React dashboard
```

| Component | Stack | Role |
|-----------|-------|------|
| **Server** | Express 5, WebSocket (ws), js-yaml, Zod | Process supervisor, health poller, resource monitor, log buffer, REST + WS API |
| **Web** | React 19, Tailwind CSS 4, Zustand 5, Radix UI | Dashboard UI with real-time state via WebSocket; ConfigEditor for in-browser config edits |
| **Shared** | TypeScript, Zod | Service types, config schema, WS protocol definitions |

### Managed services

The set of services Bridge supervises is defined entirely in `config.yaml` — the table below reflects the default Atlas Crew Security stack as shipped in the included config:

| Service | Purpose | Default ports | Health |
|---------|---------|---------------|--------|
| **Apparatus** | Multi-protocol security lab | 8090 (HTTP), 8443 (HTTPS), 50051 (gRPC), plus echo/redis-mock ports | `/healthz` |
| **Chimera API** | Vulnerable application backend (Flask) | 8880 | `/health` |
| **Chimera Web** | Vulnerable frontend (React) | 5175 | `/` |
| **Crucible** | Attack simulation engine | 3000, 3001 | `/health` |
| **Signal Horizon API** | Edge-protection signal ingest | 3100 | `/health` |
| **Signal Horizon UI** | Edge-protection dashboard | 5180 | `/` |
| **Synapse Pingora** | Pingora-based WAF gateway | 6191 (admin) | `/health` |

### Dependency graph

The orchestrator topologically sorts the dependency graph at startup. Two example shapes from the default profiles:

**Core lab** (`full-lab`):

```
Apparatus ──► Chimera API ──► Chimera Web
                  │
                  └──► Crucible
```

**Edge protection** (`edge-protection`):

```
Apparatus ──► Chimera API ──┐
                            ▼
Signal Horizon API ──► Synapse Pingora
        │
        └──► Signal Horizon UI
```

## Installation

### npm

```bash
npm install -g @atlascrew/bridge
bridge start
```

Then create a `config.yaml` in your working directory (or set `CONFIG_PATH`) with your service definitions. See [Configuration](#configuration) below.

### Docker

```bash
docker run -p 4200:4200 \
  -v $(pwd)/config.yaml:/app/config.yaml \
  nickcrew/bridge:latest
```

The image ships with a default `config.yaml` baked in; mount your own to point services at the correct host paths.

### From source

```bash
# Install dependencies
pnpm install

# Foreground dev (server :4200 + Vite HMR :4201, both in your shell)
just dev

# Background dev (separate tmux windows, agent-friendly)
just svc-up
just svc-status
just svc-read-server 50      # tail server logs
just svc-read-web 50         # tail web logs

# Production build + run
just build && just start
```

Open `http://localhost:4200` (production) or `http://localhost:4201` (dev with proxy).

The justfile exposes the full `svc-*` family (start/stop/restart/status/read per service plus a session shell) so an agent can manage long-running dev processes without holding a foreground shell. `just --list` for the catalog; `just install-just` if `just` isn't installed.

## Configuration

All services are defined in `config.yaml` at the project root (or wherever `CONFIG_PATH` points):

```yaml
lab:
  name: "Production Lab"
  shutdownGracePeriodMs: 10000

services:
  apparatus:
    name: "Apparatus"
    cwd: "$DEV_ROOT/Apparatus"          # $-style env vars are substituted at load
    command: "pnpm"
    args: ["dev:server"]
    healthCheck:
      url: "http://127.0.0.1:8090/healthz"
      intervalMs: 5000
      timeoutMs: 3000
    ports:
      http1: 8090
    env:
      DEMO_MODE: "true"
    readyPattern: "server listening"
    dependencies: []

profiles:
  full-lab:
    description: "Full security testing stack"
    services: ["apparatus", "chimera-api", "chimera-web", "crucible"]
```

Key concepts:

- **`readyPattern`** — Regex matched against stdout to detect when a service is ready. Faster than waiting for health endpoints and survives slow first-request boot.
- **`dependencies`** — DAG of service startup order; the orchestrator topologically sorts before launching and reverses for shutdown.
- **`profiles`** — Named service subsets for different workflows. The dashboard's launcher shows them as a dropdown.
- **Env substitution** — `$VAR` and `${VAR}` references in any string are replaced with `process.env` values at config load. Empty if undefined.
- **Hot reload** — The config file is watched; saving triggers a reload. Running services keep running; new definitions take effect on next start.

## API

### REST

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/services` | List all services with status |
| `POST` | `/api/services/:id/start` | Start a service |
| `POST` | `/api/services/:id/stop` | Stop a service (SIGTERM with grace period) |
| `POST` | `/api/services/:id/force-stop` | Force-stop a service (SIGKILL) |
| `POST` | `/api/services/:id/restart` | Restart a service |
| `GET` | `/api/profiles` | List available profiles |
| `POST` | `/api/profiles/:name/start` | Start a profile in dependency order |
| `POST` | `/api/stop-all` | Stop every running service |
| `GET` | `/api/config` | Read the active config |
| `POST` | `/api/config` | Write a new config (triggers hot-reload) |
| `GET` | `/health` | Dashboard health check |

### WebSocket

Connect to `ws://localhost:4200/ws`. The server sends a full `LAB_STATE` snapshot on connection, then streams these deltas:

- `SERVICE_UPDATE` — lifecycle / state changes
- `HEALTH_UPDATE` — health-poll results
- `RESOURCES_UPDATE` — CPU / memory samples
- `LOG_OUTPUT` / `LOG_BATCH` — stdout + stderr from managed services
- `CONFIG_RELOADED` — config file changed and re-applied
- `PROFILE_STARTED` — a profile finished bringing up its services
- `ERROR` — operator-visible failures

Client commands: `START_SERVICE`, `STOP_SERVICE`, `FORCE_STOP_SERVICE`, `RESTART_SERVICE`, `START_PROFILE`, `STOP_ALL`, `SUBSCRIBE_LOGS`, `UNSUBSCRIBE_LOGS`.

## Lab Appliance Deployment

Bridge is intentionally a **single-host process supervisor** — it spawns and manages services as native child processes on one machine, not as containers across a cluster. The natural production shape is a "lab appliance": a dedicated VM where the managed packages are installed system-wide, Bridge runs as a systemd service, and a reverse proxy fronts the dashboard for TLS and authentication.

```
┌─────────────────────────────────────────┐
│  bridge.example.com                      │
│  ┌───────────────────────────────────┐  │
│  │ systemd: bridge.service           │  │
│  │   ├─ apparatus       (PID 1234)   │  │
│  │   ├─ chimera-api     (PID 1245)   │  │
│  │   ├─ chimera-web     (PID 1256)   │  │
│  │   └─ crucible        (PID 1267)   │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │ caddy                             │  │
│  │   :443 → :4200 (dashboard)        │  │
│  │   TLS, basic auth                 │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 1. Provision the host

```bash
# Create the system user and data directories
sudo useradd --system --home /var/lib/bridge --shell /usr/sbin/nologin bridge
sudo mkdir -p /var/lib/bridge/{apparatus,chimera,crucible}
sudo mkdir -p /etc/bridge
sudo chown -R bridge:bridge /var/lib/bridge
```

### 2. Install Bridge and the managed packages

```bash
# Bridge + Apparatus + Crucible (Node.js, npm)
sudo npm install -g @atlascrew/bridge @atlascrew/apparatus @atlascrew/crucible

# Chimera (Python)
sudo pipx install chimera-api  # or: sudo pip install chimera-api
```

### 3. Drop the production config

```bash
sudo cp examples/production.yaml /etc/bridge/config.yaml
sudo chown bridge:bridge /etc/bridge/config.yaml
sudo chmod 640 /etc/bridge/config.yaml
```

The [`examples/production.yaml`](./examples/production.yaml) file is preconfigured to use installed binaries, bind all services to `127.0.0.1`, persist data under `/var/lib/bridge/`, and run Chimera in `strict` mode (dangerous endpoints return 403).

### 4. Install the systemd unit

```bash
sudo cp examples/bridge.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now bridge
```

The [`examples/bridge.service`](./examples/bridge.service) unit applies hardening (NoNewPrivileges, ProtectSystem=strict, PrivateTmp, etc.), restart-on-failure with rate limiting, and journald log capture.

Verify:

```bash
systemctl status bridge
journalctl -u bridge -f
```

### 5. Front it with Caddy for TLS + auth

Bridge's dashboard binds to `127.0.0.1:4200` and is never directly exposed. Caddy (or nginx) provides TLS termination, basic authentication, and security headers:

```bash
# Generate a password hash
caddy hash-password

# Drop the Caddyfile and update bridge.example.com + the hash
sudo cp examples/Caddyfile /etc/caddy/Caddyfile
sudo $EDITOR /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

The [`examples/Caddyfile`](./examples/Caddyfile) handles automatic TLS via Let's Encrypt, basic auth, WebSocket upgrade for live log streaming, and includes optional IP allowlisting.

### 6. Start a profile from the dashboard

Open `https://bridge.example.com`, log in, and pick a profile in the launcher. Bridge brings the services up in dependency order, streams their logs to the dashboard, and begins polling health endpoints.

### What about Kubernetes / multi-host?

Bridge is intentionally single-host. For multi-tenant scenarios (e.g. dozens of isolated labs for a training cohort), the recommended pattern is to **build a Docker image that bundles the managed services + Bridge inside one container**, then deploy N instances with Kubernetes — each user gets a namespace and a private lab.

Use Kubernetes to orchestrate *containers*; use Bridge to orchestrate *processes inside each container*. Clean separation of concerns.

## Design system

Bridge's UI is built on [Recursive](https://www.recursive.design) — a single variable font that covers both sans-serif and monospace through axis interpolation. See [`brand/typography/TYPOGRAPHY.md`](brand/typography/TYPOGRAPHY.md) for the full type system specification.

The brand mark (the icon plus "Bridge — Service Orchestrator" lockup at the top of this README) lives at [`brand/lockups/bridge-lockup.svg`](brand/lockups/bridge-lockup.svg). Service icons are at [`brand/icons/`](brand/icons/).

## License

MIT — see [LICENSE](./LICENSE).
