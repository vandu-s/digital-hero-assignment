# Incremental Improvement & Migration Plan

> **Principle: no big-bang rewrite.** The codebase is fundamentally sound. Every item below is an incremental, independently-shippable change that leaves the app working at each step. Work is sequenced by risk-adjusted value: security and correctness first, then developer-experience and scale.

The plan is organized into three horizons — **Week 1** (stabilize & meet requirements), **Month 1** (harden & professionalize), **Quarter 1** (scale & mature). Items already completed in the current audit pass are marked ✅ so the remaining roadmap is clear.

---

## Week 1 — Stabilize & meet requirements

Goal: close every correctness, security, and requirement gap that affects a user or an evaluator *today*. All small, all low-risk.

| # | Item | Why now | Status |
|---|---|---|---|
| 1 | Add API rate limiting (auth + public form + global) | Highest security gap; unthrottled login/lead-form | ✅ Done |
| 2 | Add the required "Built for Digital Heroes" footer | Hard submission requirement | ✅ Done |
| 3 | Error + loading states on all read/list fetches | "Empty" vs "broken" must differ | ✅ Done |
| 4 | Make "Remember me" functional (session vs local storage) | Security-expectation correctness | ✅ Done |
| 5 | Real client-side validation on the public lead form | Top-of-funnel conversion UX | ✅ Done |
| 6 | Top-level React error boundary | One bug shouldn't white-screen the app | ✅ Done |
| 7 | Debounce leads search | Stop request-per-keystroke | ✅ Done |
| 8 | Route-level code-splitting | Halve the initial bundle | ✅ Done |
| 9 | Restrict raw error leakage to `development` only | Info disclosure in staging | ✅ Done |
| 10 | Add pagination/filter/sort/validation tests | Close the biggest test gap | ✅ Done (46 tests) |
| 11 | **Rotate the JWT secret; confirm production uses a managed secret** | Committed dev secret must never reach prod | ⬜ Deploy-time action |
| 12 | **`git init` + first commit + push to a remote** | This is a submission; it should be a real repo with history | ⬜ Todo |

**Exit criteria for Week 1:** all requirements met, all tests green, production deploy uses generated secrets, repo is under version control.

---

## Month 1 — Harden & professionalize

Goal: turn "works and is secure" into "a team could own this confidently." Each item is a focused PR.

### Data model
- **Promote `Activity.type` to a Prisma enum** (`CREATED | STATUS_CHANGED | ASSIGNED | NOTE_ADDED`). Ships as one migration + a seed update; gives DB-level integrity to the audit log.
- **Add `onDelete` behavior to `Lead.createdBy` / `Lead.assignedTo`** before any user-deletion feature exists. Decide `SetNull` for `assignedTo` (unassign the lead) and `Restrict` for `createdBy` (preserve provenance) — a deliberate, documented choice.

### Testing & quality gates
- **Add a small layer of pure unit tests** for `buildScopedWhere` (the role-scoping rule) and `sanitizeUser`, so a broken DB doesn't hide logic regressions behind integration-test failures.
- **Isolate test data**: move from a shared seeded DB (order-fragile — `user.test.ts` renames/reverts the seeded member) toward per-suite fixtures or a transaction-rollback wrapper. Prevents flaky, order-dependent tests.
- **Stand up CI** (GitHub Actions): on every PR run typecheck + lint + test + build for both workspaces. Block merge on red. This is the single highest-leverage professionalization step.

### Observability
- **Structured logging** (pino) replacing bare `console.error`, with request IDs; never log tokens/passwords (already true).
- **Error tracking** (Sentry) on both client and server, wired into the existing `errorHandler` and the new `ErrorBoundary`.
- **Uptime monitoring** pointed at the existing `/api/v1/health` endpoint.

### Security hardening
- Tighten `helmet` with an explicit Content-Security-Policy for the deployed origins.
- Add per-user (not just per-IP) rate limiting on authenticated mutation endpoints if abuse appears.

**Exit criteria for Month 1:** CI green-gate on every PR, error tracking live, audit-log integrity enforced at the DB, no order-dependent tests.

---

## Quarter 1 — Scale & mature

Goal: prepare for real growth in data volume, team size, and feature surface.

### Performance & scale
- **Dedicated dashboard stats endpoint.** Today the dashboard fetches up to 100 leads and reduces client-side (a documented tradeoff). Replace with a `GET /leads/stats` that computes counts/sums in the DB with `groupBy` — accurate beyond 100 leads and far less data over the wire.
- **Server-side caching** (short-TTL) for the stats endpoint and any hot read.
- **Cursor-based pagination** option for very large lead tables (keyset over offset) if lists grow into the tens of thousands.
- **List virtualization / prefetch** on the DataGrid if row counts climb.

### Developer experience & contracts
- **Generated, shared types** between client and server. Today `client/src/types/models.ts` is hand-synced with the Prisma schema — a drift risk. Options, in order of investment: (a) generate TS types from Prisma and import them; (b) extract a shared `@crm/types` workspace package; (c) adopt tRPC or an OpenAPI-generated client for end-to-end type safety.
- **Component library extraction**: the shared `StatusChip`, `StatCard`, `DetailRow`, state components, and `ConfirmDialog` are the seed of an internal design system — formalize with Storybook as the UI surface grows.

### Feature completeness (previously deferred)
- **Global search** in the Topbar (currently a decorative placeholder) — wire it to a real cross-entity search endpoint.
- **Refresh-token flow** if longer-lived sessions with revocation become a requirement (the current access-token-only model is a documented, deliberate simplification).
- **Notifications** backing the bell icon.
- **Soft-delete + audit for user management**, plus the `onDelete` decisions from Month 1.

### Data & compliance
- **Database backups + migration rollback runbook.**
- **PII handling review** (leads contain names/emails/phones) — retention policy, export/delete for data-subject requests.

**Exit criteria for Quarter 1:** stats computed in-DB, client/server contracts type-safe by construction, backup/restore proven, the app comfortable at 10–100× current data volume.

---

## Sequencing rationale

1. **Security & requirements before polish** — an unthrottled login is worse than an ugly button.
2. **Automation before process** — CI in Month 1 makes every later standard self-enforcing (see Engineering Standards → *Driving Adoption*).
3. **Measure before optimizing at scale** — the Quarter-1 performance work is gated on real data-volume signals, not speculation. The dashboard over-fetch, for instance, is perfectly fine at today's scale and is only scheduled for replacement when lead counts justify it.
4. **Every step ships independently** — there is no point where the app is half-migrated and broken.
