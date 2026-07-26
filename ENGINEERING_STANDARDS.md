# Engineering Standards — Lead Management CRM

**Status:** Proposed, for team adoption
**Baseline commit:** `b20db88`
**Companions:** `TASK_B_ASSESSMENT.md`, `TASK_B_MIGRATION_PLAN.md`, `TASK_B_REFACTOR.md`

> **Note on scope.** `docs/ENGINEERING_STANDARDS.md` already covers Git workflow, branching, PR review, CI/CD, monitoring, and dependency updates in depth. This document is the **codebase-specific** standard: it codifies the conventions the code already follows, so they survive contact with new contributors. Where the two overlap, this one is authoritative for code-level rules; see `docs/` for process rules. Per assessment L-3, one of the two should eventually absorb the other.

**Principle throughout:** most of these standards are *already followed* here. Writing them down converts implicit discipline into something reviewable — the failure mode for a codebase this tidy is a new contributor who cannot see the pattern and breaks it in good faith.

---

## 1. Folder structure

### Backend — strict layer directories

```
server/src/
├── config/        # env loading (Zod-validated), Prisma singleton, constants
├── routes/        # URL → middleware → controller wiring only
├── middleware/    # authenticate, authorize, validate, errorHandler, rateLimiter
├── controllers/   # HTTP shape in/out only
├── services/      # business rules
├── repositories/  # Prisma queries only
├── validators/    # Zod schemas
├── utils/         # AppError, asyncHandler, jwt, password, sanitizeUser
└── types/         # JwtPayload, Express request augmentation
```

### Frontend — by kind, with pages by feature

```
client/src/
├── components/    # reusable presentational (StatusChip, StatCard, states/)
├── layouts/       # DashboardLayout, AuthLayout, PublicLayout
├── pages/         # route screens, grouped by feature (Leads/, Users/, Auth/)
├── features/      # Redux slices (auth/)
├── services/      # Axios instance + per-resource API modules
├── hooks/         # typed Redux hooks, useDebouncedValue, useServerTable
├── types/         # shapes mirroring backend responses
├── utils/         # formatDate, validation, tokenStorage, leadStatus config
├── routes/        # AppRouter, ProtectedRoute, RoleRoute
└── theme/         # MUI theme
```

**Why this is valuable:** the directory name states the layer, so a misplaced file is visible in a diff without reading it. A Prisma import inside `services/` is instantly wrong. This is the cheapest possible enforcement of architecture — reviewers spot violations by path alone.

**Rule:** a new file goes in the directory matching its *responsibility*, never its feature, on the backend. Frontend pages group by feature because they change together.

---

## 2. Naming conventions

| Thing | Convention | Example from this codebase |
|---|---|---|
| Backend files | `<resource>.<layer>.ts` | `lead.service.ts`, `user.repository.ts` |
| Zod schemas | `<action><Resource>Schema` | `createLeadSchema`, `listUsersQuerySchema` |
| Inferred input types | `<Action><Resource>Input` | `CreateLeadInput`, `ListUsersQuery` |
| Repository functions | verb-first, DB-flavoured | `findLeads`, `countUserReferences` |
| Service functions | verb-first, domain-flavoured | `listLeads`, `assertAssigneeExists` |
| Controllers | `<action>Handler` | `listUsersHandler`, `createLeadHandler` |
| React components | `PascalCase`, one per file | `UsersPage`, `LeadsStatusDonut` |
| Hooks | `use` prefix | `useDebouncedValue`, `useServerTable` |
| Error codes | `SCREAMING_SNAKE_CASE` | `INVALID_CREDENTIALS`, `USER_HAS_REFERENCES` |
| DB tables | `@@map` to snake_case plural | `users`, `leads`, `activities` |
| Booleans | `is`/`has`/`can` prefix | `isSelf`, `passwordMatches` |

**Why this is valuable:** `lead.service.ts` tells you the layer *and* the resource before you open it. Machine-readable error codes let the client branch on `error.code` rather than pattern-matching human-readable strings that translators will later change.

**Rule:** name the layer in the filename. Never `utils.ts` as a dumping ground — if it does not fit an existing util, it needs its own named file.

---

## 3. Component structure

**Order within a component file:**

1. Imports — external, then internal, then types
2. Module constants (`EMPTY_FORM`, `KPI_STATUSES`)
3. Local interfaces
4. The component
5. Inside the component: hooks → derived values (`useMemo`) → handlers → early returns (`loading`, `error`) → JSX

**Hard limits:**

- **250 lines** per component. Past that, extract.
- **8 `useState` calls.** Past that, the component owns too many concerns — extract a hook or split it.
- **One exported component per file** (excepting tiny co-located subcomponents).

Both `LeadsListPage.tsx` (513 lines / 17 states) and `UsersPage.tsx` (463 / 19) currently exceed these. `TASK_B_REFACTOR.md` shows the fix; the limits exist to stop the next such file from being written.

**Server-state rules:**

- Every fetch must be cancellable or guarded against stale responses. `DashboardPage` does this with an `active` flag; `UsersPage` does not, and has a real race as a result (assessment M-3). Pick one mechanism and use it everywhere — preferably `useServerTable`.
- Loading and error states are mandatory on every read. Use the existing `LoadingState` / `ErrorState` components; never leave a fetch with an unhandled rejection.
- Derived values go in `useMemo`, not in state. Never mirror a prop into state.

**Why this is valuable:** the line and state ceilings are arbitrary but *enforceable* — "keep components small" is unactionable in review, "this is 340 lines, extract something" is not.

---

## 4. Backend architecture

**The layering is non-negotiable, and it is the single most valuable property of this codebase:**

```
Route → Middleware → Controller → Service → Repository → Prisma
```

| Layer | Must do | Must never do |
|---|---|---|
| **Route** | Map URL+method to middleware and one controller | Contain logic of any kind |
| **Middleware** | Authenticate, authorize, validate | Touch the database |
| **Controller** | Read `req`, call one service, shape the response | Contain business rules |
| **Service** | Business rules, role scoping, audit writes | Know about `req`/`res`; write raw Prisma |
| **Repository** | Prisma queries | Contain business rules |

**Concrete rules:**

- A controller body should be ~5 lines: extract from `req`, call service, respond. `listUsersHandler` is the reference implementation.
- Services take a plain `RequestingUser { id, role }`, never `req`. This is what makes them unit-testable.
- Only `repositories/` may import `prisma`. Enforce in review; consider an ESLint `no-restricted-imports` rule.
- **Any operation writing more than one row must be transactional.** Currently violated in three services (assessment C-1) — this rule exists to stop it recurring.
- Role scoping belongs in the service, in one function (`buildScopedWhere`), never spread across handlers.

**Why this is valuable:** each layer is independently testable, and a change has exactly one correct home. When someone asks "where do I add X", the answer is unambiguous — which is why this codebase's 73 backend tests were straightforward to write.

---

## 5. API standards

- **Versioned prefix:** `/api/v1`. Breaking changes get `/v2`; never break `/v1` in place.
- **Resource-plural nouns; HTTP verbs carry the action.** `GET /leads`, `POST /leads`, `PUT /leads/:id`. Not `/getLeads`.
- **Uniform envelope, always:**
  ```jsonc
  { "success": true, "data": … , "meta": { … } }   // meta only when paginated
  { "success": false, "error": { "message": "…", "code": "MACHINE_CODE" } }
  ```
- **Status codes:** 200 read/update · 201 create · 204 delete · 400 validation · 401 unauthenticated · 403 authorised-but-forbidden · 404 missing *or deliberately hidden* · 409 conflict · 429 rate-limited.
- **Pagination meta:** `{ page, limit, total, totalPages }` — 1-based `page`, `limit` capped at 100.
- **Deliberate exceptions must be commented.** Two exist and both are correct: `POST /leads/public` is a separate unauthenticated route rather than a flag, and leads a member cannot see return **404 not 403** so they cannot enumerate them.

**Backward compatibility rule:** adding pagination to an existing list endpoint must not break existing callers. The users endpoint demonstrates the pattern — `page`/`limit` are optional *with no default*, so an unparameterised `GET /users` still returns every row for the assignee dropdowns. Never add a default that silently truncates existing consumers.

**Why this is valuable:** one envelope means one client-side error path (`apiClient` interceptor) instead of per-endpoint handling. `code` lets the UI branch on meaning rather than on display text.

---

## 6. Validation

- **Every** route with input gets a Zod schema in `validators/`. No exceptions, including internal-looking endpoints.
- Validation runs as middleware *before* the controller. Controllers never validate.
- Validated query output goes to `req.validatedQuery`, not over `req.query` (Express 5 makes `query` read-only; this is already handled correctly).
- Coerce and bound everything from a query string: `z.coerce.number().int().positive().max(100)`.
- **Whitelist, never blacklist.** `sortBy` and `order` are `z.enum`, which is what makes `orderBy: { [sortBy]: order }` safe — verified: `?sortBy=passwordHash` returns 400.
- Validate on both client and server; the client copy is UX, the server copy is the boundary. Keep shared rules (password length) in one constant so they cannot drift.

**Why this is valuable:** a single validation choke point means an unvalidated field is impossible if the schema is the only way in. The enum whitelist is precisely what prevents column injection through a dynamic `orderBy`.

---

## 7. Authentication

- JWT, signed in one place (`utils/jwt.ts`) — the only file importing `jsonwebtoken`.
- Payload carries `{ sub, role }` only. Never PII, never anything sensitive — JWTs are signed, not encrypted, and are readable by anyone holding them.
- `authenticate` middleware verifies and populates `req.user`; it never lets an unauthenticated request through.
- Passwords: bcrypt, cost from `BCRYPT_SALT_ROUNDS` (≥10). Never log, return, or store plaintext. `sanitizeUser` strips `passwordHash` from every response — and a test asserts it.
- Client token access goes through `tokenStorage.ts` and nothing else, so the storage strategy can change in one file.
- Login failures return an identical message for unknown-email and wrong-password (`INVALID_CREDENTIALS`) — no user enumeration.
- `refresh` re-reads the user so a deleted account cannot refresh and a role demotion takes effect.

**Why this is valuable:** one signing location means an algorithm or expiry change is one edit. The identical-error rule closes a genuine enumeration vector that is easy to reintroduce by "improving" the error message.

---

## 8. Authorization

- **Two distinct questions, two distinct middlewares:** `authenticate` ("who are you?") then `authorize(...roles)` ("may you?"). Never merge them.
- Route-level role gates for coarse access: `router.use(authenticate, authorize("ADMIN"))`.
- **Row-level scoping belongs in the service**, in one place. `buildScopedWhere` is the reference: admins see all, members see only their assigned leads.
- **Hide, do not deny, for records a user must not know exist.** 404 not 403. Already correct for leads.
- Frontend guards (`ProtectedRoute`, `RoleRoute`) are **UX only, never the boundary**. Every admin route is independently enforced server-side.
- Self-targeting privileged actions need explicit guards: no self-demotion, no self-deletion — both present, both with named error codes.

**Why this is valuable:** row-level rules spread across handlers are how privilege-escalation bugs happen. One function means one place to audit and one place to test.

---

## 9. Error handling

- One `errorHandler`, registered last, is the only place converting errors to responses.
- Throw typed `AppError` with a status and a machine code. Never `res.status(500).json(...)` inline.
- Async handlers wrap in `asyncHandler` so rejections reach the handler.
- **Never leak internals.** Stack traces and DB errors are `development`-only; every other environment gets a generic message. Already correct — note that `test` and `staging` count as "not development".
- Convert expected DB failures into meaningful codes rather than letting them surface as 500s. `countUserReferences` → 409 `USER_HAS_REFERENCES` is the model.
- Client: one place extracts messages (`getApiErrorMessage`), and the Axios interceptor handles 401 globally.

**Why this is valuable:** one handler means the error envelope cannot drift per-endpoint, and there is exactly one place to add error reporting later.

---

## 10. Logging

- `morgan` for HTTP access logs — `dev` locally, `combined` in production.
- `console.error(err)` in the error handler for unexpected errors, with full server-side detail.
- **Never log:** passwords, hashes, tokens, full request bodies on auth routes.

**Known gap (honest):** logs are unstructured and have no request correlation id. At this scale that is acceptable; before this serves significant traffic, adopt structured JSON logging (`pino`) with a per-request id propagated through the layers, so a user-reported error can be traced end-to-end. Not urgent — listed so it is a conscious deferral rather than an oversight.

**Why this is valuable:** structured logs are queryable; string logs are grep-able at best. Correlation ids are the difference between diagnosing an issue in minutes and not at all.

---

## 11. Testing

**The pyramid this project actually uses — and should keep:**

- **Backend: integration-first.** Supertest against the real app and a real database. 73 tests. Mock-heavy unit tests pass while the app is broken; these do not.
- **Frontend: behaviour, not markup.** Vitest + React Testing Library, querying by role and label. 23 tests.

**Rules:**

- Every new endpoint needs tests for: happy path, validation rejection, **unauthenticated (401)**, and **wrong-role (403)**. The last two are the ones people skip and the ones that matter.
- Every authorization rule gets an explicit negative test. "Member cannot see another's lead" is worth more than three happy-path tests.
- Tests must be order-independent and self-cleaning (`afterEach` deletes what the test created).
- Never assert on generated ids or timestamps.
- Bug fixes ship with a regression test. No exceptions — this is what stops the same bug returning.
- Coverage thresholds act as a **ratchet**: set at current levels, raised, never lowered.

**Why this is valuable:** these tests already caught real authorization regressions during development. Integration tests against a real DB are the only kind that verify Prisma queries, role scoping, and middleware ordering actually compose correctly.

---

## 12. Git workflow

- **Never commit to `main` directly.** Branch protection on, CI required. (Currently absent — assessment H-3.)
- Branches: `feat/`, `fix/`, `refactor/`, `docs/`, `chore/` + short kebab description.
- **Imperative-mood subject under ~70 chars, then a body explaining *why*.** This repository's history does this well — `"Move prisma, tsx, typescript to dependencies for production build"` states the what and the body states the production-install reason. Keep that standard.
- One logical change per commit; one concern per PR.
- Never commit `.env`, secrets, `node_modules`, or build output. `.gitignore` covers these — verify before adding new tooling.

**Why this is valuable:** `git log` becomes the design record. Six months later, "why is `tsx` in dependencies?" is answered by the commit body, not by archaeology.

---

## 13. Code review checklist

Reviewer works top-down; anything unchecked blocks merge.

**Security**
- [ ] New endpoint has `authenticate` and, if privileged, `authorize`
- [ ] Row-level scoping applied for non-admin roles
- [ ] Input validated by a Zod schema; no unvalidated `req.body`/`req.query` reads
- [ ] No secrets, tokens, or credentials in code, tests, or logs
- [ ] Response cannot leak `passwordHash` or internal error detail

**Architecture**
- [ ] Code is in the correct layer; no Prisma outside `repositories/`
- [ ] No business logic in a controller
- [ ] Multi-row writes are transactional
- [ ] No duplication of an existing util, hook, or component

**Correctness**
- [ ] Tests cover happy path, validation failure, 401, and 403
- [ ] Bug fixes include a regression test
- [ ] Frontend fetches handle loading, error, and staleness/cancellation
- [ ] Pagination changes do not silently truncate existing callers

**Quality**
- [ ] Component under 250 lines / 8 `useState`
- [ ] Comments explain *why*, not *what*
- [ ] No dead code, no commented-out blocks, no stray `console.log`
- [ ] Lint, format, typecheck, tests, build all green

**Why this is valuable:** an explicit list makes review consistent regardless of who reviews, and depersonalises objections — the checklist blocks the merge, not the reviewer.

---

## 14. Documentation

- **`README.md`** must always match reality: setup, env vars, run, test, deploy. Stale setup instructions are the first thing a new joiner hits.
- **`.env.example`** lists every variable with a safe placeholder. Adding an env var without updating it breaks everyone's next pull.
- **Comments explain why.** This codebase is genuinely strong here — the `max: 0` rate-limit footgun, the 404-not-403 rationale, why `createPublicLead` is separate. Preserve that standard; delete comments that restate code.
- **One authoritative document per topic.** Superseded documents move to `docs/archive/` with a dated header. Never leave two live documents disagreeing (assessment L-3).
- Prefer Markdown over generated PDFs for anything reviewable — PDFs cannot be diffed.

**Why this is valuable:** documentation nobody trusts is worse than none, because it costs time to read and then misleads.

---

## 15. Security

**Baseline (all currently in place — do not regress):**

- `helmet` on the API; CORS pinned to a single `CLIENT_ORIGIN`, never `*`
- Request body capped (100KB)
- Two-tier rate limiting: 300/15min general, 20/15min on auth and public form
- bcrypt ≥10 rounds; `passwordHash` never serialised
- All queries through Prisma's parameterised client — no raw SQL
- Dynamic `orderBy` keys constrained by Zod enums
- No secrets in the repository; `JWT_SECRET` generated per environment

**Required going forward:**

- Rotate any credential that has ever been committed or documented — including seeded accounts on a live deployment (assessment H-2).
- Seeded/demo accounts must never be ADMIN on a production deployment.
- Add a CSP to the served frontend (assessment H-4).
- Password minimum 12 characters, common passwords rejected (assessment M-1).
- Never `dangerouslySetInnerHTML` on user content. Currently absent — keep it that way.
- Dependency audit in CI; triage `high`/`critical` before merge.

**Why this is valuable:** these are the controls that make the difference between a breach being inconvenient and being catastrophic. Each is cheap; the cost is only in remembering, which is what a written standard solves.

---

## 16. Performance

- **Index every column that is filtered, sorted, or joined on.** `Lead` indexes `status` and `assignedToId` but not `createdAt`, the default sort — verified as a `Seq Scan` + in-memory `Sort` (assessment H-1).
- **Aggregate in the database, never in the browser.** The dashboard currently fetches 100 rows and counts them client-side, which is both wrong above 100 leads and slower than a `groupBy` (assessment C-2).
- **Paginate every list endpoint.** Never return an unbounded collection — except deliberately and documented, as with the assignee dropdown.
- Avoid N+1: use Prisma `include`/`select` rather than per-row queries. Currently correct.
- Frontend: route-level lazy loading is already in place (bundle 1011KB → 512KB). Keep new routes lazy.
- Debounce user-driven queries (400 ms on search). Cache and deduplicate server state.
- **Measure before optimising.** Use `EXPLAIN` for queries and the bundle analyser for frontend size. No speculative optimisation.

**Why this is valuable:** every issue above is invisible at demo scale and painful at real scale. Indexes and DB-side aggregation are the two changes with the largest effect for the least effort.

---

## 17. Deployment

- **Infrastructure as code.** `render.yaml` defines database, API, and static site together — reproducible, reviewable, diffable.
- **Migrations run on deploy** (`prisma migrate deploy`), never by hand. Migrations must be forward-only and additive where possible.
- **Never seed or mutate data in a build step.** Currently violated (assessment H-2). Use a one-off job.
- **`prisma generate` before `tsc`** — the code imports types from the generated client, so the reverse order fails. Learned the hard way; encoded in the build command.
- **`npm ci --include=dev` in CI/build.** `NODE_ENV=production` makes npm skip `devDependencies`, and the build tools (`@types/*`, `typescript`) live there. Three production deploys failed on exactly this.
- **Config via environment, validated at boot.** `config/env.ts` parses and fails fast on a missing variable — a boot failure beats a 3am runtime error.
- **Never hardcode environment URLs in code.** `VITE_API_BASE_URL` is baked at *build* time by Vite, so changing it requires a rebuild, not a restart. Know this before debugging.
- Deploy on green CI only. Verify the health endpoint after each deploy.

**Free-tier caveats to document, not fix:** the API sleeps after ~15 minutes idle (30–60 s cold start) and free Postgres expires after 90 days. Acceptable for a demo; both are blockers for real users and should be stated to stakeholders rather than discovered.

**Why this is valuable:** every rule here corresponds to a failure this project actually hit. Encoding them means the next person does not rediscover them at deploy time.

---

## Adoption

Do not adopt all seventeen sections at once — that reliably produces resistance and selective compliance. Sequence:

1. **Week 1:** §12 Git workflow and §13 review checklist, plus CI to enforce them mechanically. Process first, because it gates everything else.
2. **Month 1:** §11 testing rules and §15 security requirements on all *new* code. New-code-only avoids a demoralising backlog.
3. **Quarter 1:** §3 component limits and §4 layering rules applied as files are touched, opportunistically — not as a dedicated cleanup sprint.

**The rule that matters most:** standards apply to new and modified code. Retrofitting the entire codebase to a new standard is how standards get abandoned. The two oversized components are the exception, because `TASK_B_MIGRATION_PLAN.md` schedules them explicitly.
