/**
 * Admin-only user management. Reachable only via RoleRoute(["ADMIN"]) in
 * the router, but the API also enforces this server-side (authorize
 * ("ADMIN") on every /users route) - the frontend guard is a UX
 * convenience, never the actual security boundary.
 */
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useCallback, useEffect, useState } from "react";
import { useAppSelector } from "../../hooks/reduxHooks";
import { createUser, deleteUser, listUsersPaged, updateUser } from "../../services/userApi";
import { Role, User } from "../../types/models";
import { formatDate } from "../../utils/formatDate";
import { LoadingState } from "../../components/states/LoadingState";
import { ErrorState } from "../../components/states/ErrorState";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { isNonEmpty, isValidEmail } from "../../utils/validation";

interface CreateForm {
  name: string;
  email: string;
  password: string;
  role: Role;
}

const EMPTY_FORM: CreateForm = { name: "", email: "", password: "", role: "MEMBER" };

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

  async function handleRoleChange(userId: string, role: Role) {
    setSavingId(userId);
    try {
      await updateUser(userId, { role });
      reload();
    } catch {
      setActionError("Couldn't update that user's role. Please try again.");
    } finally {
      setSavingId(null);
    }
  }

  function validateForm(): boolean {
    const errors: Partial<Record<keyof CreateForm, string>> = {};
    if (!isNonEmpty(form.name) || form.name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters";
    }
    if (!isValidEmail(form.email)) {
      errors.email = "Enter a valid email address";
    }
    if (form.password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleCreate() {
    if (!validateForm()) return;
    setCreating(true);
    try {
      await createUser({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });
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

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteUser(deleteTarget.id);
      setDeleteTarget(null);
      setActionSuccess("User deleted.");
      reload();
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? "Couldn't delete that user. Please try again.";
      setActionError(message);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Stack spacing={3}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h5" fontWeight={800}>
          Users
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setForm(EMPTY_FORM);
            setFormErrors({});
            setShowPassword(false);
            setCreateOpen(true);
          }}
        >
          New user
        </Button>
      </Stack>

      {/* Both fields carry a label so the theme's stacked label-above-input
          layout gives them the same height; flex-end keeps the inputs on a
          shared baseline the way the leads filter bar does. */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ xs: "stretch", sm: "flex-end" }}
      >
        <TextField
          label="Search"
          placeholder="Search by name or email"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          size="small"
          sx={{ width: { xs: "100%", sm: 320 } }}
          InputLabelProps={{ shrink: true }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          select
          label="Role"
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value as Role | "");
            setPage(0);
          }}
          size="small"
          sx={{ minWidth: 180 }}
          InputLabelProps={{ shrink: true }}
        >
          <MenuItem value="">All roles</MenuItem>
          <MenuItem value="ADMIN">Admin</MenuItem>
          <MenuItem value="MEMBER">Member</MenuItem>
        </TextField>
      </Stack>

      {loading && <LoadingState />}
      {!loading && error && (
        <ErrorState message="We couldn't load the user list." onRetry={reload} />
      )}

      {!loading && !error && (
        <Box
          sx={{
            bgcolor: "background.paper",
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            overflowX: "auto",
          }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => {
                const isSelf = user.id === currentUser?.id;
                return (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar
                          sx={{ width: 32, height: 32, fontSize: 13, bgcolor: "primary.main" }}
                        >
                          {user.name.charAt(0)}
                        </Avatar>
                        <Typography variant="body2" fontWeight={500}>
                          {user.name}
                        </Typography>
                        {isSelf && <Chip label="You" size="small" sx={{ height: 20 }} />}
                      </Stack>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <TextField
                        select
                        size="small"
                        value={user.role}
                        disabled={isSelf || savingId === user.id}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                        sx={{ minWidth: 120 }}
                      >
                        <MenuItem value="ADMIN">Admin</MenuItem>
                        <MenuItem value="MEMBER">Member</MenuItem>
                      </TextField>
                    </TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                    <TableCell align="right">
                      <Tooltip title={isSelf ? "You can't delete your own account" : "Delete user"}>
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            disabled={isSelf}
                            onClick={() => setDeleteTarget(user)}
                            aria-label={`Delete ${user.name}`}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!loading && users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: "text.secondary" }}>
                    {debouncedSearch || roleFilter
                      ? "No users match your filters."
                      : "No users found."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 25, 50]}
            sx={{ borderTop: "1px solid", borderColor: "divider" }}
          />
        </Box>
      )}

      {/* Create user dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>Create user</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              error={Boolean(formErrors.name)}
              helperText={formErrors.name}
              fullWidth
              autoFocus
            />
            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              error={Boolean(formErrors.email)}
              helperText={formErrors.email}
              fullWidth
            />
            <TextField
              label="Temporary password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              error={Boolean(formErrors.password)}
              helperText={formErrors.password ?? "At least 8 characters"}
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((prev) => !prev)}
                      edge="end"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              select
              label="Role"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
              fullWidth
            >
              <MenuItem value="MEMBER">Member</MenuItem>
              <MenuItem value="ADMIN">Admin</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateOpen(false)} disabled={creating}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleCreate} disabled={creating}>
            {creating ? "Creating…" : "Create user"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>Delete user?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This will permanently remove <strong>{deleteTarget?.name}</strong>. A user who still
            owns leads, notes, or activity history can't be deleted until their leads are
            reassigned.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(actionError)}
        autoHideDuration={5000}
        onClose={() => setActionError(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="error" onClose={() => setActionError(null)} variant="filled">
          {actionError}
        </Alert>
      </Snackbar>
      <Snackbar
        open={Boolean(actionSuccess)}
        autoHideDuration={3000}
        onClose={() => setActionSuccess(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" onClose={() => setActionSuccess(null)} variant="filled">
          {actionSuccess}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
