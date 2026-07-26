# Task B — Migration Plan

**Companion to:** `TASK_B_ASSESSMENT.md`
**Baseline commit:** `b20db88`
**Premise:** the application works and serves real users. Nothing here is a rewrite. Every step is independently shippable and independently revertable.

---

## Guiding principles

1. **No rewrite.** The layering is sound. Every change below works *with* the existing architecture, not against it.
2. **One concern per PR.** Each item is small enough to review properly and revert cleanly.
3. **Tests before refactors.** Where coverage is thin on code we intend to change (`UsersPage`, `LeadsListPage`), tests land *first* — otherwise the refactor has no safety net.
4. **Sequenced by risk, not by interest.** Credential exposure and data corruption come before developer-experience work, however much more enjoyable the latter is.
5. **Verify in production after each deploy.** Render auto-deploys `main`; a green CI run is necessary but not sufficient.

---

# Week 1 — Stop the bleeding

Goal: eliminate live credential exposure, prevent data corruption, make the dashboard truthful, and get an automated gate in place.

Everything in this phase is Small or Medium effort. Nothing requires architectural change.

---

### 1.1 — Rotate the seeded admin credentials on production
**Assessment ref:** H-2 (part 1) · **Risk of the change:** None · **Effort:** Small

**Why now:** `admin@crm.test` / `Password123!` is an ADMIN account on the live deployment, and those credentials are in the public repository, the README, and `seed.ts`. This is the only item here that is actively exploitable *today*. It goes first because it takes minutes and needs no code change.

**Do:** Log into production, change the admin password to a generated value stored in a password manager. Or create a real admin account and delete the seeded one. Same for `jane@crm.test` if it is reachable.

**Benefit:** Closes unauthorised admin access to production.
**Files affected:** None — data-only change.

---

### 1.2 — Remove the seed step from the deploy build
**Assessment ref:** H-2 (part 2) · **Risk of the change:** Low · **Effort:** Small

**Why now:** Directly follows 1.1 — rotating credentials is pointless if the next deploy re-creates the seeded accounts. `seed.ts` uses `upsert`, so it will not overwrite the rotated password, but the coupling must go regardless.

**Do:** Delete `&& npm run prisma:seed --workspace=server` from the API `buildCommand`. Seed future fresh environments via a Render One-Off Job.

**Benefit:** Production data stops being written by the build. A future non-idempotent seed edit can no longer reach production.
**Files affected:** `render.yaml`

**Watch for:** If the live database is ever reset, it will now be empty until seeded manually. That is the correct behaviour, but document it in the README (see 1.6).

---

### 1.3 — Add the CI pipeline
**Assessment ref:** H-3 · **Risk of the change:** None · **Effort:** Small

**Why now:** Before any refactor, not after. Everything later in this plan changes code that CI should be guarding — landing it first means every subsequent PR is verified automatically. It also costs almost nothing: the tests, linting, and formatting all already exist and pass.

**Do:** GitHub Actions workflow on PRs and pushes to `main`. Steps: `npm ci --include=dev`, `prisma generate`, `lint`, `format:check`, both test suites, both builds. Use a `postgres:16` service container for backend integration tests. Mirror the command order in `render.yaml` so deploy-time build breaks surface at PR time. Then enable branch protection on `main`.

**Benefit:** 96 existing tests start earning their keep. The three consecutive failed production deploys in this project's history would all have been caught pre-push.
**Files affected:** `.github/workflows/ci.yml` (new)

---

### 1.4 — Wrap multi-step writes in transactions
**Assessment ref:** C-1 · **Risk of the change:** Medium · **Effort:** Medium

**Why now:** The only issue that causes permanent, silent data loss. Every day it stays unfixed is another window for a partial write. It lands after CI (1.3) specifically so the change is verified automatically.

**Do:** In dependency order, smallest first:
1. `note.service.ts` — `createNote` (note + `NOTE_ADDED`). Smallest surface; validates the pattern.
2. `lead.service.ts` — `createPublicLead` (lead + `CREATED`).
3. `lead.service.ts` — `createLead` (lead + `CREATED` + optional `ASSIGNED`).
4. `lead.service.ts` — `updateLead` (update + conditional `STATUS_CHANGED` / `ASSIGNED`).

Use interactive transactions (`prisma.$transaction(async (tx) => …)`) so existing sequential logic survives with minimal edits. Repository functions need to accept an optional transaction client.

**Benefit:** The `Activity` table becomes a trustworthy audit log, which is what `schema.prisma` already claims it is.
**Files affected:** `server/src/services/lead.service.ts`, `server/src/services/note.service.ts`, `server/src/repositories/lead.repository.ts`, `server/src/repositories/note.repository.ts`, `server/src/repositories/activity.repository.ts`

**Watch for:** Interactive transactions hold a connection for their duration. Keep the bodies tight — no external calls inside. Add a test that asserts no orphaned lead exists when activity creation fails (inject a failure).

---

### 1.5 — Index `leads.createdAt`
**Assessment ref:** H-1 · **Risk of the change:** Low · **Effort:** Small

**Why now:** One line, measurably wrong today (`EXPLAIN` shows `Seq Scan` + `Sort` on the app's most-run query), and cheap while the table is small — index creation on a large table needs more care.

**Do:** Add `@@index([createdAt])` to the `Lead` model, generate a migration, deploy. Re-run `EXPLAIN` afterwards to confirm the plan changed.

**Benefit:** The default leads-list sort and the `createdFrom`/`createdTo` range filter stop requiring a full scan and in-memory sort.
**Files affected:** `server/prisma/schema.prisma`, new migration under `server/prisma/migrations/`

---

### 1.6 — Reconcile the documentation
**Assessment ref:** L-3 · **Risk of the change:** None · **Effort:** Small

**Why now:** This plan and its sibling documents *add* to an already-crowded set. Doing it in Week 1 prevents ambiguity compounding, and it captures the 1.2 seeding change while it is fresh.

**Do:** Move superseded `docs/*.md` to `docs/archive/` with a dated header, or delete them. Update the README's Deployment section to match what `render.yaml` does now (including manual seeding after 1.2).

**Benefit:** One authoritative source. New joiners stop following stale instructions.
**Files affected:** `README.md`, `docs/*`

---

## Week 1 exit criteria

- [ ] Production admin credentials rotated and verified
- [ ] `render.yaml` no longer seeds on deploy
- [ ] CI green on `main`; branch protection on
- [ ] All four write paths transactional, with a partial-failure test
- [ ] `EXPLAIN` confirms index use on the default sort
- [ ] One authoritative documentation set

---

# Month 1 — Correctness and confidence

Goal: fix the dashboard, close the security gaps that need code, and build test coverage where we intend to refactor next.

---

### 2.1 — Add `GET /api/v1/leads/stats` and stop client-side sampling
**Assessment ref:** C-2 · **Risk of the change:** Medium · **Effort:** Medium

**Why this phase:** It is a correctness bug and arguably belongs in Week 1, but unlike the Week 1 items it needs a new endpoint, new tests, and a frontend change — too much to rush alongside credential rotation and transactions. It is the first thing after the bleeding stops.

**Do:**
1. Backend: new endpoint returning status counts via `groupBy` and date-bucketed counts for the chart. Reuse `buildScopedWhere` so a MEMBER's dashboard still reflects only their leads — this is the part most likely to be got wrong.
2. Tests: assert an admin sees all-lead totals, a member sees only theirs, and totals exceed 100 when the data does (seed >100 leads in the test).
3. Frontend: `DashboardPage` calls the new endpoint; delete `DASHBOARD_LEAD_SAMPLE_SIZE`. Keep `latestLeads` as a separate `limit: 5` fetch.

**Benefit:** Dashboard numbers become correct at any volume, and aggregation moves to the database where it belongs. Fewer rows over the wire.
**Files affected:** `server/src/routes/lead.routes.ts`, `lead.controller.ts`, `lead.service.ts`, `lead.repository.ts`, `server/src/validators/lead.schema.ts`, `server/tests/lead.test.ts`, `client/src/services/leadApi.ts`, `client/src/pages/Dashboard/DashboardPage.tsx`

**Watch for:** Role scoping on the new endpoint is a security boundary. A member must not see global totals. Test that explicitly.

---

### 2.2 — Content-Security-Policy on the static client
**Assessment ref:** H-4 (cheap half) · **Risk of the change:** Medium · **Effort:** Small

**Why this phase:** Small change, but a wrong CSP breaks the app visibly (blocked styles or scripts). It needs a staging check, which is why it is not a Week 1 drop-in.

**Do:** Add response headers to the client's Render static-site config: `default-src 'self'` plus explicit allowances for what the app genuinely loads (MUI injects inline styles — verify whether `style-src 'unsafe-inline'` is required, and scope it as tightly as possible). Verify in a browser that no console CSP violations appear on any route.

**Benefit:** Meaningfully reduces the blast radius of any future XSS, which currently would yield the `localStorage` token and thus full account takeover.
**Files affected:** `render.yaml` (static-site headers), possibly `client/index.html`

---

### 2.3 — Strengthen the password policy
**Assessment ref:** M-1 · **Risk of the change:** Low · **Effort:** Small

**Why this phase:** Not urgent (bcrypt at 10 rounds plus a 20-per-15-min auth limiter blunt the practical attack), but it protects privileged accounts and pairs naturally with the 2.2 security work.

**Do:** Raise the minimum to 12 characters, reject a bundled common-password list. Put the rule in one shared constant consumed by both `server/src/validators/` and the client, so the currently-duplicated literals cannot drift.

**Benefit:** Removes trivially guessable passwords on accounts that may be ADMIN.
**Files affected:** `server/src/validators/auth.schema.ts`, `server/src/validators/user.schema.ts`, `client/src/pages/Users/UsersPage.tsx`, `client/src/pages/Auth/`, a new shared constants module

**Watch for:** Do not enforce retroactively on login — existing users would be locked out. Apply on create and change only.

---

### 2.4 — Test the two untested table pages
**Assessment ref:** M-5 · **Risk of the change:** None · **Effort:** Medium

**Why this phase:** This is the prerequisite for Quarter 1's refactoring. `LeadsListPage` and `UsersPage` are the most complex components and the least covered; refactoring them without tests first would be reckless.

**Do:** Component tests via the existing `renderWithProviders` helper, asserting behaviour not markup:
- changing a filter resets to page 1
- changing page requests the correct `page`/`limit`
- the empty state renders when a filter matches nothing
- role change and delete call the right API and refresh

Then set coverage thresholds at roughly current levels so they act as a ratchet.

**Benefit:** Makes the Quarter 1 refactor safe. Locks in the pagination behaviour currently verified only by my manual browser check.
**Files affected:** `client/src/pages/Users/UsersPage.test.tsx` (new), `client/src/pages/Leads/LeadsListPage.test.tsx` (new), `client/vite.config.ts`, `server/jest.config.js`

---

### 2.5 — `getApiErrorMessage` helper
**Assessment ref:** M-4 · **Risk of the change:** Low · **Effort:** Small

**Why this phase:** Trivial and mechanical; bundling it with 2.4's frontend work avoids a separate context switch.

**Do:** Add the helper typed against the existing `ApiError` shape in `client/src/types/api.ts`; replace every inline cast.

**Benefit:** Removes duplicated casts that currently bypass the type that already exists.
**Files affected:** `client/src/utils/getApiErrorMessage.ts` (new), `client/src/pages/Users/UsersPage.tsx`, `client/src/pages/Leads/*`

---

## Month 1 exit criteria

- [ ] Dashboard correct with >100 leads, verified with seeded volume
- [ ] Member dashboard scoping covered by a test
- [ ] CSP live with no console violations on any route
- [ ] Password rules shared between client and server, no drift
- [ ] Both table pages have behavioural tests; coverage thresholds set
- [ ] No inline error-envelope casts remain

---

# Quarter 1 — Structural investment

Goal: pay down the duplication and state-management debt now that tests exist to make it safe. Nothing here is urgent; all of it compounds.

---

### 3.1 — Adopt RTK Query for server state
**Assessment ref:** M-3 · **Risk of the change:** Medium-High · **Effort:** Medium

**Why this phase:** It touches every data-fetching component, so it needs the 2.4 test suite underneath it. It also naturally removes much of what 3.2 would otherwise refactor by hand — doing it first means less duplicated effort.

**Do:** RTK Query rather than TanStack Query, because Redux Toolkit is already a dependency and adds no new package. Migrate one route at a time, starting with Users (smallest), then Leads list, details, create, edit, then Dashboard. Ship each route separately.

**Benefit:** Caching and request deduplication (the assignee dropdown currently refetches from five call sites), automatic cancellation (closing the stale-response race that only `DashboardPage` currently guards against), and a large reduction in `useState`/`useEffect` boilerplate.
**Files affected:** `client/src/store/index.ts`, new `client/src/services/api/` slice definitions, then each page under `client/src/pages/` incrementally

**Watch for:** Do not migrate all routes in one PR. Cache invalidation after mutations is where this typically goes wrong — verify that creating a lead refreshes the list and the dashboard.

---

### 3.2 — Extract `useServerTable` and dialog components
**Assessment ref:** M-2 · **Risk of the change:** Medium · **Effort:** Medium

**Why this phase:** After 3.1, because RTK Query absorbs the fetching half of what these components do — refactoring before it would mean doing the work twice.

**Do:** Extract a `useServerTable` hook owning page / rowsPerPage / filters / debounce, consumed by both table pages. Lift `CreateUserDialog` and a shared `ConfirmDeleteDialog` out of `UsersPage`. `TASK_B_REFACTOR.md` contains the worked example.

**Benefit:** Two ~500-line components shrink substantially; paging and debounce logic exists once instead of twice, so fixes cannot diverge. Extracted units become independently testable.
**Files affected:** `client/src/hooks/useServerTable.ts` (new), `client/src/components/dialogs/` (new), `client/src/pages/Users/UsersPage.tsx`, `client/src/pages/Leads/LeadsListPage.tsx`

---

### 3.3 — `Activity.type` as a Prisma enum; type `sortBy` as a union
**Assessment ref:** L-1, L-2 · **Risk of the change:** Low · **Effort:** Small

**Why this phase:** Low urgency, and the enum migration wants a quiet period rather than competing with correctness work.

**Do:** Promote `Activity.type` to `enum ActivityType`, mirroring the existing `Role` / `LeadStatus` pattern; migrate with a check that existing rows conform. Separately, narrow the repositories' `sortBy` parameter from `string` to a union so the compiler enforces at the repository boundary what Zod enforces at the HTTP boundary.

**Benefit:** Consistency with enums already used elsewhere; a typo in an activity type becomes a compile error instead of a silently unfilterable row.
**Files affected:** `server/prisma/schema.prisma`, new migration, `server/src/repositories/activity.repository.ts`, `lead.repository.ts`, `user.repository.ts`, `server/src/services/*`

---

### 3.4 — Evaluate httpOnly cookie auth (decision, not necessarily implementation)
**Assessment ref:** H-4 (expensive half) · **Risk of the change:** High · **Effort:** Large

**Why this phase:** This is the one item I would *not* commit to in advance. It touches login, refresh, logout, and the Axios client together, and it requires CSRF protection alongside it — cookies are sent automatically, which is the whole point and also the new risk.

**Do:** Timebox a spike. Decide based on whether this becomes a real multi-tenant product or remains a demo. If yes: httpOnly + `Secure` + `SameSite=Strict` cookies, CSRF tokens on mutations, and rework `tokenStorage.ts` (already written as a single choke point precisely to make this cheap). If no: document the accepted risk and keep the CSP from 2.2 as the mitigation.

**Benefit:** Removes token theft via XSS as a category rather than mitigating it.
**Files affected:** `server/src/controllers/auth.controller.ts`, `auth.routes.ts`, new CSRF middleware, `client/src/services/apiClient.ts`, `client/src/utils/tokenStorage.ts`, `client/src/features/auth/authSlice.ts`

**Watch for:** Sequence this so the frontend and backend deploy together, or support both schemes briefly. A mismatched deploy logs every user out.

---

## Quarter 1 exit criteria

- [ ] All data fetching through RTK Query; no manual refetch-on-mount
- [ ] `useServerTable` consumed by both table pages
- [ ] `ActivityType` enum enforced in the schema
- [ ] Repository `sortBy` typed as a union
- [ ] Explicit documented decision on cookie auth

---

# Sequencing rationale

Two orderings in this plan are deliberate and worth stating, because the obvious alternative is wrong:

**CI (1.3) before the transaction work (1.4).** The instinct is to fix data corruption first. But the transaction change is the riskiest edit in Week 1 — it touches four write paths — and landing CI first means it is verified automatically rather than by hand.

**RTK Query (3.1) before component extraction (3.2).** The instinct is to clean up the big components first. But RTK Query removes the fetching logic that constitutes much of their bulk; refactoring by hand first means doing that work twice and discarding it.

# What this plan deliberately does not do

- **No framework migration.** No Next.js, no Nest, no ORM swap. Nothing about the current stack impedes the roadmap.
- **No restructuring of the backend layering.** It is correct. Leave it alone.
- **No microservices, no queue, no cache layer.** There is no load problem to solve — inventing one would be speculative complexity.
- **No test-framework change.** Jest on the backend and Vitest on the frontend both work and both pass.
