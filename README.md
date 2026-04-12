<div align="center">

![Inferno Lab Banner](brand/banners/infernolab-banner.png)

![Node.js](https://img.shields.io/badge/Node.js-v22+-green)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue)
![React](https://img.shields.io/badge/React-19-61dafb)
![WebSocket](https://img.shields.io/badge/WebSocket-Real--time-orange)
![License](https://img.shields.io/badge/License-MIT-black)

Unified control plane for the Inferno Lab security testing stack.
Orchestrates [Apparatus](https://github.com/nickcrew/apparatus), [Chimera](https://github.com/nickcrew/chimera), and [Crucible](https://github.com/nickcrew/crucible) from a single web dashboard with process management, health monitoring, and live log streaming.

</div>

---

## What is Inferno Lab?

Inferno Lab is a **web-based orchestration dashboard** that manages the three Inferno Lab services as native child processes. It provides:

- **Process Management** — Start, stop, and restart services with dependency-ordered startup
- **Health Monitoring** — Live polling of health endpoints with latency tracking and failure detection
- **Log Aggregation** — Real-time log streaming from all services with per-service filtering and search
- **Profiles** — Named presets (`full-lab`, `apparatus-only`, `chimera-stack`, `testing`) that start service subsets in the correct order
- **Unified Configuration** — Single `config.yaml` that wires service ports, environment variables, and inter-service connections

## Architecture

```
inferno-lab/
├── packages/shared     # @inferno-lab/shared — types, Zod config schema
├── packages/server     # @atlascrew/inferno-lab — Express + WebSocket backend (publishable)
└── packages/web        # @inferno-lab/web — Vite + React dashboard
```

| Component | Stack | Role |
|-----------|-------|------|
| **Server** | Express 5, WebSocket (ws), js-yaml, Zod | Process supervisor, health poller, log buffer, REST + WS API |
| **Web** | React 19, Tailwind CSS 4, Zustand 5, Radix UI | Dashboard UI with real-time state via WebSocket |
| **Shared** | TypeScript, Zod | Service types, config schema, WS protocol definitions |

### Managed Services

| Service | Default Ports | Health Endpoint |
|---------|---------------|-----------------|
| **Apparatus** — Multi-protocol security lab | 8090, 8443, 50051 | `/healthz` |
| **Chimera API** — Vulnerable application (Flask) | 8880 | `/health` |
| **Chimera Web** — Vulnerable frontend (React) | 5175 | `/` |
| **Crucible** — Attack simulation engine | 3000, 3001 | `/health` |

### Dependency Graph

```
Apparatus ──► Chimera API ──► Chimera Web
                  │
                  └──► Crucible
```

## Installation

### npm (recommended)

```bash
npm install -g @atlascrew/inferno-lab
inferno-lab start
```

Then create a `config.yaml` in your working directory (or set `CONFIG_PATH`) with your service definitions. See [Configuration](#configuration) below.

### Docker

```bash
docker run -p 4200:4200 \
  -v $(pwd)/config.yaml:/app/config.yaml \
  nickcrew/inferno-lab:latest
```

The image ships with a default `config.yaml` baked in, but mounting your own lets you point the services at the correct host paths.

### From source

```bash
# Install dependencies
pnpm install

# Development (server :4200 + Vite HMR :4201)
just dev

# Production build
just build && just start
```

Open `http://localhost:4200` (production) or `http://localhost:4201` (dev with proxy).

## Configuration

All services are defined in `config.yaml` at the project root:

```yaml
lab:
  name: "Inferno Lab"
  shutdownGracePeriodMs: 10000

services:
  apparatus:
    name: "Apparatus"
    cwd: "/path/to/Apparatus"
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
    readyPattern: "listening on"
    dependencies: []

profiles:
  full-lab:
    description: "All services"
    services: ["apparatus", "chimera-api", "chimera-web", "crucible"]
```

Key config concepts:

- **`readyPattern`** — Regex matched against stdout to detect when a service is ready (faster than waiting for health endpoints)
- **`dependencies`** — DAG of service startup order; the orchestrator topologically sorts this before launching
- **`profiles`** — Named service subsets for different use cases

## API

### REST

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/services` | List all services with status |
| `POST` | `/api/services/:id/start` | Start a service |
| `POST` | `/api/services/:id/stop` | Stop a service |
| `POST` | `/api/services/:id/restart` | Restart a service |
| `GET` | `/api/profiles` | List available profiles |
| `POST` | `/api/profiles/:name/start` | Start a profile |
| `POST` | `/api/stop-all` | Stop all running services |
| `GET` | `/health` | Dashboard health check |

### WebSocket

Connect to `ws://localhost:4200/ws`. The server sends a full `LAB_STATE` snapshot on connection, then streams `SERVICE_UPDATE`, `HEALTH_UPDATE`, and `LOG_OUTPUT` deltas.

Client commands: `START_SERVICE`, `STOP_SERVICE`, `RESTART_SERVICE`, `START_PROFILE`, `STOP_ALL`, `SUBSCRIBE_LOGS`, `UNSUBSCRIBE_LOGS`.

## Lab Appliance Deployment

Inferno Lab is designed as a **single-host process supervisor** — it spawns and manages the four services as native child processes on one machine, not as containers across a cluster. The natural production shape is a "lab appliance": a dedicated VM where all four packages are installed system-wide, Inferno Lab runs as a systemd service, and a reverse proxy fronts the dashboard for TLS and authentication.

```
┌─────────────────────────────────────────┐
│  lab.example.com                         │
│  ┌───────────────────────────────────┐  │
│  │ systemd: inferno-lab.service      │  │
│  │   ├─ apparatus  (PID 1234)        │  │
│  │   ├─ chimera    (PID 1245)        │  │
│  │   └─ crucible   (PID 1267)        │  │
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
sudo useradd --system --home /var/lib/inferno-lab --shell /usr/sbin/nologin inferno-lab
sudo mkdir -p /var/lib/inferno-lab/{apparatus,chimera,crucible}
sudo mkdir -p /etc/inferno-lab
sudo chown -R inferno-lab:inferno-lab /var/lib/inferno-lab
```

### 2. Install all four packages

```bash
# Inferno Lab + Apparatus + Crucible (Node.js)
sudo npm install -g @atlascrew/inferno-lab @atlascrew/apparatus @atlascrew/crucible

# Chimera (Python)
sudo pipx install chimera-api  # or: sudo pip install chimera-api
```

### 3. Drop the production config

```bash
sudo cp examples/production.yaml /etc/inferno-lab/config.yaml
sudo chown inferno-lab:inferno-lab /etc/inferno-lab/config.yaml
sudo chmod 640 /etc/inferno-lab/config.yaml
```

The [`examples/production.yaml`](./examples/production.yaml) file is preconfigured to use installed binaries (`apparatus`, `chimera-api`, `crucible`), bind all services to `127.0.0.1`, persist data under `/var/lib/inferno-lab/`, and run Chimera in `strict` mode (dangerous endpoints return 403).

### 4. Install the systemd unit

```bash
sudo cp examples/inferno-lab.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now inferno-lab
```

The [`examples/inferno-lab.service`](./examples/inferno-lab.service) unit includes hardening (NoNewPrivileges, ProtectSystem=strict, PrivateTmp, etc.), restart-on-failure with rate limiting, and journald log capture.

Verify it's running:

```bash
systemctl status inferno-lab
journalctl -u inferno-lab -f
```

### 5. Front it with Caddy for TLS + auth

Inferno Lab's dashboard binds to `127.0.0.1:4200` and is never directly exposed. Caddy (or nginx) provides TLS termination, basic authentication, and security headers:

```bash
# Generate a password hash
caddy hash-password

# Drop the Caddyfile and update lab.example.com + the hash
sudo cp examples/Caddyfile /etc/caddy/Caddyfile
sudo $EDITOR /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

The [`examples/Caddyfile`](./examples/Caddyfile) handles automatic TLS via Let's Encrypt, basic auth, WebSocket upgrade for live log streaming, and includes optional IP allowlisting.

### 6. Start a profile from the dashboard

Open `https://lab.example.com`, log in, and click `full-lab` in the profile selector. Inferno Lab will start Apparatus → Chimera → Crucible in dependency order, stream their logs to the dashboard, and begin polling health endpoints.

### What about Kubernetes / multi-host?

Inferno Lab is intentionally a single-host supervisor. For multi-tenant scenarios (e.g. 50 isolated labs for a training cohort), the recommended pattern is to **build a Docker image that bundles all four services + Inferno Lab inside one container**, then deploy 50 instances of that image with Kubernetes — giving each user their own namespace. Inferno Lab still does its single-host job; it just happens that each "host" is now a container.

Use Kubernetes to orchestrate the *containers*, and Inferno Lab to orchestrate the *processes inside each container*. Clean separation of concerns.

## Design System

Inferno Lab uses the brand system built on [Recursive](https://www.recursive.design) — a single variable font that covers both sans-serif and monospace through axis interpolation. See [`brand/typography/TYPOGRAPHY.md`](brand/typography/TYPOGRAPHY.md) for the full type system specification.
