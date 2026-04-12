# Inferno Lab

Unified web dashboard that orchestrates [Apparatus](https://hub.docker.com/r/nickcrew/apparatus), [Chimera](https://hub.docker.com/r/nickcrew/chimera), and [Crucible](https://hub.docker.com/r/nickcrew/crucible) from a single control plane — process management, dependency-ordered startup, health monitoring, and live log streaming.

Part of the [Inferno Lab](https://github.com/inferno-lab) security testing suite.

## Quick Start

```bash
docker run -p 4200:4200 \
  -v $(pwd)/config.yaml:/app/config.yaml \
  nickcrew/inferno-lab
```

- Dashboard: [localhost:4200](http://localhost:4200)
- REST API: [localhost:4200/api/services](http://localhost:4200/api/services)
- Health check: [localhost:4200/health](http://localhost:4200/health)
- WebSocket: `ws://localhost:4200`

> **Note:** Inferno Lab manages child processes defined in `config.yaml`. Mount your own config to point it at the right service binaries and URLs, or use the bundled default for a demo setup.

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
  name: "My Security Lab"
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
    description: "Start everything"
    services: ["apparatus"]
```

## What It Does

Inferno Lab is not another managed service — it's the **control plane** for the Inferno Lab suite. Its job is to start, monitor, and coordinate the three sibling products so you can manage the full stack from one dashboard.

- **Process management** — Start, stop, and restart services with graceful SIGTERM → SIGKILL shutdown
- **Dependency-ordered startup** — Apparatus boots before Chimera, Chimera before Crucible; profiles define named subsets
- **Health monitoring** — Live HTTP polling of each service's `/health` endpoint with latency tracking and failure detection
- **Log aggregation** — Real-time stdout/stderr streaming from all services over WebSocket, with per-service filtering and text search
- **Profiles** — Named presets (`full-lab`, `apparatus-only`, `chimera-stack`, `testing`) that spin up different subsets of the stack

## Using Inferno Lab with Docker Compose

Because Inferno Lab orchestrates child *processes* (not containers), the typical Docker Compose use case is to run it **alongside** the three services, mounting the config into the image. Here's the standard 4-service lab:

```yaml
services:
  inferno-lab:
    image: nickcrew/inferno-lab
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

When running in Compose mode, point the `config.yaml` health check URLs at the service hostnames (`http://apparatus:8090/healthz`, `http://chimera:8880/health`, etc.) so Inferno Lab can reach them across the `lab` network.

```bash
docker compose up -d
```

| Service | URL |
|---------|-----|
| Inferno Lab Dashboard | [localhost:4200](http://localhost:4200) |
| Apparatus Dashboard | [localhost:8090/dashboard](http://localhost:8090/dashboard) |
| Chimera Portal | [localhost:8880](http://localhost:8880) |
| Crucible UI | [localhost:3000](http://localhost:3000) |

## Native process management (recommended)

Inferno Lab was designed to spawn services as **native child processes** on the host, not as sibling containers. This works best when running from npm directly:

```bash
npm install -g @atlascrew/inferno-lab
inferno-lab start
```

With this mode, `config.yaml` points `cwd` at each project directory and Inferno Lab runs `pnpm dev` (or any command) as a child process — capturing stdout/stderr, detecting readiness via regex patterns, and managing the full lifecycle. See the [GitHub README](https://github.com/inferno-lab/inferno-lab) for details.

## Also available on npm

```bash
npm install -g @atlascrew/inferno-lab
inferno-lab start
```

## Tags

- `latest` — latest stable release
- `{major}.{minor}.{patch}` — specific version (e.g. `0.1.0`)
- `{major}.{minor}` — latest patch of a minor line (e.g. `0.1`)
- `sha-<commit>` — built from a specific commit

## Links

- [GitHub](https://github.com/inferno-lab/inferno-lab)
- [npm](https://www.npmjs.com/package/@atlascrew/inferno-lab)
- [Apparatus on Docker Hub](https://hub.docker.com/r/nickcrew/apparatus)
- [Chimera on Docker Hub](https://hub.docker.com/r/nickcrew/chimera)
- [Crucible on Docker Hub](https://hub.docker.com/r/nickcrew/crucible)
