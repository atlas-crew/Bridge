# Inferno Lab — Improvement Roadmap

- **Status:** Active
- **Created:** 2026-04-23
- **Last updated:** 2026-04-28
- **Active framing:** Shippable product (see §Framing)

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
remains as written; B1 (auth) is the next concrete deliverable and
unblocks the in-flight ConfigEditor merge.*

### Tier 1 (B) — hardening before v1.0

#### B1. Authentication on REST + WebSocket + ConfigEditor

**Problem.** Unauthenticated mutating endpoints + a config editor that
writes `command`/`args`/`cwd` = RCE by design.

**Design sketch.**
- Generate a token on first run, persist to `~/.inferno-lab/token`
  with `chmod 600`; honor `INFERNO_LAB_TOKEN` env override.
- Require token on all `POST` routes, WS upgrade (via query string or
  `Sec-WebSocket-Protocol`), and any future config-mutation routes.
- Tighten CORS to an origin allowlist read from config.

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

#### B3. PR-level CI workflow

- `.github/workflows/pr.yml` on `pull_request` and push to `main`.
- Jobs: `pnpm install --frozen-lockfile`, `type-check`, `build`, `test`.
- Pin pnpm version (already done in `release.yml`).

**Effort.** ~half day.

### Tier 2 (B) — product polish

- **Audit log.** `{timestamp, actor, action, target, source}` for every
  start/stop/restart and config write. JSONL at `~/.inferno-lab/audit.log`,
  rotated at 10MB.
- **"Save current selection as profile" UI.** `POST /api/profiles`
  updates `config.yaml` via `saveConfig`; pair with SIGHUP reload so no
  restart required.
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

### Recommended sequence (if B reactivates)

1. B1 (auth) — unblocks ConfigEditor merge.
2. B2 (tests) — in parallel; the `spawn` DI refactor is independent.
3. B3 (PR CI) — trivial once tests exist.
4. Tag v0.2.0 with hardening pass + ConfigEditor.
5. Tier 2 alongside feature work; Tier 3 rolled into feature PRs.

### Open questions (product framing)

- Token distribution for the systemd-deployed appliance: systemd
  `LoadCredential=`, environment file, or a `inferno-lab token show`
  command?
- Multi-user auth is out of scope for v1.0 per README's K8s stance —
  confirm before auth design ossifies into single-token assumption.
- Config reload semantics: does SIGHUP restart running services whose
  definition changed, or apply on next start?
- Resource-monitor transport: WS deltas vs UI-scraped `/metrics`?

## Out of scope under either framing

- Multi-host orchestration (README correctly defers this to Kubernetes).
- Rewriting any service in another language.
- Replacing the YAML config format (Zod schema fits; editor is the real
  UX work).
- Built-in multi-user or RBAC (the tool's shape is single-operator under
  either framing).
