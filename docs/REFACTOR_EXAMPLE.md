# Refactor Example: A Fat Route Handler → Layered Architecture

> This is a worked example of the kind of refactor this codebase's architecture is designed to prevent. The "before" is intentionally bad — it's how the "update a lead" endpoint would look if written as a single Express handler with no layering. The "after" is the pattern actually used in `server/src`. Reading the two side-by-side is the fastest way to understand *why* the Route → Controller → Service → Repository split exists.

---

## ❌ Before — everything in the route

```ts
// routes/leads.ts  (the anti-pattern)
router.put("/:id", async (req, res) => {
  try {
    // 1. auth check inline
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "no token" });
    const token = authHeader.split(" ")[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET) as any;

    // 2. validation inline
    if (!req.body.status && !req.body.name && !req.body.assignedToId) {
      return res.status(400).json({ error: "nothing to update" });
    }
    if (req.body.status && !["NEW","CONTACTED","QUALIFIED","PROPOSAL_SENT","WON","LOST"].includes(req.body.status)) {
      return res.status(400).json({ error: "bad status" });
    }

    // 3. fetch + business rules inline
    const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
    if (!lead) return res.status(404).json({ error: "not found" });

    // members can only touch their own leads, and can't reassign
    if (payload.role === "MEMBER") {
      if (lead.assignedToId !== payload.sub) return res.status(404).json({ error: "not found" });
      if (req.body.assignedToId) return res.status(403).json({ error: "can't assign" });
    }

    // 4. the update + audit logging inline
    const updated = await prisma.lead.update({
      where: { id: req.params.id },
      data: {
        name: req.body.name,
        status: req.body.status,
        assignedToId: req.body.assignedToId,
      },
    });
    if (req.body.status && req.body.status !== lead.status) {
      await prisma.activity.create({
        data: {
          leadId: lead.id,
          actorId: payload.sub,
          type: "STATUS_CHANGED",
          message: `Status changed: ${lead.status} -> ${req.body.status}`,
        },
      });
    }

    return res.json(updated);
  } catch (e) {
    console.log(e);
    return res.status(500).json({ error: "something broke" });
  }
});
```

### Why this is bad

| Problem | Consequence |
|---|---|
| **Five responsibilities in one function** (auth, validation, authorization, persistence, audit) | Impossible to reason about or test any one of them in isolation. |
| **Business rules buried in a route** | The "members can't reassign" rule can't be reused by any other endpoint; the next endpoint copy-pastes it and they drift. |
| **Direct `prisma` + `jwt` + `process.env` access** | Swapping the ORM, the auth library, or the config source means editing every route. |
| **Hand-rolled validation** | Verbose, incomplete (no trim/coercion/email checks), and duplicated across endpoints. |
| **Inconsistent error shapes** (`{error}` strings, ad-hoc status codes) | The client can't handle errors uniformly; every endpoint invents its own format. |
| **`try/catch` in every handler** | Boilerplate; a forgotten `catch` crashes the process. `console.log(e)` leaks nothing useful and clutters logs. |
| **`payload as any`** | Type safety thrown away exactly where security decisions are made. |
| **Silent status-vs-assignment coupling** | Update and audit logic interleaved; easy to log the wrong thing or forget an activity. |

---

## ✅ After — the layered pattern (as used in this codebase)

The same behavior, split so each layer does exactly one job. This mirrors the real files in `server/src`.

**Route** — thin wiring only:
```ts
// routes/lead.routes.ts
router.put("/:id", validate(updateLeadSchema), asyncHandler(updateLeadHandler));
```

**Validation** — declarative, reusable, coercing:
```ts
// validators/lead.schema.ts
export const updateLeadSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    name: z.string().trim().min(1).optional(),
    status: z.enum(LEAD_STATUS_VALUES).optional(),
    assignedToId: z.string().uuid().nullable().optional(),
    // ...other fields
  }).refine((d) => Object.keys(d).length > 0, { message: "At least one field must be provided" }),
});
```

**Controller** — HTTP shape only, no rules:
```ts
// controllers/lead.controller.ts
export async function updateLeadHandler(req: Request, res: Response) {
  const user = requireUser(req); // { id, role } from req.user, set by authenticate
  const lead = await leadService.updateLead(user, req.params.id, req.body);
  res.status(200).json({ success: true, data: lead });
}
```

**Service** — all the business rules, testable without HTTP:
```ts
// services/lead.service.ts
export async function updateLead(user: RequestingUser, id: string, input: UpdateLeadInput) {
  const existing = await getLeadOrThrow(id);

  if (user.role === "MEMBER") {
    if (existing.assignedToId !== user.id) throw AppError.notFound("Lead not found", "LEAD_NOT_FOUND");
    if (input.assignedToId !== undefined) throw AppError.forbidden("Only an admin can reassign", "ASSIGN_FORBIDDEN");
  }

  const updated = await leadRepository.updateLead(id, buildUpdateData(input));

  if (input.status !== undefined && input.status !== existing.status) {
    await createActivity({ leadId: id, actorId: user.id, type: "STATUS_CHANGED",
      message: `Status changed: ${existing.status} -> ${input.status}` });
  }
  return updated;
}
```

**Repository** — the only place that touches Prisma:
```ts
// repositories/lead.repository.ts
export function updateLead(id: string, data: Prisma.LeadUpdateInput) {
  return prisma.lead.update({ where: { id }, data, include: leadListInclude });
}
```

Cross-cutting concerns handled once, globally:
- **Auth** — `authenticate` middleware verifies the JWT and sets a typed `req.user`. The route never touches `jwt`.
- **Errors** — services `throw AppError.notFound(...)`; `asyncHandler` forwards rejections; a single `errorHandler` turns every error into `{ success: false, error: { message, code } }`. No handler writes error JSON.
- **Config** — `env.ts` validates and exposes config; nothing reads `process.env` directly.

---

## Why the new version is better

### Readability
- Each function is short and single-purpose. You can read `updateLead` and understand the *business* rules without wading through token parsing or JSON shaping.
- The route file becomes a one-line table of contents for the API.

### Maintainability
- **The "members can't reassign" rule lives in exactly one place** and is reused by any caller. Compare: in the "before", `note.service` reusing the lead-visibility rule would have to copy it. In the "after", `noteService.createNote` literally calls `leadService.getLeadById` to inherit the same check — one rule, one source of truth.
- Swapping the ORM touches only `repositories/`. Swapping the auth library touches only `utils/jwt.ts` + `authenticate`. Blast radius is bounded by design.
- Consistent error envelope means the frontend has one error-handling path, not one per endpoint.

### Testability
- The service can be unit-tested with a fake repository — no HTTP, no DB — so the role-scoping logic is verifiable in milliseconds.
- The endpoint can be integration-tested via Supertest (as the 46 tests do) without duplicating rule logic in the test.
- A forgotten `try/catch` is impossible to introduce — `asyncHandler` guarantees every rejection reaches the central handler.

### Performance
- Not the primary goal of this refactor, but real: the repository centralizes the Prisma `include`/`select` shape, so every read fetches exactly the needed relations (id/name only for embedded users) instead of ad-hoc over-fetching per route. Validation coercion (`z.coerce.number()`) happens once in the schema rather than being re-parsed in the handler.
- Because error/status handling is centralized, there's no accidental double-send or unhandled promise that would hang a connection.

### Security
- Authorization decisions run on a **typed** `req.user`, not `payload as any`, so a role check can't silently read `undefined`.
- Validation is declarative and complete (trim, coerce, uuid, enum) rather than a partial hand-rolled `if` ladder — malformed input is rejected uniformly before any handler runs.

---

## The one-line summary

> The bad version optimizes for "it works in this one handler." The good version optimizes for **change** — because in a real product, every one of these rules will be edited, reused, and tested dozens of times, and the layered version makes each of those operations touch exactly one small, obvious place.
