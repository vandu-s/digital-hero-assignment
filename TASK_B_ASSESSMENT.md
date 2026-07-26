# Task B — Engineering Assessment

**Reviewer:** Senior Staff Engineer (inherited-codebase review)
**Date:** 2026-07-26
**Commit assessed:** `b20db88`
**Scope:** Full stack — `client/` (React 18 + Vite + TS + MUI + RTK) and `server/` (Express + TS + Prisma + PostgreSQL)

---

## Executive summary

This is a **well-built codebase**, materially above the median for a project of this size. The backend enforces a genuine Route → Middleware → Controller → Service → Repository layering, and that discipline holds consistently — I could not find business logic leaking into controllers, nor Prisma calls leaking outside repositories. Validation is centralised in Zod schemas, errors flow through one handler, and 96 automated tests pass (73 backend, 23 frontend).

Because the fundamentals are sound, this assessment does **not** recommend restructuring. The issues below are concentrated in three areas:

1. **Data integrity** — multi-step writes are not transactional (3 services affected).
2. **A correctness bug** — dashboard KPIs silently under-report above 100 leads.
3. **Operational maturity** — no CI, no index on the default sort column, seed runs on every production deploy.

Notably, several things commonly wrong in projects like this are **correct here**, and I verified each rather than assuming: no secrets committed, no SQL injection surface (Prisma parameterises; `sortBy`/`order` are Zod enums, so column names cannot be injected), no missing authorization on any route, no `dangerouslySetInnerHTML`, password hashes never serialised, and IDOR correctly returns 404-not-403 so members cannot enumerate leads they cannot access.

**Issue count:** 14 — 2 Critical, 4 High, 5 Medium, 3 Low.

---

## Verification method

Every finding below was confirmed against running code, not inferred from reading. Specifically I:

- booted the API and exercised endpoints with `curl` (auth, pagination, filters, validation rejection);
- ran `EXPLAIN` against PostgreSQL to confirm the missing-index claim;
- checked Express 4's synchronous-throw handling before discarding a suspected error-handling bug;
- grepped for hardcoded secrets, `$transaction` usage, and duplicated patterns, and counted occurrences.

Where I could not verify something, I say so explicitly rather than asserting it.

---

# Critical

## C-1 — Multi-step writes are not wrapped in transactions

### Problem
Creating a lead performs two or three separate database writes with no transaction: the `Lead` row, then a `CREATED` activity, then optionally an `ASSIGNED` activity. If the process dies or the DB connection drops between them, the lead exists with no audit trail. The same shape appears when updating a lead (row update, then `STATUS_CHANGED` / `ASSIGNED` activity) and when creating a note (note row, then `NOTE_ADDED` activity).

`prisma.$transaction` is used exactly once in the entire server — in `countUserReferences`, for reads. Not one write path uses it.

### Location
- `server/src/services/lead.service.ts` — `createLead` (~line 130), `updateLead` (~line 200), `createPublicLead` (~line 175)
- `server/src/services/note.service.ts` — `createNote`
- `server/src/repositories/user.repository.ts:74` — the only `$transaction`, and it is read-only

### Why this is a problem
The `Activity` table is described in `schema.prisma` as the single append-only source of truth for the Lead Details timeline and status history. A partial write breaks that guarantee permanently and silently — there is no reconciliation job, and nothing surfaces the inconsistency. For a CRM, "who changed this lead's status and when" is often the audit answer that matters most in a dispute. Corrupted audit data is worse than absent audit data because it is trusted.

This is the most likely of all listed issues to cause real, unrecoverable data damage.

### Risk
**Critical**

### Recommendation
Wrap each write-plus-activity sequence in `prisma.$transaction`. The repository functions already accept plain Prisma arguments, so the change is mechanical: pass a transaction client through, or move the composite operation into a repository function that opens its own transaction. Prefer an interactive transaction (`prisma.$transaction(async (tx) => { ... })`) so the existing sequential logic survives largely intact.

Do `createNote` first — it is the smallest of the three and validates the pattern before touching the busier lead paths.

### Estimated effort
**Medium**

---

## C-2 — Dashboard KPIs are wrong above 100 leads

### Problem
`DashboardPage` fetches a **sample** of leads and derives every KPI from it client-side:

```ts
const DASHBOARD_LEAD_SAMPLE_SIZE = 100;
listLeads({ limit: DASHBOARD_LEAD_SAMPLE_SIZE, sortBy: "createdAt", order: "desc" })
```

All seven KPI cards, the status donut, and the leads-over-time chart are computed from those rows. Past 100 leads, every number on the dashboard is wrong — it reports the composition of the 100 most recent leads while presenting them as totals.

This cannot be fixed by raising the constant: `listLeadsQuerySchema` caps `limit` at `.max(100)`, and I confirmed `?limit=500` returns HTTP 400. There is no `/stats` endpoint — I checked; the dashboard has no other data source available to it.

### Location
- `client/src/pages/Dashboard/DashboardPage.tsx:39` (the constant), `:55` (the fetch), `:73–96` (`statusCounts`, `createdDates` derivation)
- `server/src/validators/lead.schema.ts:72` — the `.max(100)` ceiling that makes it unfixable client-side
- Consumers: `client/src/components/LeadsStatusDonut.tsx`, `client/src/components/LeadsOverTimeChart.tsx`

### Why this is a problem
Silent wrongness is the worst failure mode. Nothing errors, no console warning appears, and the dashboard looks entirely healthy — a user reads "12 Won" and makes a decision on it while the real figure is higher. A CRM dashboard exists to be trusted for exactly this, and 100 leads is a threshold a real deployment crosses in weeks.

The same sampling also skews the "leads over time" chart, which will show a truncated window that shrinks as volume grows.

### Risk
**Critical** — not for security or stability, but for correctness of the product's headline feature.

### Recommendation
Add `GET /api/v1/leads/stats` returning aggregates computed in the database — `groupBy` on `status` for the counts, plus a date-bucketed count for the chart. Apply the same role scoping `buildScopedWhere` already implements so a MEMBER's dashboard keeps reflecting only their leads. Then have `DashboardPage` call it and delete the sampling constant.

This is more work than raising a limit, but aggregation in SQL is both correct and faster than shipping rows to the browser to count them. Keep `latestLeads` as a separate small `limit: 5` fetch — that one is legitimately a "most recent" list.

### Estimated effort
**Medium**

---

# High

## H-1 — `leads.createdAt` is the default sort column but has no index

### Problem
Every leads list request sorts by `createdAt` unless told otherwise (`sortBy` defaults to `"createdAt"`, `order` to `"desc"`), and the dashboard sorts by it explicitly. The `Lead` model indexes `status` and `assignedToId` but not `createdAt`.

Verified with a query plan against the live database:

```
EXPLAIN SELECT * FROM leads ORDER BY "createdAt" DESC LIMIT 10;
 Limit
   ->  Sort  (Sort Key: "createdAt" DESC)
         ->  Seq Scan on leads
```

A sequential scan plus an in-memory sort — on the single most-executed query in the application.

### Location
- `server/prisma/schema.prisma:71–72` — has `@@index([status])`, `@@index([assignedToId])`, missing `createdAt`
- Query built in `server/src/repositories/lead.repository.ts:23` (`findLeads`)
- Default set in `server/src/validators/lead.schema.ts:81–82`

### Why this is a problem
At 14 rows this is free; the planner is right to seq-scan. The concern is trajectory: sort cost grows superlinearly relative to an index scan, and this query runs on every page load of the main screen and the dashboard. The `createdFrom`/`createdTo` range filter hits the same unindexed column. This is the classic issue that is invisible in development and becomes a production incident at scale.

### Risk
**High**

### Recommendation
Add `@@index([createdAt])` to the `Lead` model and migrate. Once list traffic patterns are known, consider composite indexes matching the actual filter-plus-sort combinations (e.g. `@@index([status, createdAt])`) — but add the single-column index now, since it is a one-line, zero-risk change that helps the default path immediately.

### Estimated effort
**Small**

---

## H-2 — Database seed runs on every production deploy

### Problem
The API build command ends with `npm run prisma:seed`:

```
npm ci --include=dev && ... && npm run prisma:deploy --workspace=server && npm run prisma:seed --workspace=server
```

So every deploy writes seed data — including well-known credentials `admin@crm.test` / `Password123!` and `jane@crm.test` / `Password123!` — into the production database.

### Location
- `render.yaml:26` (API `buildCommand`)
- `server/prisma/seed.ts` — the seeded accounts and password

### Why this is a problem
Two distinct problems.

**Security:** production contains accounts whose credentials are in the repository, in the README, and in the seed file. `admin@crm.test` is an ADMIN. Anyone who reads the public repo has working admin credentials for the live deployment. This is the single most exploitable issue in this assessment.

**Practice:** a build step that mutates production data is the wrong shape regardless of idempotency. `seed.ts` does use `upsert` throughout, so it will not duplicate rows or clobber a changed password — that is why this is High and not Critical — but the coupling means a future non-idempotent edit to the seed silently becomes a production migration.

Context, stated plainly: this was added deliberately (by me, earlier in this project's history) to work around Render's free tier gating shell access, and it was the right call to get the app running. It is not the right call to leave in place.

### Risk
**High**

### Recommendation
Two steps, in order:

1. **Immediately:** change the password of `admin@crm.test` on the live deployment, or delete the account and create a real admin. Do this before anything else in this document.
2. **Then:** remove `&& npm run prisma:seed --workspace=server` from `render.yaml`. Seed via a Render One-Off Job when a fresh environment genuinely needs it.

For a demo or interview deployment, keeping seeded accounts is defensible — but then they should not be ADMIN, and the credentials should not also be the documented login. State the tradeoff explicitly rather than leaving it implicit.

### Estimated effort
**Small**

---

## H-3 — No CI pipeline

### Problem
There is no `.github/workflows/` directory and no CI configuration anywhere. The project has 96 passing tests, ESLint, Prettier, and TypeScript strict mode — and nothing runs any of them automatically. Every gate depends on a human remembering.

### Location
Repository root — absent `.github/workflows/`

### Why this is a problem
Untriggered quality gates decay. The tests here are genuinely good (integration-level, real database, covering authorization boundaries), which makes this more wasteful than if they were weak — the value is already built and simply not being collected. Render auto-deploys on push to `main`, so today a commit that breaks all 73 backend tests deploys to production with no signal.

Deployment history bears this out: three consecutive production deploys failed on errors a CI run would have caught before push.

### Risk
**High**

### Recommendation
Add a GitHub Actions workflow on pull requests and pushes to `main`: install, `prisma generate`, `lint`, `format:check`, `test` for both workspaces, and both builds. Use a `postgres` service container for the backend integration tests. Once green, enable branch protection on `main` requiring the check to pass.

The workflow can mirror the exact command sequence in `render.yaml`, which has the additional benefit of catching deploy-time build failures at PR time.

### Estimated effort
**Small**

---

## H-4 — JWT in `localStorage` with no Content-Security-Policy

### Problem
The access token is stored in `localStorage` or `sessionStorage` (`tokenStorage.ts`), making it readable by any JavaScript executing on the origin. The app ships no Content-Security-Policy for the served frontend — `helmet()` runs with defaults on the API, but the client is a static site served by Render and has no CSP meta tag or header configured.

### Location
- `client/src/utils/tokenStorage.ts` — the storage choice
- `client/index.html` — no CSP meta tag
- `server/src/app.ts:24` — `helmet()` protects API responses, not the separately-hosted static client

### Why this is a problem
`localStorage` tokens are exfiltratable via any XSS. I found no XSS vector in the current code — no `dangerouslySetInnerHTML`, no `eval`, React escapes by default, and the one user-controlled block (`message` on the lead details page) renders as escaped text — so this is exposure, not an active vulnerability. But it means any future XSS escalates directly to full account takeover, including admin. Defence in depth is the point: the token store and the CSP are two independent mitigations and currently neither is in place.

An httpOnly cookie would be the stronger design; `tokenStorage.ts` is explicitly written as a single choke point to make that migration cheap, which is good foresight. It is a real change though — it needs CSRF protection alongside it, since cookies are sent automatically.

### Risk
**High**

### Recommendation
Do the cheap half now and the expensive half deliberately:

- **Now:** add a CSP to the static client. Render supports response headers per static site; a restrictive `default-src 'self'` with explicit allowances is enough to blunt injected-script exfiltration.
- **Later, if this becomes a real product:** migrate to httpOnly, `Secure`, `SameSite=Strict` cookies plus CSRF tokens. Do not do this casually — it touches login, refresh, logout, and the Axios client together.

### Estimated effort
**Small** for CSP · **Large** for the cookie migration

---

# Medium

## M-1 — Weak password policy

### Problem
The only password rule is a minimum length of 8 characters (`z.string().min(8)`). There is no complexity requirement, no check against common passwords, and no breach-list lookup. `password` accepts `"password"` and `"12345678"`.

### Location
- `server/src/validators/auth.schema.ts:12` (register)
- `server/src/validators/user.schema.ts:14` (admin-created accounts)
- `client/src/pages/Users/UsersPage.tsx:136` — mirrors the same rule client-side

### Why this is a problem
Admin-created accounts get a temporary password chosen by an admin and there is no forced rotation on first login, so a weak temporary password can persist indefinitely on an account that may be ADMIN. bcrypt at 10 rounds makes offline cracking slow, and `authLimiter` (20 attempts / 15 min) blunts online guessing — so this is a real weakness, not an open door.

### Risk
**Medium**

### Recommendation
Raise the floor to 12 characters and reject the top few thousand common passwords (a small bundled list, or `zxcvbn` for strength scoring). Keep the client and server rules in one shared constant so they cannot drift — they are currently duplicated as separate literals. Add a `mustChangePassword` flag for admin-created accounts if account provisioning becomes a real workflow.

### Estimated effort
**Small**

---

## M-2 — Two page components are too large and hold too much state

### Problem
`LeadsListPage.tsx` is 513 lines with 17 `useState` calls. `UsersPage.tsx` is 463 lines with 19. Each mixes data fetching, filter state, pagination state, dialog state, mutation handlers, and full presentational markup in one function component.

### Location
- `client/src/pages/Leads/LeadsListPage.tsx` (513 lines)
- `client/src/pages/Users/UsersPage.tsx` (463 lines)

### Why this is a problem
State this dense is where race conditions and stale-closure bugs breed, and it makes the components effectively untestable in units — you can only test them end-to-end through the whole page. Both files implement the same conceptual thing (a filtered, paginated, server-driven table with row mutations) via entirely separate code, so a fix to paging or debounce logic has to be made twice and can silently diverge.

This is maintainability drag rather than a defect — both pages work correctly today, and I verified the Users page behaves correctly in a browser.

### Risk
**Medium**

### Recommendation
Extract the repeated mechanics into hooks rather than restructuring the components wholesale:

- `useServerTable({ fetcher, initialFilters })` owning page / rowsPerPage / total / filters / debounce / reload — both pages consume it.
- Lift the create and delete dialogs into their own components (`CreateUserDialog`, `ConfirmDeleteDialog`), which also makes them independently testable.

Do this incrementally, one page at a time, with the existing tests as the safety net. See `TASK_B_REFACTOR.md` for a worked example on `UsersPage`.

### Estimated effort
**Medium**

---

## M-3 — Server state is refetched per page with no caching or cancellation

### Problem
Redux holds only auth state; all server data lives in per-component `useState` and is refetched on mount. Navigating Leads → Details → back re-fetches the list from scratch. The assignee dropdown calls `listUsers()` from five separate places (`CreateLeadPage`, `EditLeadPage`, `LeadDetailsPage`, `LeadsListPage`, and previously `UsersPage`), each maintaining its own copy.

Only `DashboardPage` guards against the unmount race, via an `active` flag. The other fetches do not, so a fast navigation away can call `setState` on an unmounted component or apply a stale response.

### Location
- `client/src/pages/Leads/LeadsListPage.tsx`, `LeadDetailsPage.tsx`, `EditLeadPage.tsx`, `CreateLeadPage.tsx`
- `client/src/pages/Users/UsersPage.tsx`
- `client/src/pages/Dashboard/DashboardPage.tsx:51–70` — the one place doing it correctly

### Why this is a problem
Redundant network traffic on every navigation, a visible loading flash where cached data would do, and a latent stale-response race on rapid filter changes. The debounce on search reduces but does not eliminate the race — a slow first request can still resolve after a fast second one and overwrite it.

### Risk
**Medium**

### Recommendation
Adopt a server-state library — **TanStack Query** or **RTK Query** (the latter is already a transitive dependency via Redux Toolkit, so it adds no new package). Either gives caching, deduplication, and automatic cancellation, and would delete a meaningful amount of the `useState`/`useEffect` boilerplate flagged in M-2.

Migrate one route first (Users is the smallest) rather than converting everything at once.

### Estimated effort
**Medium**

---

## M-4 — Duplicated API-error message extraction

### Problem
This exact shape is repeated verbatim to dig a message out of an Axios error:

```ts
(err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
  ?.message ?? "Couldn't create that user. Please try again."
```

Two occurrences in `UsersPage.tsx` alone, and the same nested-optional pattern recurs in other pages' catch blocks with different fallback strings.

### Location
- `client/src/pages/Users/UsersPage.tsx:~150`, `~172`
- Similar shapes in `client/src/pages/Leads/` mutation handlers

### Why this is a problem
The inline cast duplicates knowledge of the API's error envelope in every call site. The envelope is already defined once in `client/src/types/api.ts` — so this is both duplication and a type assertion that bypasses the type that exists. If the envelope ever changes, these casts keep compiling and silently fall through to the generic fallback.

### Risk
**Medium**

### Recommendation
Add `getApiErrorMessage(err: unknown, fallback: string): string` in `client/src/utils/`, typed against the existing `ApiError` shape, and replace every call site. Small, mechanical, and removes the casts.

### Estimated effort
**Small**

---

## M-5 — No test coverage thresholds, and untested areas concentrated in the frontend

### Problem
The backend has 73 integration tests and covers authorization boundaries well. The frontend has 23 tests, and they cover validation helpers, `StatusChip`, the login page, the public form, and route guards — but **not** the two largest and most stateful components (`LeadsListPage`, `UsersPage`), nor the new users pagination UI. `client/vite.config.ts` configures a coverage reporter but sets no thresholds; the backend Jest config sets none either.

### Location
- `client/vite.config.ts:21` — coverage configured, no thresholds
- `server/jest.config.js` — no `coverageThreshold`
- Untested: `client/src/pages/Leads/LeadsListPage.tsx`, `client/src/pages/Users/UsersPage.tsx`, `client/src/components/LeadsOverTimeChart.tsx`, `LeadsStatusDonut.tsx`

### Why this is a problem
The untested components are exactly the ones flagged in M-2 as most complex — coverage is inversely correlated with risk here. Without thresholds, coverage can regress silently as code is added. I verified the Users pagination works via browser interaction, but that verification is manual and will not re-run.

### Risk
**Medium**

### Recommendation
Add component tests for the two table pages, focusing on behaviour rather than markup: filter change resets to page 1, changing page issues a request with the right params, empty state renders when a filter matches nothing. Then set a coverage threshold at roughly current levels and ratchet upward, so it acts as a floor rather than an aspiration.

### Estimated effort
**Medium**

---

# Low

## L-1 — `sortBy` interpolated into an object key without a whitelist at the repository layer

### Problem
Both repositories build the sort clause as `orderBy: { [sortBy]: order }`. The repository itself does not constrain `sortBy` — it trusts its caller.

### Location
- `server/src/repositories/lead.repository.ts:30`
- `server/src/repositories/user.repository.ts:~62`

### Why this is a problem
Today this is **safe**, and I verified it: `sortBy` is a Zod `z.enum([...])` in both list schemas, `validate` middleware runs before every list handler, and `?sortBy=passwordHash` returns HTTP 400. Prisma also would not emit raw SQL from an unknown key.

It is listed only because the safety lives one layer away from the risk. A future caller reaching `findUsers` without passing through the validator — an internal script, a new endpoint — would inherit no protection.

### Risk
**Low**

### Recommendation
Type the parameter as a union rather than `string` (`sortBy: "createdAt" | "name" | "email" | "role"`) so the compiler enforces at the repository boundary what Zod enforces at the HTTP boundary. Compile-time only; no runtime change.

### Estimated effort
**Small**

---

## L-2 — `updatedAt` on `Note`/`Activity` absent, and `Activity.type` is a bare string

### Problem
`Activity.type` is typed `String` with the permitted values listed only in a comment: `// "CREATED" | "STATUS_CHANGED" | "ASSIGNED" | "NOTE_ADDED"`. Nothing enforces them. `Note` and `Activity` have `createdAt` but no `updatedAt`.

### Location
`server/prisma/schema.prisma:94–105`

### Why this is a problem
A typo in an activity type would write successfully and then silently fail to match any UI filter. The missing `updatedAt` is defensible — both tables are conceptually append-only, and `Activity` explicitly so — but `Note` has no edit feature partly *because* the schema does not support tracking one.

### Risk
**Low**

### Recommendation
Promote `Activity.type` to a Prisma `enum ActivityType`, mirroring how `Role` and `LeadStatus` are already handled — it is the same pattern, applied inconsistently. Requires a migration and a small backfill check that existing rows match the enum. Leave `updatedAt` alone unless note editing is actually planned.

### Estimated effort
**Small**

---

## L-3 — Documentation drift: prior audit docs describe a superseded state

### Problem
`docs/` contains `ASSESSMENT.md`, `MIGRATION_PLAN.md`, `REFACTOR_EXAMPLE.md`, `ENGINEERING_STANDARDS.md`, and `AUDIT_REPORT.md` from earlier review rounds, plus a generated `Project-Audit.pdf`. Several statements in them no longer match the code — `ASSESSMENT.md` predates the users-pagination work, the `render.yaml` monorepo build fixes, and the seed-on-deploy change. `README.md` still documents seeding as a manual post-deploy step, which the build command now does automatically.

### Location
- `docs/ASSESSMENT.md`, `docs/MIGRATION_PLAN.md`, `docs/AUDIT_REPORT.md`, `docs/Project-Audit.pdf`
- `README.md` — "Deployment" section, seeding instructions

### Why this is a problem
Stale documentation is worse than none: a new joiner cannot tell which document is authoritative, and the PDF cannot be diffed to find out. This assessment adds four more documents at the repository root, compounding the ambiguity if the old ones are left as-is.

### Risk
**Low**

### Recommendation
Keep exactly one authoritative set. Move the superseded `docs/*.md` into `docs/archive/` with a one-line header noting the date and what replaced them, or delete them if this document supersedes them entirely. Update the README's deployment section to match what `render.yaml` actually does today.

### Estimated effort
**Small**

---

# Phase 3 — Prioritisation

Sorted by what should be fixed first. Priority reflects **risk × likelihood × cost to fix**, not severity alone — H-2 outranks C-1 because it is a live credential exposure fixable in minutes.

| Priority | Issue | Reason | Risk if ignored |
|---|---|---|---|
| **1** | **H-2** Rotate seeded admin credentials on production | Public repo contains working ADMIN credentials for the live deployment. Minutes to fix. | Full unauthorised admin access to production data |
| **2** | **C-1** Wrap multi-step writes in transactions | Only issue that causes permanent, silent data corruption | Audit trail diverges from reality; unrecoverable, undetected |
| **3** | **C-2** Add `/leads/stats` and stop sampling | Headline feature reports wrong numbers past 100 leads; not fixable client-side | Users make decisions on false figures; trust in the product lost |
| **4** | **H-3** Add CI | Quality gates already exist and are simply not enforced; cheap to add | Broken code auto-deploys; three deploys already failed this way |
| **5** | **H-1** Index `leads.createdAt` | One-line change on the hottest query in the app | List and dashboard latency degrade as data grows |
| **6** | **H-2b** Remove seed from the build command | Production writes on every deploy | A future non-idempotent seed edit mutates production data |
| **7** | **H-4** Add CSP to the static client | Cheap mitigation for the `localStorage` token exposure | Any future XSS becomes immediate account takeover |
| **8** | **M-1** Strengthen password policy | Admin accounts can hold weak, never-rotated passwords | Credential guessing on privileged accounts |
| **9** | **M-5** Test the two untested table pages | Least-covered code is also the most complex | Regressions ship unnoticed in the busiest screens |
| **10** | **M-3** Adopt RTK Query / TanStack Query | Removes refetch waste and the stale-response race | Redundant traffic; rare, hard-to-reproduce stale-data bugs |
| **11** | **M-2** Extract `useServerTable` and dialog components | Two 500-line components duplicate the same mechanics | Divergent bug fixes; components stay untestable |
| **12** | **M-4** Add `getApiErrorMessage` helper | Removes duplicated casts that bypass existing types | Error handling silently degrades to generic messages |
| **13** | **L-3** Reconcile documentation | Four review documents now overlap | New joiners follow stale guidance |
| **14** | **L-1, L-2** Type `sortBy` union; `Activity.type` enum | Defence in depth; consistency with existing enums | Latent risk if a new caller bypasses validation |

**Suggested cut line:** items 1–7 constitute the "make it safe and correct" set and are all Small or Medium. Items 8–14 are quality investments that can follow the cadence in `TASK_B_MIGRATION_PLAN.md`.

---

# What is already done well

Stating this explicitly, because an assessment that lists only faults misrepresents the codebase and misdirects effort.

**Architecture.** The Route → Middleware → Controller → Service → Repository layering is real and consistently held. I specifically looked for the usual violations — business rules in controllers, Prisma calls in services, `req`/`res` leaking into services — and found none. `app.ts` deliberately omits `app.listen()` so Supertest can import it, which is a deliberate testability decision.

**Authorization.** Role scoping is centralised in `buildScopedWhere` and applied at the service layer rather than sprinkled through handlers. The 404-not-403 choice for leads a member cannot see is the correct call and is commented with its reasoning. Self-demotion and self-deletion are both blocked with explicit named error codes, and `countUserReferences` converts an FK violation into a clear 409 instead of a 500.

**Validation.** Every mutating route and every list route passes through a Zod schema. Query params are coerced and bounded (`limit` capped at 100, enums for `sortBy`/`order`/`status`/`role`). Validated output goes to `req.validatedQuery` rather than overwriting `req.query` — a deliberate choice, and commented as such.

**Security fundamentals.** No secrets committed (`.env.example` only, with placeholders). `helmet`, CORS pinned to a single origin, 100KB body cap, two-tier rate limiting with a correct note about `max: 0` meaning "block everything". Error responses leak internals in development only. `sanitizeUser` keeps `passwordHash` out of every response, and a test asserts it.

**Testing.** 73 backend integration tests against a real database — not mock-heavy unit tests that pass while the app is broken. They cover authorization boundaries, not just happy paths.

**Comments.** Unusually good. They explain *why* rather than restating *what* — the `max: 0` rate-limit footgun, the 404-not-403 rationale, why `createPublicLead` is a separate function rather than a flag. This is the difference between a codebase a new engineer can join and one they have to reverse-engineer.

---

# Scope note

Two things I could not fully verify, stated rather than glossed:

1. **Production database state.** I confirmed the seed runs in the build command and that `admin@crm.test` authenticates against the live API. I did not audit what other data exists in production.
2. **Frontend behaviour beyond the Users page.** I verified the Users page (pagination, filters, alignment, mobile) in a real browser. Other pages are covered by build, tests, and code reading — not by fresh interactive verification in this pass.
