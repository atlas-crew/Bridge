# Bridge

![Bridge](https://raw.githubusercontent.com/atlas-crew/Bridge/main/brand/banners/bridge-banner.png)

Service orchestration layer for the [Atlas Crew Security](https://atlascrew.dev) stack — supervises [Apparatus](https://hub.docker.com/r/nickcrew/apparatus), [Chimera](https://hub.docker.com/r/nickcrew/chimera), [Crucible](https://hub.docker.com/r/nickcrew/crucible), Signal Horizon, and Synapse as native child processes from a single web dashboard.

## Quick Start

```bash
docker run -p 4200:4200 \
  -v $(pwd)/config.yaml:/app/config.yaml \
  nickcrew/bridge
```

- Dashboard: [localhost:4200](http://localhost:4200)
- REST API: [localhost:4200/api/services](http://localhost:4200/api/services)
- Health check: [localhost:4200/health](http://localhost:4200/health)
- WebSocket: `ws://localhost:4200`

> **Note:** Bridge manages child processes defined in `config.yaml`. Mount your own config to point it at the right service binaries and URLs, or use the bundled default for a demo setup.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4200` | Dashboard server port |
| `HOST` | `0.0.0.0` | Bind address |
| `CONFIG_PATH` | `/app/config.yaml` | Path to service definitions YAML |
| `NODE_ENV` | `production` | Node environment |

### Minimal `config.yaml`

```yaml
lab:
  name: "Atlas Crew Stack"
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
  full-stack:
    description: "Start everything"
    services: ["apparatus"]
```

## What It Does

Bridge is the **control plane** for the Atlas Crew Security suite. Its job is to start, monitor, and coordinate the sibling products so you can manage the full stack from one dashboard.

- **Process management** — Start, stop, restart, and force-stop services with graceful SIGTERM → SIGKILL shutdown
- **Dependency-ordered lifecycle** — Topological sort on startup, reverse on shutdown; profiles define named subsets
- **Health monitoring** — HTTP polling of each service's health endpoint with latency tracking and failure detection
- **Resource monitoring** — Per-process CPU and memory tracking surfaced on every service card
- **Log aggregation** — Real-time stdout/stderr streaming over WebSocket, with per-service filtering and text search
- **Hot-reload config** — Edit `config.yaml` and reload without restarting Bridge
- **Profiles** — Named presets (`full-stack`, `apparatus-only`, `chimera-stack`, `testing`) that spin up different subsets of the stack

## Using Bridge with Docker Compose

Because Bridge orchestrates child *processes* (not containers), the typical Docker Compose use case is to run it **alongside** the three Dockerized services, mounting the config into the image. Here's the standard 4-service stack:

```yaml
services:
  bridge:
    image: nickcrew/bridge
    ports:
      - "4200:4200"
    volumes:
      - ./config.yaml:/app/config.yaml
    depends_on:
      - apparatus
      - chimera
      - crucible
    networks:
      - lab

  apparatus:
    image: nickcrew/apparatus
    ports:
      - "8090:8090"
      - "8443:8443"
    environment:
      DEMO_MODE: "true"
    networks:
      - lab

  chimera:
    image: nickcrew/chimera
    ports:
      - "8880:8880"
    environment:
      DEMO_MODE: "full"
      APPARATUS_ENABLED: "true"
      APPARATUS_BASE_URL: http://apparatus:8090
    networks:
      - lab

  crucible:
    image: nickcrew/crucible
    ports:
      - "3000:3000"
    environment:
      CRUCIBLE_TARGET_URL: http://chimera:8880
    volumes:
      - crucible-data:/app/data
    networks:
      - lab

networks:
  lab:

volumes:
  crucible-data:
```

When running in Compose mode, point the `config.yaml` health check URLs at the service hostnames (`http://apparatus:8090/healthz`, `http://chimera:8880/health`, etc.) so Bridge can reach them across the `lab` network.

```bash
docker compose up -d
```

| Service | URL |
|---------|-----|
| Bridge Dashboard | [localhost:4200](http://localhost:4200) |
| Apparatus Dashboard | [localhost:8090/dashboard](http://localhost:8090/dashboard) |
| Chimera Portal | [localhost:8880](http://localhost:8880) |
| Crucible UI | [localhost:3000](http://localhost:3000) |

## Native process management (recommended)

Bridge was designed to spawn services as **native child processes** on the host, not as sibling containers. This works best when running from npm directly:

```bash
npm install -g @atlascrew/bridge
bridge start
```

With this mode, `config.yaml` points `cwd` at each project directory and Bridge runs `pnpm dev` (or any command) as a child process — capturing stdout/stderr, detecting readiness via regex patterns, and managing the full lifecycle. See the [GitHub README](https://github.com/atlas-crew/Bridge) for details.

## Also available on npm

```bash
npm install -g @atlascrew/bridge
bridge start
```

## Tags

- `latest` — latest stable release
- `{major}.{minor}.{patch}` — specific version (e.g. `0.1.0`)
- `{major}.{minor}` — latest patch of a minor line (e.g. `0.1`)
- `sha-<commit>` — built from a specific commit

## Links

- [GitHub](https://github.com/atlas-crew/Bridge)
- [npm](https://www.npmjs.com/package/@atlascrew/bridge)
- [Apparatus on Docker Hub](https://hub.docker.com/r/nickcrew/apparatus)
- [Chimera on Docker Hub](https://hub.docker.com/r/nickcrew/chimera)
- [Crucible on Docker Hub](https://hub.docker.com/r/nickcrew/crucible)
