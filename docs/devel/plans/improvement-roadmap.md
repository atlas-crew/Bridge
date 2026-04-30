# Inferno Lab — Improvement Roadmap

- **Status:** Active
- **Created:** 2026-04-23
- **Last updated:** 2026-04-30
- **Active framing:** Shippable product (see §Framing)
- **Decisions referenced:** `backlog/decisions/decision-1` (B1 scope)

## Framing

There are two valid readings of this project, each pulling toward an
incompatible roadmap. This section names the choice explicitly so it gets
re-decided on purpose rather than drifting.

### A — Personal convenience tool *(ARCHIVED — was active 2026-04-23 through 2026-04-28)*

Single operator (Nick), bound to localhost on a dev machine. Success =
fewer ergonomic frictions, zero maintenance tax from features no one uses.
Over-building is the primary failure mode. The active roadmap below is
built on this framing.

### B — Shippable product *(ACTIVE — re-activated 2026-04-28)*

Single-host supervisor marketed publicly as `@atlascrew/inferno-lab` with
a hardening path from v0.1.0 to v1.0. The archived roadmap further down is
the plan that applies if the framing flips back.

### Decision triggers

Flip to framing B (and re-activate the archived roadmap) if any of the
following happens:

- A second person depends on this tool — coworker, contributor, external user.
- Any instance is exposed beyond localhost, even briefly.
- A CVE-class issue would cause real embarrassment, i.e. its blast radius
  exceeds what a personal tool can absorb.

When any trigger fires, update the **Active framing** field above, note
the trigger and date in §Framing history, and move the archived roadmap
to active.

### Commitment discipline under framing A *(historical — applied 2026-04-23 through 2026-04-28)*

Framing A only pays back if product-mode habits don't drift back in by
ambient reflex. Explicit opt-outs while A is active:

- No new tagged releases after v0.1.0, no CHANGELOG maintenance.
- No running `release.yml` to publish fresh npm or Docker Hub builds.
- No adding collaborators without a re-framing conversation.
- No writing "just in case it's public someday" auth, audit trails, or
  reference docs.

If you find yourself wanting one of these, that's a signal to revisit the
framing rather than sneak the work in.

### Framing history

- 2026-04-23 — Adopted framing A. Product framing (B) archived on same
  day; the plan existed first as B, was reframed to A within the same
  working session.
- 2026-04-28 — Flipped to framing B. Trigger: this project becomes the
  orchestration layer for Atlas Crew Security, satisfying the
  "second person/entity depends on this tool" criterion. The personal-tool
  opt-outs (no tagged releases past v0.1.0, no CHANGELOG, no
  just-in-case auth) are no longer in effect.
- 2026-04-30 — Scoped B1 to origin-hardening only; deferred full token
  auth as B1.5 pending deployment-shape change. See
  `backlog/decisions/decision-1`. The framing-B trigger was "second user
  depends on this tool," not "exposed publicly" — Bridge binds to
  127.0.0.1 and is installed per-user on local hosts. Re-trigger
  conditions for B1.5 are listed in the decision.

## Current state findings (2026-04-23)

Framing-independent. Based on a repo scan at branch `main`, HEAD `cd63bde`.

| Area | State | Evidence |
|------|-------|----------|
| Tests | None | No `__tests__/`, no `*.test.ts`, no test runner in `package.json` |
| CI | Release-only | `.github/workflows/release.yml` publishes on tag; no PR workflow |
| Auth | None | `packages/server/src/server.ts` uses `app.use(cors())` with no origin allowlist; no token or WS upgrade guard |
| Config mutation UI | In flight, uncommitted | `packages/web/src/components/config/ConfigEditor.tsx` (405 LoC) + `saveConfig` import in `routes.ts` |
| Signal / lifecycle | Solid | `process-manager.ts` SIGTERM→SIGKILL with `shutdownGracePeriodMs` |
| Docs | Sparse | `docs/` holds only `dockerhub-overview.md`; no NAVIGATOR, no troubleshooting guide |
| Observability | stdout logs only | `log-buffer.ts` exists; no `/metrics`, no structured server logs, no request IDs |
| Resource monitor | In flight | `packages/server/src/resource-monitor.ts` (103 LoC) — rate-limit strategy unclear |

## Archived roadmap — Personal tool (framing A)

*This was the active roadmap from 2026-04-23 through 2026-04-28. Kept
intact for reference and in case the framing flips back. Items §4 (smoke
test) and parts of §5 (Bridge rebrand) shipped during this window and
remain valid under framing B.*


### 1. Scope-cut the "lab appliance" narrative

Roughly half the README is a systemd + Caddy + multi-tenant deployment
story that doesn't serve a single-user tool. Delete the "Lab Appliance
Deployment" section from the README, along with `examples/production.yaml`,
`examples/inferno-lab.service`, and `examples/Caddyfile`. This compounds:
less ambiguity about what the tool is for, less temptation to build
features that belong to the fictional product.

**Published artifacts decision.** The `@atlascrew/inferno-lab` npm package
and `nickcrew/inferno-lab` Docker Hub image were published under framing
B. Options under framing A:

- *Freeze* at v0.1.0 with a "personal tool — no support" note in README
  and package description. [**Recommended** — preserves existing installs,
  signals the stance clearly.]
- *Unpublish* entirely. Cleaner, but breaks any machine that pulled v0.1.0.
- *Keep publishing.* Slides back toward framing B by habit; avoid.

**Effort.** ~1 hour of deletion + README rewrite + package description
update.

### 2. Kill your top three ergonomic frictions

The list below is visible from the code; the *ranking* requires your
usage data. Pick three based on what actually bites, not what sounds best.

- **Config hardcodes `/Users/nick/Developer/...` paths.** Env-var
  substitution in the YAML loader (`$DEV_ROOT/Apparatus`) makes moving
  between machines free. Fits the existing Zod schema. ~half day.
- **"Start last-used profile on launch."** Preference file at
  `~/.inferno-lab/prefs.json`. ~20 LoC. Shaves two clicks every dashboard
  open.
- **Inline last-N stderr lines on yellow/red service cards.** Right now
  `service-card.tsx` shows health + ports; debugging means scrolling to
  the log viewer and filtering. Surfacing the tail directly on the failing
  card is the single highest-value UX change visible in the repo. ~2 hours.
- **Keyboard shortcuts on the dashboard.** `space` to start/stop
  highlighted service, `j/k` to navigate, `/` to focus log filter. ~half
  day. Personal tools are where keyboard flows actually compound.

### 3. Finish ConfigEditor without a security gate

Merge the in-flight `ConfigEditor.tsx`. Under framing B this was a
Tier 1 blocker because editing `command`/`args` via HTTP equals RCE;
under framing A the endpoint is localhost-only and the threat model is
"malicious webpage," which an origin check handles. Value is eliminating
the `$EDITOR config.yaml && restart-server` loop.

**One guardrail worth keeping even under A:** origin check on the
WebSocket upgrade and on `POST /api/config`. Not a token; just
`req.headers.origin` against an allowlist. ~10 LoC. Closes the cross-site
request class without dragging token infrastructure along.

### 4. One smoke test, not a test suite

Add `just smoke`: starts the `apparatus-only` profile, waits for
`healthy` status, tears down. ~50 LoC. Run it pre-commit or before
tagging a personal version. This catches the regression class that
actually costs time — "my lab doesn't start anymore and I don't know
which commit broke it."

Explicitly skip: vitest + spawn dependency injection. That investment
pays back in a product framing and is overkill here. One integration
test running real processes for 30 seconds is strictly better leverage
for personal use.

### 5. Let the brand work compound

The Recursive variable font, banners, and icon system reward polish.
Health-state transition animations, a terminal-themed log viewer skin,
a subtle boot flourish on first load — all valid improvements for
something you look at every day, all silly for an enterprise tool.
Treat this as ambient fit-and-finish, not a milestone.

### Questions that would sharpen the ranking

1. In the last week of actual use, what made you say "ugh" out loud?
   That item moves to the top of §2 above.
2. Which services in `config.yaml` have you *not* started in weeks?
   Scope-cut them before adding anything — fewer dependencies, faster
   boot, less maintenance surface.

## Active roadmap — Product framing (B)

*Re-activated 2026-04-28 when the project was scoped to be the
orchestration layer for Atlas Crew Security. Recommended sequence below
remains as written; B1 (scoped origin hardening) is the next concrete
deliverable and unblocks the in-flight ConfigEditor merge.*

### Tier 1 (B) — hardening before v1.0

#### B1. Scoped origin hardening for ConfigEditor

*Per `backlog/decisions/decision-1` (2026-04-30): Bridge's deployment
shape is single-user localhost. Full token auth is deferred as B1.5.*

**Problem.** ConfigEditor writes `command`/`args`/`cwd`, which is RCE
by design. Under localhost-only the public-internet CSRF class is
already blocked by the existing origin guard
(`packages/server/src/utils.ts:37-56`), but two residual local-machine
gaps remain:

1. Cross-port localhost tabs — `isLocalOrigin` returns `true` for any
   `localhost:*`, so a malicious page hosted on another local dev
   server can call Bridge's API.
2. No-Origin requests on mutating routes — `isLocalOrigin(undefined)`
   returns `true`, so any local process can call `POST /api/config`.

**Design sketch.**
- Tighten the origin allowlist to require the *exact* Bridge dashboard
  origin (host + port), not any localhost port.
- Reject requests with no `Origin` header on mutating routes (POST,
  PUT, DELETE) and on the WS upgrade. Keep no-Origin permissive on GET
  routes so curl and the future CLI can still read state without
  ceremony.

**Acceptance criteria.**
- Request with `Origin: http://localhost:5173` to a Bridge instance
  served on `:4200` → 403.
- `curl -X POST /api/services/apparatus/start` (no Origin) → 403.
- `curl http://localhost:4200/api/services` (no Origin, GET) → 200.
- WS upgrade with no Origin → 403 before protocol handshake.

**Effort.** ~30–60 min.

#### B1.5. Full token authentication *(deferred — gated on deployment shape change)*

*Originally specified as B1 under the product-framing flip. Deferred per
`backlog/decisions/decision-1`. Re-activate when any of the following
triggers fire: Bridge runs on a shared host; Bridge is exposed beyond
localhost (SSH tunnel, ngrok, `0.0.0.0` bind, container with published
port); a non-trusted local process needs API isolation.*

**Design sketch.**
- Generate a token on first run, persist to `~/.bridge/token`
  with `chmod 600`; honor `BRIDGE_TOKEN` env override.
- Require token on all mutating routes, WS upgrade (via query string or
  `Sec-WebSocket-Protocol`), and any future config-mutation routes.
- Tighten CORS to an origin allowlist read from config.
- Expose token to CLI via env var or `bridge token show` subcommand.

**Acceptance criteria.**
- `curl -X POST /api/services/apparatus/start` without a token → 401.
- WS upgrade without token → 401 before protocol handshake.
- Web app reads token from a cookie set by the server on dashboard load;
  no token appears in JS bundles or URL query strings.
- ConfigEditor gated by the same token.

**Effort.** ~1 day.

#### B2. Test suite on the supervisor core

**Problem.** `orchestrator.ts`, `process-manager.ts`, `health-monitor.ts`
carry the load-bearing logic and have zero coverage. Bugs here cause
orphaned processes on customer VMs.

**Design sketch.**
- Add `vitest`; configure per-package runners.
- Inject `spawn` as a constructor dependency in `ProcessManager` so tests
  replace it with a fake that replays stdout lines and exit codes.
- Cover topo-sort (cycles, unknowns), lifecycle (start/stop/restart
  transitions, SIGTERM→SIGKILL escalation, port conflict surfacing),
  health state machine (unknown → healthy → degraded → healthy).

**Acceptance criteria.**
- `pnpm test` runs vitest across all three packages.
- ≥70% line coverage on the three core files; no coverage requirement
  elsewhere yet.
- No test relies on real subprocess spawning or real network.

**Effort.** ~2 days including the `spawn` DI refactor.

#### B3. PR-level CI workflow *(shipped 2026-04-30 — `9f46937`)*

- `.github/workflows/pr.yml` on `pull_request` and push to `main`.
- Jobs: `pnpm install --frozen-lockfile`, `type-check`, web build, server
  build. Test job will be added when B2 lands.
- Pinned pnpm 10.32.1 + Node 22 (matches `release.yml`).

### Tier 2 (B) — product polish

- **CLI parity with the web UI.** Bridge today is a server launcher
  (`bridge start | serve | help`); operations go through the dashboard or
  REST/WS. Goal: every dashboard action available as a CLI subcommand
  against a running server. Sketched surface: `bridge service
  list|show|start|stop|restart|force-stop|logs`, `bridge profile
  list|show|launch|save`, `bridge config show|edit|validate`, `bridge
  status`, `bridge stop-all`. The CLI is an HTTP client of the running
  server, not a re-implementation of supervisor logic — every subcommand
  maps to an existing REST route. ~1.5 days with `commander` or `yargs`.
  Open design questions: noun-verb vs verb-noun grouping; default
  human-readable + `--json` for scripting.
- **Audit log.** `{timestamp, actor, action, target, source}` for every
  start/stop/restart and config write. JSONL at `~/.bridge/audit.log`,
  rotated at 10MB. Note: meaningful actor identity requires B1.5
  (token auth).
- **"Save current selection as profile" UI.** *(shipped 2026-04-30 —
  `9c1ac3c` + `66d48f6`)* `POST /api/profiles` route + ProfileSelector
  "Save Running" affordance. Hot-reload via `watchConfig` covered the
  reload requirement — no SIGHUP plumbing needed.
- **Observability.** `GET /metrics` in Prometheus text format
  (`services_up`, `health_check_latency_ms`, `service_restarts_total`,
  `supervisor_uptime_seconds`). Structured JSON logs with request IDs.
  Rate-limit resource-monitor WS deltas to 1 Hz per service, batched
  into a single frame.

### Tier 3 (B) — documentation and hygiene

- **Docs structure** — `docs/NAVIGATOR.md`, `docs/guides/troubleshooting.md`,
  `docs/reference/api.md`, `docs/architecture/overview.md`.
- **`CHANGELOG.md`** — retroactive v0.1.0 entry, Keep a Changelog format.
- **`CONTRIBUTING.md`** — dev setup, commit convention, PR expectations.

### Recommended sequence

1. **B1 (scoped origin hardening)** — unblocks ConfigEditor under product
   framing. ~30–60 min.
2. **B2 (tests)** — in parallel with anything else; the `spawn` DI
   refactor is independent. ~2 days.
3. **CLI parity (Tier 2)** — independent; doesn't have to wait for
   B1/B2. Slots in once a contributor has time.
4. **Tag v0.2.0** with B1 hardening + ConfigEditor + save-as-profile
   + CLI parity (whichever land first).
5. Remaining Tier 2 (audit log, observability) alongside feature work;
   Tier 3 rolled into feature PRs.

### Open questions (product framing)

- ~~Token distribution for the systemd-deployed appliance~~ — N/A under
  the localhost-only deployment shape (decision-1). Re-opens with B1.5.
- ~~Multi-user auth is out of scope for v1.0~~ — confirmed by decision-1.
  Multi-user re-opens only when deployment crosses a host boundary.
- Config reload semantics: does SIGHUP restart running services whose
  definition changed, or apply on next start? *(Note: SIGHUP itself is
  no longer needed — file-watching covers reload, see `watchConfig` in
  `packages/server/src/config.ts:28`. Question is now: when config
  changes, should running services whose definition changed be
  auto-restarted, or apply only on next manual start?)*
- Resource-monitor transport: WS deltas vs UI-scraped `/metrics`?

## Out of scope under either framing

- Multi-host orchestration (README correctly defers this to Kubernetes).
- Rewriting any service in another language.
- Replacing the YAML config format (Zod schema fits; editor is the real
  UX work).
- Built-in multi-user or RBAC (the tool's shape is single-operator under
  either framing).
