# Task B — Interviewer Score

**Project:** Lead Management CRM
**Commit:** `b20db88`
**Assessed:** 2026-07-26
**Basis:** `TASK_B_ASSESSMENT.md` — 14 findings (2 Critical, 4 High, 5 Medium, 3 Low)
**Grading posture:** strict. Scored against what a **production system serving real users** requires, not against "good for an interview assignment." Where the two differ, I say so.

---

## Scored categories

### Architecture — 26 / 30

**Evidence for:** The Route → Middleware → Controller → Service → Repository layering is real and consistently held across all 16 endpoints. I actively hunted for the usual violations — business logic in controllers, Prisma outside repositories, `req`/`res` leaking into services — and found **none**. `app.ts` deliberately omits `app.listen()` so Supertest can import the app; `config/env.ts` fails fast at boot on a missing variable. The database schema is genuinely well-designed: `Decimal(12,2)` for money, cascade deletes on child rows, an append-only `Activity` audit table as a single source of truth for two UI surfaces.

**Deductions:**
- **−2** No transactions on any write path. Three services perform multi-row writes non-atomically (C-1). This is an architectural gap, not a bug — the layering has no concept of a unit of work.
- **−2** Two frontend components (513 and 463 lines, 17 and 19 `useState`) concentrate four concerns each and duplicate the same table mechanics (M-2).

**Why not lower:** the backend structure is the strongest part of this project and would pass review at most companies unchanged.

---

### Authentication & Authorization — 20 / 25

**Evidence for:** Genuinely thoughtful, with several decisions that only experienced engineers get right:

- `authenticate` and `authorize` are deliberately separate middlewares — two distinct questions, independently testable.
- Row-level scoping centralised in one function (`buildScopedWhere`), not scattered across handlers.
- **404-not-403** for leads a member cannot access, so members cannot enumerate records they lack access to. Commented with its reasoning.
- Identical error for unknown-email and wrong-password — no user enumeration.
- Self-demotion and self-deletion blocked with named error codes; `countUserReferences` converts an FK violation into a clear 409 rather than a 500.
- `refresh` re-reads the user, so a deleted account cannot refresh and a demotion takes effect.
- `sanitizeUser` strips `passwordHash` everywhere, with a test asserting it.
- Frontend guards documented as UX-only, with server-side enforcement on every admin route.

**Deductions:**
- **−3** Seeded ADMIN credentials (`admin@crm.test` / `Password123!`) are live on the deployed instance *and* published in the repo, README, and seed file, because the build command seeds on every deploy (H-2). In a real system this is an open door — the strongest authorization design in the world does not survive published admin credentials.
- **−1** JWT in `localStorage` with no CSP on the served client (H-4). Exposure rather than active vulnerability — I found no XSS vector — but no defence in depth either.
- **−1** Password policy is 8 characters with no complexity or common-password check, on accounts that may be ADMIN with no forced rotation (M-1).

**Why not lower:** the *design* here is strong; the deductions are configuration and policy, all fixable in under a day.

---

### API Design — 17 / 20

**Evidence for:** Consistent and disciplined. Versioned `/api/v1`; resource-plural nouns with verbs carrying the action; a uniform `{ success, data, meta }` / `{ success, error: { message, code } }` envelope on every response; correct status codes throughout including 409 for conflicts and 429 for rate limits; machine-readable error codes so the client branches on meaning rather than display text.

Two deliberate deviations, both correct and both commented: `POST /leads/public` as a separate unauthenticated route rather than a flag on the authenticated one (so the anonymous path structurally cannot accept `assignedToId` or `status`), and 404-not-403 for hidden records.

The users-pagination work demonstrates real API maturity: `page`/`limit` are optional **with no default**, so existing unparameterised callers (four assignee dropdowns) keep receiving the full list. Adding a default would have silently truncated them. That is the kind of backward-compatibility thinking that distinguishes senior work.

**Deductions:**
- **−2** No aggregate endpoint. The dashboard has no way to get correct totals — `limit` is hard-capped at 100 and there is no `/stats` route, so KPIs are computed from a 100-row sample and are simply wrong past that (C-2). This is an API design gap causing a product correctness bug.
- **−1** No `PATCH` semantics; `PUT` performs partial updates. Minor and internally consistent, but not REST-correct.

---

### Code Quality — 20 / 25

**Evidence for:** TypeScript strict mode with `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`. ESLint clean (0 errors; 2 pre-existing warnings). Prettier enforced with a `format:check` script. Consistent naming that encodes the layer in the filename.

**The comments deserve specific credit.** They explain *why*, not *what* — the `express-rate-limit` `max: 0` footgun, the 404-not-403 rationale, why `req.validatedQuery` exists rather than overwriting `req.query`, why `createPublicLead` is a separate function. This is the difference between a codebase a new engineer can join and one they must reverse-engineer, and it is rarer than it should be.

**Deductions:**
- **−2** Two components exceed reasonable size and state limits (M-2), duplicating the same paginated-table mechanics rather than sharing it.
- **−1** A verified stale-response race in `UsersPage`: no cancellation guard, so a slow earlier request can overwrite a faster later one. `DashboardPage` guards the identical pattern with an `active` flag — so the codebase knows the right answer and applies it inconsistently (M-3).
- **−1** Duplicated error-extraction casts that bypass the `ApiError` type already defined in `types/api.ts` (M-4).
- **−1** Magic numbers not centralised: `DASHBOARD_LEAD_SAMPLE_SIZE = 100`, the 400 ms debounce, `.max(100)` — related values living in separate files.

---

## Additional dimensions

### Testing — 17 / 20

**Evidence for:** 96 tests, all passing (73 backend, 23 frontend), verified by running them. The backend suite is **integration-level against a real PostgreSQL database** via Supertest — not mock-heavy unit tests that pass while the app is broken. Critically, it tests authorization *negatively*: unauthenticated 401s, wrong-role 403s, members forbidden from reassigning, cross-user access returning 404. Those are the tests people skip and the ones that catch real regressions.

**Deductions:**
- **−2** The two largest, most stateful components are entirely untested. Coverage is inversely correlated with complexity — exactly backwards (M-5).
- **−1** No coverage thresholds anywhere, so coverage can silently regress.

### Security — 14 / 20

**Evidence for:** No secrets committed (verified — `.env.example` with placeholders only). `helmet`, CORS pinned to one origin, 100KB body cap, two-tier rate limiting. All queries parameterised through Prisma; **no SQL injection surface**, and I verified the one dynamic construct (`orderBy: { [sortBy]: order }`) is protected by a Zod enum — `?sortBy=passwordHash` returns 400. No `dangerouslySetInnerHTML`. Error responses leak internals in development only. `JWT_SECRET` generated per environment via `render.yaml`.

**Deductions:**
- **−4** Published ADMIN credentials live in production (H-2). Nothing else in this section matters as much.
- **−1** No CSP on the served client (H-4).
- **−1** Weak password policy (M-1).

**Note:** the deductions are all *operational*, not code-level. The application code's security posture is good; the deployment's is not.

### Maintainability — 16 / 20

**Evidence for:** Predictable structure, layer-encoding filenames, excellent explanatory comments, one API envelope, one error handler, one validation mechanism. A new engineer could ship a feature here in their first week — the answer to "where does this go?" is unambiguous.

**Deductions:**
- **−2** Duplicated table mechanics across two large components; a paging fix must be made twice and can diverge.
- **−1** Documentation drift — five prior review documents in `docs/` plus four new ones at the root, with no stated authority and some stale content (L-3).
- **−1** No CI, so standards depend on human memory.

### Scalability — 13 / 20

**Evidence for:** Correct fundamentals — pagination on list endpoints, indexes on `status`/`assignedToId`/`leadId`, no N+1 (Prisma `include` used properly), stateless JWT auth so the API scales horizontally, route-level code splitting (1011KB → 512KB).

**Deductions:**
- **−3** `leads.createdAt` — the default sort column, used by both the list and dashboard — has no index. Confirmed via `EXPLAIN`: `Seq Scan` + in-memory `Sort` (H-1). Free now, painful later.
- **−2** Client-side aggregation of a 100-row sample instead of DB-side `groupBy` (C-2) — both wrong and slower than the correct approach.
- **−2** No server-state caching; every navigation refetches, and the assignee dropdown fetches from five separate call sites (M-3).

### Deployment readiness — 12 / 20

**Evidence for:** Infrastructure as code via `render.yaml` covering all three resources. Migrations run automatically on deploy. Env config validated at boot. All three services are live and working — I verified the health endpoint, login, and CORS headers against production.

**Deductions:**
- **−4** No CI (H-3). Render auto-deploys `main`, so a commit breaking all 73 tests reaches production unchallenged. Three consecutive deploys failed on errors CI would have caught pre-push.
- **−2** The build seeds production data on every deploy (H-2) — a build step that mutates production is the wrong shape regardless of idempotency.
- **−2** No monitoring, error tracking, or alerting. A 500 in production is invisible unless a user reports it.

**Free-tier constraints** (API sleeps after 15 min; Postgres expires in 90 days) are **not** deducted — they are a plan choice, appropriate for a demo. They are blockers for real users and should be stated to stakeholders.

---

## Overall score

| Category | Score | Weight |
|---|---:|---|
| Architecture | 26 / 30 | Primary |
| Authentication & Authorization | 20 / 25 | Primary |
| API Design | 17 / 20 | Primary |
| Code Quality | 20 / 25 | Primary |
| **Primary subtotal** | **83 / 100** | |
| | | |
| Testing | 17 / 20 | Supplementary |
| Security | 14 / 20 | Supplementary |
| Maintainability | 16 / 20 | Supplementary |
| Scalability | 13 / 20 | Supplementary |
| Deployment readiness | 12 / 20 | Supplementary |
| **Supplementary subtotal** | **72 / 100** | |

### Overall: **78 / 100**

Composite of the four primary categories (83) and the five supplementary dimensions (72), weighted 60/40 toward the primary rubric.

---

## Interpretation

**As an interview assignment: strong pass.** The architecture, authorization design, and test discipline are above what this exercise requires. Several decisions — 404-not-403, separating the public lead route, keeping pagination opt-in for backward compatibility, `validatedQuery` over mutating `req.query` — are the kind that distinguish someone who has maintained production systems from someone who has only built them.

**As a production system serving real users: not yet ready,** for three specific reasons, all fixable within a week:

1. Published ADMIN credentials are live on the deployment (H-2).
2. Multi-row writes are not transactional, so the audit log can silently diverge from reality (C-1).
3. Dashboard KPIs are wrong above 100 leads (C-2).

**The gap between those two verdicts is the whole story of this assessment.** The *code* scores well; the *operational envelope* around it scores poorly — no CI, no monitoring, a build that writes to production, and a missing index on the hottest query. That is a common and revealing pattern: engineering judgment is evidently present, and the missing pieces are the ones only production experience teaches.

### What would move this to 90+

In priority order (see `TASK_B_MIGRATION_PLAN.md` Week 1):

| Fix | Points | Effort |
|---|---|---|
| Rotate production credentials; remove seed from build | +5 | Small |
| Add CI with branch protection | +4 | Small |
| Transactions on all write paths | +3 | Medium |
| `/leads/stats` endpoint; delete client sampling | +3 | Medium |
| Index `leads.createdAt` | +2 | Small |
| CSP on the client | +1 | Small |

**Total: +18 for roughly one focused week.** Every item is Small or Medium — there is no large or risky change on the path to a strong production posture, which is itself evidence the foundation is right.

---

## Scoring transparency

Two things about how I graded, stated so the numbers can be argued with:

**What I refused to invent.** I checked for and did **not** find: SQL injection, missing authorization on any route, secrets in the repository, N+1 queries, `dangerouslySetInnerHTML`, mutable-state bugs in Redux, unhandled promise rejections in services, or missing pagination on list endpoints. I also investigated a suspected error-handling bug — `authenticate` throws synchronously inside middleware — and **discarded it** after confirming Express 4.22 catches synchronous throws (verified: returns a correct 401 envelope). Reporting it would have been an invented issue.

**Where I am least certain.** The Scalability score is the softest. I verified the missing index with a query plan against 14 rows, where the planner is *correct* to seq-scan. The claim that it degrades at scale is well-established database behaviour, not something I measured here. I did not load-test.
