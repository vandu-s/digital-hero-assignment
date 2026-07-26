# Lead Management CRM

A production-quality Lead Management CRM built as a full-stack monorepo: React + TypeScript on the frontend, Express + TypeScript + Prisma + PostgreSQL on the backend, JWT authentication with role-based access control.

## 🚀 Live Demo

| | URL |
|---|---|
| **Application (start here)** | **https://lead-crm-client.onrender.com** |
| API base | https://lead-crm-api-3sg8.onrender.com/api/v1 |
| API health check | https://lead-crm-api-3sg8.onrender.com/api/v1/health |

### Login credentials

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@crm.test` | `Password123!` |
| **Member** | `jane@crm.test` | `Password123!` |

Log in as **both** roles to see permissions differ: the admin sees every lead plus the **Users** page and can delete and reassign leads; the member sees only leads assigned to them, and has no Users page.

You can also submit the **public capture form** on the landing page without logging in — it creates an unassigned `NEW` lead that then appears in the admin's list.

> **Notes on the free tier.** These run on Render's free plan, which sleeps after inactivity — the **first request can take 30–60 seconds** to wake the service. If the app looks like it's hanging on login, give it a moment and retry.
>
> Opening the API base URL directly in a browser returns `{"success":false,"error":{"message":"Route not found: GET /"}}`. **That is correct behaviour, not an error** — it's a JSON API with no page at `/`. Use the health check link above to confirm the API is up.

## Table of Contents

- [Live Demo](#-live-demo)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Folder Structure](#folder-structure)
- [Database Schema](#database-schema)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running Tests](#running-tests)
- [API Documentation](#api-documentation)
- [Role System](#role-system)
- [Deployment](#deployment)
- [Screenshots](#screenshots)

## Architecture

The backend follows a strict layered architecture — **Route → Middleware → Controller → Service → Repository** — so each layer has exactly one job:

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER (SPA)                          │
│  React + Vite + MUI + Redux Toolkit + React Router + Axios    │
└───────────────────────────────┬─────────────────────────────┘
                                 │  HTTPS / JSON  (JWT in header)
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│                     EXPRESS API SERVER                        │
│                                                               │
│  Route → Middleware → Controller → Service → Repository       │
│   │          │            │           │           │           │
│  URL     auth/role/    HTTP in/    business    DB access      │
│  map     validate      HTTP out     rules      (Prisma)       │
│                                                               │
│  Cross-cutting: error handler · logger · JWT · Zod             │
└───────────────────────────────┬─────────────────────────────┘
                                 │  Prisma Client (SQL)
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL DATABASE                         │
│           User · Lead · Note · Activity                       │
└─────────────────────────────────────────────────────────────┘
```

| Layer | Responsibility | Must NOT do |
|-------|---------------|-------------|
| **Route** | Map URL + method to a controller | Contain business logic |
| **Middleware** | Authenticate, authorize, validate input | Talk to the database |
| **Controller** | Read the HTTP request, call a service, shape the HTTP response | Contain business rules |
| **Service** | Business rules (role scoping, assignment, activity logging) | Know about `req`/`res` |
| **Repository** | Prisma queries only | Contain business rules |

## Tech Stack

**Frontend:** React 18, TypeScript, Vite, Material UI, Redux Toolkit, React Router, Axios
**Backend:** Node.js, Express.js, TypeScript
**Database:** PostgreSQL via Prisma ORM
**Auth:** JWT + bcrypt password hashing
**Validation:** Zod (shared shape between frontend forms and backend middleware)
**Security:** Helmet, CORS allow-list, `express-rate-limit` (tight on auth/public, broad on the API), request-body size cap
**Testing:** Jest + Supertest (backend integration, real DB, no mocking) · Vitest + React Testing Library (frontend)
**Tooling:** ESLint + Prettier across both workspaces
**Deployment:** Render (Static Site + Web Service + PostgreSQL) via `render.yaml`

## Folder Structure

```
lead-management-crm/
├── client/
│   └── src/
│       ├── components/     # Reusable UI (StatusChip, StatCard, ConfirmDialog, Timeline...)
│       ├── layouts/        # DashboardLayout, AuthLayout, PublicLayout
│       ├── pages/          # Route-level screens
│       ├── features/       # Redux slices (auth)
│       ├── services/       # Axios instance + API call functions
│       ├── hooks/          # Typed Redux hooks
│       ├── types/          # Shared TS types mirroring backend shapes
│       ├── utils/          # formatDate, leadStatus config, tokenStorage
│       ├── routes/         # Router, ProtectedRoute, RoleRoute
│       ├── theme/          # MUI theme (palette, typography)
│       └── store/          # Redux store setup
│
└── server/
    └── src/
        ├── config/         # env loader (Zod-validated), Prisma client singleton
        ├── controllers/    # HTTP-shape only
        ├── services/       # Business rules
        ├── repositories/   # Prisma queries only
        ├── middleware/     # authenticate, authorize, validate, errorHandler
        ├── validators/     # Zod schemas
        ├── routes/         # Express routers
        ├── utils/          # AppError, asyncHandler, jwt, password, sanitizeUser
        └── types/          # JwtPayload, req.user/req.validatedQuery augmentation
    └── prisma/
        ├── schema.prisma   # User, Lead, Note, Activity
        └── seed.ts         # Seeds admin/member/system accounts + sample leads
    └── tests/              # Jest + Supertest integration tests
```

## Database Schema

```
User ──(assignedTo)──< Lead        one user has many assigned leads
User ──(createdBy)───< Lead        who created it
Lead ──< Note                      a lead has many notes
Lead ──< Activity                  a lead has many activity/audit entries
User ──< Note / Activity           who authored the note / did the action
```

- **UUIDs** for all primary keys (safe to expose in URLs, no row-count leakage).
- **`Activity`** is an append-only audit log — the Lead Details page's "Timeline" and "Status History" are both just filtered reads of this one table.
- A seeded **`System`** user (`system@crm.internal`) owns leads submitted through the public, unauthenticated landing-page form, since `Lead.createdById` is a required foreign key.

See [`server/prisma/schema.prisma`](server/prisma/schema.prisma) for the full model.

## Getting Started

### Prerequisites

- Node.js ≥ 20
- PostgreSQL ≥ 14 running locally (or a connection string to a hosted instance)

### 1. Clone and install

```bash
git clone <repo-url>
cd lead-management-crm
npm install
```

This installs both `client` and `server` workspaces from the root (npm workspaces).

### 2. Create a database

```bash
createdb lead_crm
# or, if you need a dedicated role:
psql -c "CREATE USER lead_crm_user WITH PASSWORD 'lead_crm_pass' CREATEDB;"
psql -c "CREATE DATABASE lead_crm OWNER lead_crm_user;"
```

### 3. Configure environment variables

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Edit `server/.env` — at minimum, set `DATABASE_URL` to match your local database and generate a real `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

See [Environment Variables](#environment-variables) below for the full list.

### 4. Run migrations and seed the database

```bash
npm run prisma:migrate
npm run prisma:seed
```

This creates the four tables and seeds:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@crm.test` | `Password123!` |
| Member | `jane@crm.test` | `Password123!` |

plus 5 sample leads across the pipeline and a `system@crm.internal` account (not meant for login — it owns public-form submissions).

### 5. Run the app

```bash
npm run dev:server   # http://localhost:4000
npm run dev:client   # http://localhost:5173
```

Open `http://localhost:5173` and log in with the seeded admin account above.

## Environment Variables

**`server/.env`**

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/lead_crm` |
| `PORT` | API server port | `4000` |
| `NODE_ENV` | `development` \| `test` \| `production` | `development` |
| `CLIENT_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |
| `JWT_SECRET` | Secret used to sign JWTs | a long random string |
| `JWT_EXPIRES_IN` | Token lifetime | `1d` |
| `BCRYPT_SALT_ROUNDS` | bcrypt cost factor | `10` |

**`client/.env`**

| Variable | Description | Example |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL of the API | `http://localhost:4000/api/v1` |

## Running Tests

**Backend** — Jest + Supertest integration tests against your local PostgreSQL database (real Prisma queries end-to-end, no mocking):

```bash
npm run test:server        # 73 tests: health, auth (incl. refresh/logout),
                           # leads, notes, users (CRUD + guards), and list
                           # pagination/filter/sort/date-filter/validation
```

**Frontend** — Vitest + React Testing Library (jsdom):

```bash
npm run test --workspace=client            # 23 tests
npm run test:coverage --workspace=client   # with a v8 coverage report
```

Frontend tests cover validation logic, component rendering, the login flow through Redux, the public lead-form validation, and the `ProtectedRoute` / `RoleRoute` guards.

## Linting &amp; Formatting

```bash
npm run lint            # ESLint over client + server (0 errors)
npm run format          # Prettier — write
npm run format:check    # Prettier — verify (used in CI)
```

## API Documentation

Base path: `/api/v1`. Protected routes require `Authorization: Bearer <token>`.

### Auth

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Create an account (always `MEMBER` role) |
| POST | `/auth/login` | Public | Returns `{ user, token }` |
| POST | `/auth/refresh` | Authenticated | Re-issue a fresh token (re-reads the user, so a demotion/deletion takes effect) |
| POST | `/auth/logout` | Authenticated | Acknowledge logout (tokens are stateless — the client discards its copy) |
| GET | `/auth/me` | Authenticated | Current user |

### Leads

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/leads/public` | Public | Landing-page lead capture form — always creates an unassigned `NEW` lead |
| GET | `/leads` | Authenticated | Paginated/filtered/sorted/searched list. Admins see all leads; members see only leads assigned to them |
| POST | `/leads` | Authenticated | Create a lead |
| GET | `/leads/:id` | Authenticated | Lead detail with notes + activity timeline |
| PUT | `/leads/:id` | Authenticated | Update fields/status. Reassigning is admin-only |
| DELETE | `/leads/:id` | Admin only | Delete a lead |

**List query parameters:** `page`, `limit`, `search`, `status`, `assignedToId` (admin assignee filter), `createdFrom` / `createdTo` (inclusive created-date range, `YYYY-MM-DD`), `sortBy` (`createdAt`\|`updatedAt`\|`name`\|`value`\|`status`), `order` (`asc`\|`desc`)

### Notes

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/notes` | Authenticated | Add a note to a lead — also logs a `NOTE_ADDED` activity |

### Users

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/users` | Admin only | List all users |
| POST | `/users` | Admin only | Create a member or admin |
| PUT | `/users/:id` | Admin only | Update name/role (an admin cannot change their own role) |
| DELETE | `/users/:id` | Admin only | Delete a user (blocked with `409` while they still own leads/notes/activity; an admin cannot delete themselves) |

### Response envelopes

```jsonc
// success
{ "success": true, "data": { ... } }

// paginated list
{ "success": true, "data": [ ... ], "meta": { "page": 1, "limit": 10, "total": 57, "totalPages": 6 } }

// error
{ "success": false, "error": { "message": "Lead not found", "code": "LEAD_NOT_FOUND" } }
```

## Role System

| Capability | Admin | Member |
|---|---|---|
| View all leads | ✅ | ❌ (only assigned) |
| Create leads | ✅ | ✅ |
| Assign / reassign leads | ✅ | ❌ |
| Update lead status | ✅ | ✅ (own leads only) |
| Add notes | ✅ | ✅ (own leads only) |
| Delete leads | ✅ | ❌ |
| Manage users | ✅ | ❌ |

A member requesting a lead they don't own receives `404`, not `403` — this avoids confirming the lead's existence to someone unauthorized to see it.

## Deployment

This repo includes a [`render.yaml`](render.yaml) Blueprint that provisions all three pieces on [Render](https://render.com):

1. A managed **PostgreSQL** database
2. A **Web Service** running the Express API (runs `prisma migrate deploy` on every deploy)
3. A **Static Site** serving the built React app, with an SPA rewrite rule so client-side routes work on refresh

To deploy: push this repo to GitHub, then in the Render dashboard choose **New → Blueprint** and point it at the repo. `JWT_SECRET` is auto-generated by Render; `DATABASE_URL` is wired automatically from the provisioned database. After the first deploy, run the seed script once via Render's shell:

```bash
npm run prisma:seed --workspace=server
```

## Security

- **Authentication:** JWT (HS256), secret validated at boot; tokens carry only `{ sub, role }`.
- **Passwords:** bcrypt-hashed; the hash never leaves the service layer (`sanitizeUser` choke point).
- **Authorization:** role checks enforced **server-side** (`authorize("ADMIN")`) — the frontend guards are UX only, never the security boundary.
- **Rate limiting:** `express-rate-limit` — 20 req/15 min on auth + public-form endpoints (anti brute-force / spam), 300 req/15 min across the API.
- **Input validation:** every write endpoint validated with Zod; request bodies capped at 100 KB.
- **Headers & CORS:** Helmet defaults; CORS restricted to the configured client origin.
- **Error hygiene:** internal error detail is only exposed in `development`; production returns generic messages and logs detail server-side.
- **Secrets:** `.env` is gitignored; production secrets are generated/injected by the platform (`render.yaml`), never committed.

## Engineering Documentation (Task B)

The four Task B deliverables are at the repository root:

| Deliverable | Document |
|---|---|
| (a) Assessment | [`TASK_B_ASSESSMENT.md`](TASK_B_ASSESSMENT.md) — every issue with Problem / Location / Why it's a problem / Risk / Recommendation / Effort, plus a prioritisation table |
| (b) Phased migration plan | [`TASK_B_MIGRATION_PLAN.md`](TASK_B_MIGRATION_PLAN.md) — Week 1 / Month 1 / Quarter 1, no big-bang rewrite |
| (c) Before/after refactor | [`TASK_B_REFACTOR.md`](TASK_B_REFACTOR.md) — a real oversized component refactored, with commentary, no behaviour change |
| (d) Standards proposal | [`ENGINEERING_STANDARDS.md`](ENGINEERING_STANDARDS.md) — standards across 17 areas + how to drive adoption on a resistant team |

Supporting documents:

- [`TASK_B_SCORE.md`](TASK_B_SCORE.md) — strict self-assessment against the Task B rubric.
- [`AUDIT_REPORT.md`](docs/AUDIT_REPORT.md) — requirement-by-requirement PASS / PARTIAL / FAIL audit.
- [`Project-Audit.pdf`](docs/Project-Audit.pdf) — the full formatted project-audit report (executive summary, architecture, DB diagram, API/security/test summaries, requirement checklist, QA walkthrough, overall score).

## Screenshots

The app is deployed and browsable — see [Live Demo](#-live-demo) above for the URL and
credentials for both roles, rather than static images that can drift from the real UI.

---

<sub>Built for Digital Heroes Training Task — https://digitalheroesco.com</sub>
