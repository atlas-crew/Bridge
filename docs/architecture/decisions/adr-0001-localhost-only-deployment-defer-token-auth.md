---
id: adr-0001
title: Localhost-only deployment shape — defer full token auth
date: 2026-04-30
status: accepted
---
## Context

Bridge was reframed on 2026-04-28 from a personal tool (framing A) to a
shippable product (framing B) when it was scoped as the orchestration layer
for Atlas Crew Security. The active roadmap's Tier 1 begins with B1
(authentication on REST + WebSocket + ConfigEditor), specified as: generate
a token on first run at `~/.bridge/token`, gate all mutating routes and WS
upgrade, deliver token to web via cookie, expose via env var or
`bridge token show` for the CLI. Estimated effort: ~1 day.

The framing trigger was "a second person/entity depends on this tool," not
"the service is exposed publicly." Bridge already binds to 127.0.0.1
(`packages/server/src/server.ts:106`), so external network exposure is
structurally impossible without explicit reconfiguration. The deployment
shape is "users install Bridge on their own localhost," not "Bridge is
hosted on a public host."

The current security posture under that deployment shape:

- **Origin guard at `packages/server/src/utils.ts:37-56`** rejects requests
  whose `Origin` header is not localhost/127.x.x.x/::1. This blocks the
  largest CSRF class — random external webpages forging requests to
  `localhost:4200`.
- **Three residual gaps remain under localhost-only:**
  1. Cross-port localhost tabs: another local dev server on
     `http://localhost:5173` can issue requests; `isLocalOrigin` returns
     true for any localhost port.
  2. No-Origin requests on mutating routes are accepted
     (`isLocalOrigin(undefined) === true`), so any local process with curl
     or an HTTP client can call `POST /api/config` without going through a
     browser.
  3. No local-user separation — anyone logged into the host can hit Bridge.
     Not relevant on a single-user machine; relevant on shared dev VMs.

Token-based auth's primary value is **user separation on shared systems**,
not network protection. On a single-user localhost, there is no second user
to separate from.

## Decision

**Defer full B1 token authentication.** Replace it with **scoped origin
hardening** (the trimmed alternative discussed during planning):

1. Tighten the origin allowlist to require the Bridge dashboard's exact
   origin (block other localhost ports).
2. Reject requests with no `Origin` header on mutating routes (POST, PUT,
   DELETE, WS upgrade). Keep no-Origin permissive on GET routes so the CLI
   and curl can still read state.

Estimated effort: 30–60 minutes vs ~1 day for full B1.

The full token-auth spec (B1 as originally written) is preserved as
**B1.5** in the roadmap and is conditional on the deployment shape
changing.

## Consequences

**Re-trigger conditions** that flip B1.5 (full token auth) back to active:

- Bridge runs on a shared host (multi-user dev VM, jump box, lab appliance
  with multiple operators).
- Bridge is exposed beyond localhost — even briefly. Examples: SSH tunnel
  for a demo, ngrok for remote help, binding to `0.0.0.0` for LAN access,
  containerized with port published to the host.
- A second non-trusted local process with a known footprint on the host
  needs to be isolated from Bridge's API surface.

When any of these triggers fires, update this decision's status to
`superseded`, link to a new decision documenting the shape change, and
move B1.5 back to Tier 1 active in the roadmap.

**What this decision enables:**

- ConfigEditor merges and ships under product framing without a token
  bootstrap. The two new origin checks meaningfully close the CSRF and
  local-process-write classes that the current single-localhost-check
  doesn't.
- CLI parity work doesn't have to navigate token plumbing on day one —
  every CLI subcommand maps cleanly to a REST route without auth ceremony.
- The roadmap's CHANGELOG and CONTRIBUTING items are no longer gated
  behind a security-blocker rewrite.

**What this decision sacrifices:**

- The day Bridge runs on a shared host or behind any kind of remote tunnel,
  it is **open by design** — anyone reaching the port can write `command`
  and `args` and start arbitrary processes. The trigger conditions above
  are the only line of defense.
- Multi-user installs (e.g., a team's shared lab appliance) are not
  supported until B1.5 lands.
- Auditability of who-did-what is also deferred (Tier 2 audit log assumes
  an actor identity that token auth would provide).
