# Bridge — Examples

Reference configurations for deploying Bridge in different scenarios.

## Files

| File | Purpose |
|------|---------|
| [`production.yaml`](./production.yaml) | Production `config.yaml` for a single-host lab appliance with all services installed system-wide |
| [`bridge.service`](./bridge.service) | systemd unit for running Bridge as a managed service with hardening |
| [`Caddyfile`](./Caddyfile) | Caddy reverse proxy with automatic TLS, basic auth, and security headers |

## Lab Appliance Deployment

For the full step-by-step guide on deploying Bridge as a hardened single-host security lab, see the [Lab Appliance Deployment](../README.md#lab-appliance-deployment) section in the main README.

## Source-Tree Development

For local development with the source trees of Apparatus, Chimera, and Crucible, see the default [`config.yaml`](../config.yaml) at the project root — it points at sibling project directories and runs each service via its dev command.
