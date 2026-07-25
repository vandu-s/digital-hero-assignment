# Engineering Standards — Lead Management CRM

**Status:** Active
**Applies to:** `client/` (React 18 + TypeScript + Vite + MUI + Redux Toolkit) and `server/` (Node + Express + TypeScript + Prisma + PostgreSQL)
**Last reviewed:** 2026-07-25

This document codifies how we build, review, ship, and operate this codebase. It is deliberately grounded in patterns that **already exist here** — the layered backend, the `AppError` + centralized error handler, the Zod-validated `env.ts`, the `{ success, data }` / `{ success, error }` envelope — rather than generic advice. Rules are written so the *right* thing is also the *easy* thing.

> **The Golden Rule of this repo:** each layer has exactly one job. `Route → Middleware → Controller → Service → Repository`. Most standards below trace back to protecting that boundary.

---

## 1. Git Workflow

This repository has **no git history yet**. Initialize it before the next change lands, and adopt **GitHub Flow** (a `main`-centric, single-long-lived-branch model with short-lived feature branches and PRs).

| Rule | Rationale |
|------|-----------|
| Run `git init`, commit the current tree as the baseline, push to a private remote. | Nothing is recoverable or reviewable until history exists. |
| `main` is always deployable. Every change reaches `main` through a PR — no direct pushes. | Render deploys from `main`; an un-reviewed push is a production push. |
| Protect `main`: require PR, passing CI, and at least one approval. | Makes the safe path the only path. |
| Prefer **squash-merge**. | Keeps `main` history one-commit-per-change and readable; local WIP noise stays local. |

We choose GitHub Flow over trunk-based-with-flags because the team is small and there are no feature flags today; short-lived branches give us review gates without the flag infrastructure.

---

## 2. Branching

Branches are **short-lived** (target < 2 days, ideally merged the day they're opened) and named `type/short-description`:

| Prefix | Use for |
|--------|---------|
| `feature/` | New capability (`feature/lead-bulk-assign`) |
| `fix/` | Bug fix (`fix/member-cannot-reassign`) |
| `chore/` | Tooling, deps, config, no behavior change (`chore/add-eslint-ci`) |
| `docs/` | Documentation only |

- Rebase on `main` before opening the PR; resolve conflicts on your branch, never on `main`.
- Delete the branch after merge (auto-delete on merge is fine).

*Rationale:* short-lived, consistently-named branches keep merge conflicts small and make the branch list self-documenting.

---

## 3. PR Reviews

| Rule | Rationale |
|------|-----------|
| Target **< 400 lines of diff**. Split larger work (e.g. schema migration, then service, then UI). | Reviews degrade sharply past ~400 lines; small PRs get real review, not rubber-stamps. |
| **1 approval required** to merge; 2 for schema/migration or auth changes. | Auth and DB shape are the highest-blast-radius areas of this app. |
| PR description states *what changed and why*, and links the issue/task. | The diff shows what; the reviewer needs why. |
| CI (typecheck + lint + test + build) must be green before review is requested. | Reviewers spend attention on design, not on catching red builds. |
| The author self-reviews the diff first. | Catches the obvious before a second person's time is spent. |

**Every reviewer explicitly confirms the layering rule (§ the Golden Rule):** no business logic in controllers, no `req`/`res` in services, no Prisma calls outside repositories. A PR that moves a Prisma query into a controller is a blocking comment regardless of whether it "works."

---

## 4. Testing

Our test bar is **integration tests with Jest + Supertest against a real PostgreSQL database, no mocking** — matching the existing suite in `server/tests/` (`auth`, `lead`, `leadList`, `note`, `user`, `health` — 46 passing tests). This is the primary safety net because it exercises Route → Controller → Service → Repository → DB as a unit, which is where our bugs actually live.

| Rule | Rationale |
|------|-----------|
| Every new endpoint ships with Supertest coverage of the happy path **and** the authorization edges (e.g. member cannot see/reassign another user's lead — see `getLeadById` returning 404, not 403). | Our security model *is* role-scoping; untested authz is unshipped authz. |
| Add **unit tests** only for logic that is hard to reach through the API: pure helpers like `sanitizeUser`, `buildScopedWhere` edge cases, date/format utils, JWT helpers. | Integration covers flows; units cover branchy pure functions cheaply. |
| Test **data isolation** must improve. Today tests share a seeded DB — this is a known debt. New test files must create and tear down their own fixtures (via a `tests/helpers/` factory), not lean on seed rows. Target: each test file runnable in isolation. | Shared seed state makes tests order-dependent and flaky as the suite grows. |
| Coverage: **no hard % gate yet**; the gate is "new code paths are exercised." Introduce a coverage *report* in CI first, ratchet a floor later. | A premature % target invents busywork tests; visibility first, enforcement second. |
| Run `jest --runInBand` (already the `test` script). | Serial runs avoid parallel workers racing on the shared DB. |

---

## 5. CI/CD

Add **GitHub Actions** (none exists yet). Two workflows:

**On every PR** — `ci.yml`:
1. `npm ci` at the workspace root
2. Typecheck: `tsc --noEmit` in both workspaces
3. Lint: `npm run lint --workspace=server` (and client once configured)
4. Test: spin up a Postgres service container, run migrations + seed, `npm run test --workspace=server`
5. Build: `npm run build` in both workspaces

**On push to `main`** — deploy. `render.yaml` already defines the full blueprint (Postgres + API web service + static client), and the API build command runs `prisma migrate deploy`. Wire Render's auto-deploy to `main`, or trigger via deploy hook after CI passes.

| Rule | Rationale |
|------|-----------|
| A PR cannot merge with a red pipeline. | The pipeline is the standard; if it's advisory, it's ignored. |
| Migrations run in CI against a throwaway DB before they ever run on Render. | Catches a broken migration in CI, not in a production deploy. |
| Secrets live in GitHub Actions secrets / Render env, never in the workflow YAML. | Same secret-hygiene rule as §14, enforced in the pipeline. |

---

## 6. Code Review Checklist

A reviewer works through this list before approving:

- [ ] **Layering respected** — no Prisma outside repositories, no business rules in controllers, no `req`/`res` in services.
- [ ] **Errors thrown, not returned** — services/controllers `throw AppError.*(...)`; nobody hand-rolls `res.status().json({ error })` (§13).
- [ ] **Response envelope** — success returns `{ success: true, data }`; the error handler owns `{ success: false, error }`.
- [ ] **Input validated at the edge** — a Zod schema (`*.schema.ts`) guards the route via the validate middleware; the service trusts its typed input.
- [ ] **Authorization checked in the service** — role scoping applied (admin-vs-member), and "can't see it" returns **404, not 403**, to avoid existence leaks.
- [ ] **Tests included** — happy path + authz edge (§4).
- [ ] **No secrets, tokens, or PII** in code, logs, or fixtures.
- [ ] **`sanitizeUser`** applied anywhere a user object crosses the API boundary — `passwordHash` never leaves the server.
- [ ] **New env var?** Added to Zod `env.ts` schema **and** `.env.example` **and** `render.yaml` (§14).
- [ ] **Client uses `apiClient`** — no bare `axios`/`fetch`; the shared instance carries the JWT and 401 handling.
- [ ] **UI uses theme tokens** — colors/spacing from `theme/index.ts` and `brand`, not hardcoded hex.
- [ ] **Comments explain *why*** where non-obvious (§7).

---

## 7. Documentation

| Artifact | Standard |
|----------|----------|
| `README.md` | Stays the source of truth for architecture, stack, folder structure, setup, and the layering table. Update it in the same PR that changes any of these. |
| `docs/` | Longer-form docs (`ASSESSMENT.md`, this file, ADRs). Design decisions with lasting consequences (why UUIDs, why a `System` user, why 404-not-403) get a short ADR. |
| Code comments | **Explain *why*, not *what*.** Match the existing house style — see `app.ts` ("Deliberately does NOT call app.listen()… lets Supertest import `app`…"), `apiClient.ts` (why a DOM event decouples Axios from the router), and `lead.service.ts` (why public lead creation is a separate function, not a flag). |

*Rationale:* the code already says what it does; comments buy their keep only by capturing the reasoning a future reader can't reconstruct from the diff.

---

## 8. Folder Structure

The existing layout is the standard — new files go in the layer that owns their job. Do not invent parallel structures.

**`server/src/`**

| Dir | Owns | Never contains |
|-----|------|----------------|
| `config/` | Zod-validated `env`, Prisma client singleton | request logic |
| `routes/` | URL → controller mapping, per-route middleware | business logic |
| `middleware/` | authenticate, authorize, validate, `errorHandler`, `rateLimiter` | DB access |
| `controllers/` | HTTP in/out shape only | business rules |
| `services/` | business rules, role scoping, activity logging | `req`/`res`, raw Prisma |
| `repositories/` | Prisma queries only | business rules |
| `validators/` | Zod schemas (`*.schema.ts`) | — |
| `utils/` | `AppError`, `asyncHandler`, `jwt`, `password`, `sanitizeUser` | — |

**`client/src/`:** `components/` (reusable UI), `layouts/`, `pages/` (route screens), `features/` (Redux slices), `services/` (Axios + API functions), `hooks/` (typed Redux), `types/`, `utils/`, `routes/` (`ProtectedRoute`, `RoleRoute`), `theme/`, `store/`.

*Rationale:* a predictable home for every kind of code means "where does this go?" is never a debate, and the folder itself enforces the layering.

---

## 9. Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| Zod schema files | `*.schema.ts`, in `validators/` | `lead.schema.ts` |
| Repository files | `*.repository.ts` | `lead.repository.ts` |
| Service files | `*.service.ts` | `lead.service.ts` |
| Controller files | `*.controller.ts` | `lead.controller.ts` |
| Route files | `*.routes.ts` | `lead.routes.ts` |
| React components | `PascalCase.tsx`, one component per file | `StatusChip.tsx` |
| Hooks | `useCamelCase.ts` | `useAppSelector.ts` |
| Variables / functions | `camelCase`; booleans read as predicates | `isAssigned`, `assertAssigneeExists` |
| Types / interfaces / enums | `PascalCase` | `LeadStatus`, `RequestingUser` |
| DB tables | Prisma model `PascalCase`, mapped to `snake_case` plural via `@@map` | `Lead` → `leads` |
| Error codes | `SCREAMING_SNAKE_CASE`, stable + machine-readable | `LEAD_NOT_FOUND`, `ASSIGN_FORBIDDEN` |

*Rationale:* the file suffix tells you the layer at a glance; consistent codes let the client branch on `error.code` without string-matching messages.

---

## 10. Logging

Today: `morgan` for HTTP access logs (`dev` locally, `combined` otherwise) and `console.error(err)` for unexpected errors in the error handler.

| Rule | Rationale |
|------|-----------|
| Move to **structured JSON logging** (e.g. `pino`) with a request-scoped logger; keep `morgan` piped through it or replace with `pino-http`. | JSON logs are queryable in Render/aggregators; free-text `console` is not. |
| **Never log secrets or PII** — no `passwordHash`, JWTs, raw request bodies with credentials, or full lead PII dumps. | A log line is a copy of the data outside our access controls. |
| Log at boundaries: unexpected 500s with a correlation id (the error handler is the right place), not scattered `console.log`. | One consistent choke point; no debug noise leaking to production. |
| Keep the existing "don't leak internals to the client" rule — full detail server-side, generic message to the client outside `development`. | Already implemented in `errorHandler.ts`; preserve it. |

---

## 11. Monitoring

| Concern | Standard |
|---------|----------|
| **Health** | The `GET /api/v1/health` endpoint already returns `{ success: true, data: { status: "ok" } }`. Point an uptime monitor (Render's own, UptimeRobot, or Better Stack) at it; alert on non-200. |
| **Error tracking** | Add **Sentry** (or equivalent) to both API and client. The centralized `errorHandler` is the single natural hook for server-side capture — report there *before* returning the generic 500. |
| **Deploy visibility** | Notify a channel on Render deploy success/failure. |
| **DB** | Watch Render Postgres connection count and disk (free plan limits are easy to hit). |

*Rationale:* we already have a health endpoint and a single error choke point — monitoring is mostly *wiring up what exists*, not new architecture.

---

## 12. Security

Most of these are **already in place**; this section makes them non-negotiable, not aspirational.

| Control | Standard |
|---------|----------|
| Passwords | bcrypt hashing (`BCRYPT_SALT_ROUNDS`, default 10). Plaintext passwords never stored, logged, or returned. |
| Authorization | Enforced **server-side in services** via role scoping — never trust the client. Members are scoped to their own leads; "not yours" returns 404. |
| Input validation | Every mutating/query route validated by a Zod `*.schema.ts` at the middleware edge before the controller runs. |
| Response hygiene | `sanitizeUser` strips `passwordHash` from every user object leaving the API. |
| Rate limiting | `express-rate-limit`: a broad `apiLimiter` on `/api/v1`, tighter limits on auth/public routes. |
| Transport & headers | `helmet()` on; `cors` locked to `env.CLIENT_ORIGIN` with credentials; JSON body capped at `100kb`; `trust proxy` set for correct client IPs behind Render. |
| Secrets | JWT signed with `JWT_SECRET` from validated env; `generateValue: true` on Render so prod secrets are never authored by hand. |
| Existence leaks | Prefer 404 over 403 where revealing existence is itself a leak (the `getLeadById` pattern). |

New endpoints inherit **all** of the above by default — validate, authorize in the service, sanitize the response.

---

## 13. Error Handling

We have exactly one error contract. Codify it:

- **Throw, don't return.** Services and controllers `throw AppError.badRequest(...)` / `.notFound(...)` / `.forbidden(...)` / `.conflict(...)` / `.unauthorized(...)`. **A service must never call `res.json(...)` to signal an error** — it doesn't know about `res`, and hand-rolled error responses bypass the envelope.
- **`asyncHandler` wraps async controllers** so thrown/rejected errors reach Express's error path instead of hanging the request.
- **The centralized `errorHandler` is the only place that formats errors.** It maps `AppError` → its `statusCode` + `code`, `ZodError` → 400 `VALIDATION_ERROR` with field details, and anything else → 500 `INTERNAL_ERROR` (logged in full server-side, generic to the client outside `development`). It is registered **last** in `app.ts`.
- **New error conditions get a stable `code`** and, if a new HTTP status is needed, a new `AppError` static factory — not an inline `new AppError(msg, 402, "...")` scattered around.

*Rationale:* one throw-and-format path means every error the client sees has the same shape and a stable `code` to branch on — no endpoint invents its own error format.

---

## 14. Environment Variables

The pattern is set by `server/src/config/env.ts`: `process.env` is parsed **once at boot** through a Zod schema, and the app fails fast on anything missing or malformed. Nothing else reads `process.env` directly.

| Rule | Rationale |
|------|-----------|
| All server config flows through `env.ts`. Adding a var means adding it to the Zod schema. | Fail-fast at boot beats a `undefined` crashing deep in a request. |
| **`.env.example` stays in sync** with the schema — every var present, with a placeholder, never a real value. | It's the onboarding contract; a stale example means a broken first run. |
| A new prod var is also added to **`render.yaml`** (`value`, `fromDatabase`, or `generateValue`). | The blueprint is the deploy's source of truth. |
| **Secrets are never committed.** `.env` is gitignored; prod secrets come from Render (`generateValue`/dashboard) and CI from GitHub secrets. | One leaked commit = rotate everything. |
| Client vars are `VITE_`-prefixed and **assumed public** (they ship in the bundle) — never put a secret in one. | `VITE_API_BASE_URL` is fine; a key in a `VITE_` var is exposed to every browser. |

---

## 15. Dependency Updates

| Rule | Rationale |
|------|-----------|
| Enable **Dependabot** (or Renovate) grouped, **weekly** PRs — one for dev deps, one for prod deps, plus GitHub Actions. | Small, regular bumps beat a once-a-year, high-risk mega-upgrade. |
| **Patch/minor:** merge once CI is green. **Major:** manual review, its own PR, read the changelog (esp. Prisma, Express, React, MUI, Zod). | Majors carry breaking changes; CI green is necessary but not sufficient. |
| **`npm audit`** runs in CI. Posture: **fix high/critical before merge**; triage moderate; don't block on unfixable transitive lows. | Zero-tolerance on lows generates noise and audit fatigue; focus force where it matters. |
| Prisma client/CLI versions upgrade **together**, and a migration+seed dry-run passes in CI first. | Mismatched Prisma versions and un-tested migrations are our two most likely upgrade breakages. |
| Lockfile (`package-lock.json`) is committed; CI uses `npm ci`. | Reproducible installs; the lockfile is the build's source of truth. |

---

## Driving Adoption on a Resistant Team

A standards document that lives only as a document gets skimmed once and forgotten. Getting a skeptical, busy team to actually adopt these is a change-management problem, not a writing problem. Here's a realistic playbook — the goal throughout is to make the standard the path of *least* resistance, so following it is easier than not.

**1. Automate first, document second.** People don't read docs; they respond to feedback loops. Before evangelizing §9 naming or §13 error handling, land the *mechanical* enforcement:
- ESLint + Prettier with a shared config, wired into a **pre-commit hook** (Husky + lint-staged) so formatting and lint fixes happen automatically — no one argues about semicolons in review again.
- The **CI pipeline (§5)** as the gatekeeper: typecheck, test, build. Once a red pipeline blocks merge, "we test our endpoints" stops being a plea and becomes physics.
- A **PR template** with the §6 checklist baked in, so the checklist rides along on every PR for free.

When the tool gives the feedback, the standard stops feeling like *a colleague nagging you* and starts feeling like *the build being red* — impersonal, consistent, and not worth arguing with.

**2. Lead by example in your own PRs.** Don't announce the standards and wait. Ship your next three PRs *visibly* following them — small diffs, tests included, `AppError` thrown not returned, a one-line "why" comment where it earns its place. A good PR is a more persuasive spec than a wiki page. When someone asks "why is this a separate service function?", you've got `createPublicLead` as a real, in-repo answer.

**3. Introduce incrementally, never all at once.** Fifteen sections dropped on a team at once reads as "everything you do is now wrong." Sequence it:
- Week 1: git init + branch protection + CI green-check. (Invisible to daily work, huge safety gain.)
- Week 2: linter + pre-commit hook. (Removes a whole category of review nitpicks.)
- Week 3: the error-handling and layering rules, because CI now gives you room to talk about design.
- Later: coverage reporting, Sentry, Dependabot.

Each step should make the *next* step's problem more obvious, so the team pulls the standard in rather than having it pushed.

**4. Tie every rule to a pain they already feel.** Nobody adopts an abstract "best practice"; everybody fixes a thing that bit them.
- Test-data isolation (§4) → "remember when the suite passed locally and failed in CI because of test order? That's the shared seed DB."
- `AppError` everywhere (§13) → "the frontend keeps breaking because two endpoints return errors in different shapes."
- Zod `env.ts` + `.env.example` sync (§14) → "the new contributor lost a morning to a missing env var that crashed mid-request."

Frame each standard as *the fix for a specific scar*, and it sells itself.

**5. Make reviews about the code, not the person.** The fastest way to kill a review culture is to let it feel like personal criticism. Norms:
- Review the diff, not the author — "this Prisma call is in the controller" not "you put a Prisma call in the controller."
- The automated checks catch style, so humans spend their comments on design and intent — the high-value stuff.
- Use suggestion commits for small fixes instead of a paragraph of instructions.
- Praise good patterns in review, not just flag bad ones.

**6. Measure and show the wins.** Skeptics convert on evidence, not exhortation. After a month, put up simple before/after numbers: PR review time, count of production 500s, CI catch rate, time-to-onboard the last new dev. "Bugs caught in CI instead of prod went from 0 to N this month" ends the "this is just process overhead" argument better than any principle.

**7. Recruit one respected senior engineer as champion.** Standards adopted top-down get complied with; standards a trusted peer vouches for get *believed*. Find the engineer whose reviews people already respect, get their fingerprints on this document, and let them be the one who says "yeah, throwing `AppError` is just how we do it here" in a review. Their buy-in is worth more than a mandate.

**The throughline:** don't ask the team to be more disciplined — make the disciplined path the easy one. Automate what can be automated, sequence the rest, tie each rule to a real scar, and let a respected peer carry the flag. Standards that reduce friction get adopted; standards that only add rules get resented.
