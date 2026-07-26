# Task B — Refactor Demonstration

**Target:** `client/src/pages/Users/UsersPage.tsx` (463 lines, 19 `useState` calls)
**Assessment refs:** M-2 (oversized stateful component), M-3 (stale-response race), M-4 (duplicated error extraction)
**Constraint:** **no behaviour change** — same API calls, same UI, same user-visible outcomes.

---

## Why this file

I picked `UsersPage` over `LeadsListPage` (513 lines) deliberately:

- It contains a **real, verified defect** — a stale-response race — not just stylistic bulk, so the refactor fixes something rather than merely rearranging.
- It is the smaller of the two, so the extracted pieces can be proven here and then reused for `LeadsListPage`, which duplicates the same mechanics.
- It is fresh code (the pagination was added this week), which makes it an honest example of how quickly this pattern accumulates rather than a criticism of old work.

---

# 1. Existing code

The problem is concentrated in the state block and the fetch. Verbatim from the current file:

```tsx
export function UsersPage() {
  const currentUser = useAppSelector((state) => state.auth.user);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Server-side pagination + filtering. `page` is 0-based here to match MUI's
  // TablePagination; the API is 1-based, so it's offset by one when fetching.
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "">("");
  const debouncedSearch = useDebouncedValue(search, 400);

  // Create-user dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof CreateForm, string>>>({});
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Delete-confirm dialog state
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    setError(false);
    listUsersPaged({
      page: page + 1,
      limit: rowsPerPage,
      search: debouncedSearch || undefined,
      role: roleFilter || undefined,
    })
      .then((result) => {
        setUsers(result.users);
        setTotal(result.meta.total);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [page, rowsPerPage, debouncedSearch, roleFilter]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Deleting the last row of the final page (or narrowing a filter) can leave
  // us past the end of the result set, which would show an empty table. Step
  // back a page when that happens.
  useEffect(() => {
    if (!loading && total > 0 && page > 0 && page * rowsPerPage >= total) {
      setPage(Math.max(0, Math.ceil(total / rowsPerPage) - 1));
    }
  }, [loading, total, page, rowsPerPage]);

  async function handleCreate() {
    if (!validateForm()) return;
    setCreating(true);
    try {
      await createUser({ /* … */ });
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      setFormErrors({});
      setActionSuccess("User created.");
      reload();
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? "Couldn't create that user. Please try again.";
      setActionError(message);
    } finally {
      setCreating(false);
    }
  }

  // handleDelete repeats the identical catch block with a different fallback string
  // … followed by ~280 lines of JSX containing the table, two dialogs, two snackbars
}
```

---

# 2. Problems in this code

### P1 — Stale-response race (a real defect, not style)

`reload()` has no cancellation. Nothing tracks whether a response is still relevant when it arrives.

**Concrete failure:** type `"jane"` in the search box, then quickly clear it. Two requests are in flight. If the first (`search=jane`, slow) resolves *after* the second (`search=`, fast), the table displays Jane-only results while the search box is empty. State and UI disagree, and no error is shown.

The debounce reduces the window but does not close it — it delays request *dispatch*, not response *ordering*.

**This is verifiably absent here and verifiably present in the sibling page.** `DashboardPage.tsx:51–67` guards the identical pattern with an `active` flag:

```tsx
let active = true;
listLeads(…).then((result) => { if (active) setLeads(result.leads); });
return () => { active = false; };
```

`UsersPage` has no such guard — I grepped for `active` / `AbortController` / `cancel` and found none. So the codebase already knows the right pattern and applies it inconsistently.

A secondary symptom: `setState` after unmount if the user navigates away mid-request.

### P2 — 19 `useState` calls in one component

Four unrelated concerns share one scope: table data, filter/pagination state, create-dialog state, delete-dialog state. Nothing structurally prevents a delete handler from touching form state. This is where stale-closure bugs breed.

### P3 — Page-correction logic is fragile

The out-of-range page effect depends on `loading`, `total`, `page`, and `rowsPerPage`, and fires a `setPage` that re-triggers `reload`. Correct today (I verified paging in a browser), but it is a feedback loop between two effects — the kind of thing that breaks when someone adds a third dependency.

### P4 — Duplicated, type-bypassing error extraction

The nested-optional cast appears twice with different fallback strings. It re-declares the API error envelope inline even though `client/src/types/api.ts` already defines it — so the cast compiles regardless of whether the real shape still matches, silently degrading to the fallback.

### P5 — Not unit-testable

To assert "changing a filter resets to page 1" you must mount 463 lines including two dialogs, two snackbars, an MUI table, and a Redux provider. The logic worth testing is inseparable from the markup.

---

# 3. Refactored version

Three extractions. **No behaviour changes** — same endpoints, same params, same rendering.

### 3a — `client/src/hooks/useServerTable.ts` (new)

Owns pagination, filters, debounce, fetching, and cancellation.

```ts
/**
 * Server-driven table state: pagination, debounced filters, fetch lifecycle.
 *
 * `page` is 0-based to match MUI's TablePagination; callers convert to the
 * API's 1-based page inside `fetcher`. Every fetch is guarded so a response
 * that arrives after a newer request (or after unmount) is discarded - the
 * same pattern DashboardPage uses, applied here consistently.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useDebouncedValue } from "./useDebouncedValue";

export interface ServerTableResult<T> {
  rows: T[];
  total: number;
}

export interface UseServerTableOptions<T, F> {
  fetcher: (args: { page: number; limit: number; filters: F }) => Promise<ServerTableResult<T>>;
  initialFilters: F;
  initialRowsPerPage?: number;
  debounceMs?: number;
}

export function useServerTable<T, F extends Record<string, unknown>>({
  fetcher,
  initialFilters,
  initialRowsPerPage = 10,
  debounceMs = 400,
}: UseServerTableOptions<T, F>) {
  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);
  const [filters, setFiltersState] = useState<F>(initialFilters);
  const debouncedFilters = useDebouncedValue(filters, debounceMs);

  // Monotonic request id: only the newest in-flight request may write state.
  const requestId = useRef(0);

  const load = useCallback(() => {
    const id = ++requestId.current;
    setLoading(true);
    setError(false);

    fetcher({ page: page + 1, limit: rowsPerPage, filters: debouncedFilters })
      .then((result) => {
        if (id !== requestId.current) return; // superseded - discard
        setRows(result.rows);
        setTotal(result.total);
      })
      .catch(() => {
        if (id !== requestId.current) return;
        setError(true);
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [fetcher, page, rowsPerPage, debouncedFilters]);

  useEffect(() => {
    load();
  }, [load]);

  // Changing a filter must return to the first page, otherwise a narrowed
  // result set can leave the user stranded on a now-empty page. Setting both
  // together makes this atomic rather than a reaction to a later render.
  const setFilters = useCallback((next: Partial<F>) => {
    setFiltersState((prev) => ({ ...prev, ...next }));
    setPage(0);
  }, []);

  const changeRowsPerPage = useCallback((next: number) => {
    setRowsPerPage(next);
    setPage(0);
  }, []);

  // Deleting the last row of the final page can leave us past the end.
  useEffect(() => {
    if (!loading && total > 0 && page > 0 && page * rowsPerPage >= total) {
      setPage(Math.max(0, Math.ceil(total / rowsPerPage) - 1));
    }
  }, [loading, total, page, rowsPerPage]);

  return {
    rows, total, loading, error,
    page, setPage,
    rowsPerPage, changeRowsPerPage,
    filters, setFilters,
    reload: load,
  };
}
```

### 3b — `client/src/utils/getApiErrorMessage.ts` (new)

```ts
/**
 * Pulls the server's error message out of an Axios failure, falling back to a
 * caller-supplied string. Typed against the ApiError envelope in types/api.ts
 * so a change to that shape surfaces as a compile error rather than silently
 * degrading every call site to its fallback.
 */
import axios from "axios";
import { ApiError } from "../types/api";

export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiError>(err)) {
    return err.response?.data?.error?.message ?? fallback;
  }
  return fallback;
}
```

### 3c — `UsersPage` after extraction

```tsx
export function UsersPage() {
  const currentUser = useAppSelector((state) => state.auth.user);

  const fetchUsers = useCallback(
    ({ page, limit, filters }: { page: number; limit: number; filters: UserFilters }) =>
      listUsersPaged({
        page,
        limit,
        search: filters.search || undefined,
        role: filters.role || undefined,
      }).then((r) => ({ rows: r.users, total: r.meta.total })),
    []
  );

  const table = useServerTable<User, UserFilters>({
    fetcher: fetchUsers,
    initialFilters: { search: "", role: "" },
  });

  const [savingId, setSavingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  async function handleRoleChange(userId: string, role: Role) {
    setSavingId(userId);
    try {
      await updateUser(userId, { role });
      table.reload();
    } catch (err) {
      setActionError(getApiErrorMessage(err, "Couldn't update that user's role. Please try again."));
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteUser(deleteTarget.id);
      setDeleteTarget(null);
      setActionSuccess("User deleted.");
      table.reload();
    } catch (err) {
      setActionError(getApiErrorMessage(err, "Couldn't delete that user. Please try again."));
      setDeleteTarget(null);
    }
  }

  // …JSX reads table.rows / table.loading / table.page, and the two dialogs
  // become <CreateUserDialog> and <ConfirmDeleteDialog> components.
}
```

`CreateUserDialog` takes `{ open, onClose, onCreated }` and owns its own form, validation, `creating`, and `showPassword` state — five `useState` calls leave `UsersPage` entirely, and the dialog becomes testable on its own.

**Net effect:** 19 `useState` → 5 in the page; ~463 lines → roughly 200 in the page plus two reusable modules and one reusable hook.

---

# 4. Every improvement explained

### Correctness — fixes the stale-response race (P1)

The monotonic `requestId` ref means only the newest request may write state. The `"jane"`-then-clear sequence now discards the stale response instead of rendering it. It also removes the post-unmount `setState` warning.

I chose a request-id counter over the `active` boolean that `DashboardPage` uses, for a specific reason: `active` only distinguishes "this effect run" from "a later one", which handles unmount but not two overlapping in-flight requests from the *same* mounted component. Filter changes produce exactly that overlap. The counter handles both.

### Correctness — makes filter-reset atomic (P3)

Previously, changing a filter called `setSearch` and `setPage(0)` at separate call sites, and each of the four filter controls had to remember to do both. `setFilters` does it in one place, so a fifth filter cannot forget.

### Architecture — one concern per module (P2)

Four concerns become four homes: fetching/pagination in the hook, create-form state in `CreateUserDialog`, confirmation in `ConfirmDeleteDialog`, orchestration in the page. A delete handler can no longer reach form state, because it is not in scope.

### Reuse — deletes the duplication before it spreads

`LeadsListPage` implements the same mechanics with 17 `useState` calls. After this, it consumes `useServerTable` too, and paging/debounce/cancellation logic exists **once**. Today a fix to the off-by-one page conversion must be made twice and can silently diverge.

### Type safety — removes casts that bypass existing types (P4)

`axios.isAxiosError<ApiError>` is a real type guard against the envelope already defined in `types/api.ts`. If that shape changes, this fails to compile — where the inline cast would keep compiling and quietly return the fallback forever.

### Testability (P5)

`useServerTable` is testable with `renderHook` and a stub fetcher — no MUI, no Redux, no markup. The race fix in particular becomes assertable: resolve two promises out of order and check that only the newer result lands. That test is essentially impossible against the current component.

`CreateUserDialog` gets its own validation tests without mounting the users table.

### Performance — a modest, honest gain

Not a headline win. `useServerTable` returns a stable `setFilters`/`changeRowsPerPage` via `useCallback`, so memoised children re-render less; discarding superseded responses avoids a wasted render pass. The real performance work for this page is RTK Query caching (M-3), which this refactor sets up rather than replaces.

---

# 5. Behaviour preservation and verification plan

**Unchanged by construction:** same endpoint, same query params, same 0-based-to-1-based conversion, same 400 ms debounce, same 10-row default, same `[5, 10, 25, 50]` options, same empty/loading/error states, same snackbar copy.

**Deliberately changed:** the stale-response race is fixed. That is a bug fix, and it is the one behavioural difference — worth stating plainly rather than hiding under "no behaviour change".

**How to verify:**

1. **Land tests first.** Per `TASK_B_MIGRATION_PLAN.md` §2.4, `UsersPage` behavioural tests precede this refactor. Without them there is no safety net.
2. **Extract in three separate PRs** — `getApiErrorMessage` (mechanical), then `useServerTable` on `UsersPage` only, then the dialogs. Each is independently revertable.
3. **Gate on each:** `npm run lint`, `npm run test` (both workspaces), `npm run build`, `npm run format:check`.
4. **Browser check:** page 1 → 2 → back; change rows-per-page; type and clear a search quickly (this is where the old code failed); filter by role; delete the last row on the final page; confirm mobile still stacks.
5. **Only then** apply `useServerTable` to `LeadsListPage`, in its own PR.

**What I would not do:** land all three extractions plus the `LeadsListPage` migration in one change. That is the version of this refactor that breaks production, and the reason it belongs in Quarter 1 (after tests exist) rather than Week 1.
