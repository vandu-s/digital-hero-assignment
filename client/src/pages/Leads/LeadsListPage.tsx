/**
 * The main Leads table: server-side pagination, sorting, filtering, and
 * search all forward directly to GET /leads (see services/leadApi.ts),
 * rather than fetching everything and filtering client-side - this is
 * what keeps the page fast as the lead count grows.
 */
import AddIcon from "@mui/icons-material/Add";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import FilterAltOffOutlinedIcon from "@mui/icons-material/FilterAltOffOutlined";
import {
  Box,
  Button,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { DataGrid, GridColDef, GridPaginationModel, GridSortModel } from "@mui/x-data-grid";
import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { StatusChip } from "../../components/StatusChip";
import { useAppSelector } from "../../hooks/reduxHooks";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { deleteLead, listLeads } from "../../services/leadApi";
import { listUsers } from "../../services/userApi";
import { Lead, LeadStatus, User } from "../../types/models";
import { formatDate } from "../../utils/formatDate";
import { LEAD_STATUS_LABEL, LEAD_STATUS_ORDER } from "../../utils/leadStatus";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { ErrorState } from "../../components/states/ErrorState";

const SORTABLE_FIELDS = ["createdAt", "updatedAt", "name", "value", "status"] as const;
type SortableField = (typeof SORTABLE_FIELDS)[number];

function isSortableField(field: string): field is SortableField {
  return (SORTABLE_FIELDS as readonly string[]).includes(field);
}

// A polished empty state for the DataGrid instead of the bare "No rows" text.
// When filters are active, it explains that and offers to clear them rather
// than implying the pipeline is truly empty.
interface LeadsEmptyOverlayProps {
  filtered?: boolean;
  onClearFilters?: () => void;
}

function LeadsEmptyOverlay({ filtered, onClearFilters }: LeadsEmptyOverlayProps) {
  return (
    <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ height: "100%", py: 6 }}>
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "grey.100",
          color: "text.secondary",
        }}
      >
        {filtered ? <FilterAltOffOutlinedIcon /> : <InboxOutlinedIcon />}
      </Box>
      <Typography variant="subtitle1" fontWeight={700}>
        {filtered ? "No leads match your filters" : "No leads yet"}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ maxWidth: 320, textAlign: "center" }}
      >
        {filtered
          ? "Try adjusting or clearing your filters to see more leads."
          : "Leads you create or that are assigned to you will show up here."}
      </Typography>
      {filtered ? (
        <Button
          variant="outlined"
          startIcon={<FilterAltOffOutlinedIcon />}
          onClick={onClearFilters}
        >
          Clear filters
        </Button>
      ) : (
        <Button component={RouterLink} to="/leads/new" variant="contained" startIcon={<AddIcon />}>
          Create Lead
        </Button>
      )}
    </Stack>
  );
}

export function LeadsListPage() {
  const navigate = useNavigate();
  const currentUser = useAppSelector((state) => state.auth.user);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [search, setSearch] = useState("");
  // Debounced so typing doesn't fire one API request per keystroke.
  const debouncedSearch = useDebouncedValue(search, 400);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "">("");
  // Admin-only extra filters. Members always see only their own leads, so an
  // assignee filter would be meaningless for them.
  const isAdmin = currentUser?.role === "ADMIN";
  const [assigneeFilter, setAssigneeFilter] = useState<string>("");
  const [createdFrom, setCreatedFrom] = useState<string>("");
  const [createdTo, setCreatedTo] = useState<string>("");
  const [assignableUsers, setAssignableUsers] = useState<User[]>([]);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [sortModel, setSortModel] = useState<GridSortModel>([{ field: "createdAt", sort: "desc" }]);

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuLeadId, setMenuLeadId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [deleting, setDeleting] = useState(false);

  const sortBy: SortableField =
    sortModel[0] && isSortableField(sortModel[0].field) ? sortModel[0].field : "createdAt";
  const order = sortModel[0]?.sort ?? "desc";

  // Any search/filter active? Drives the "Clear filters" button's visibility.
  const hasActiveFilters = Boolean(
    search || statusFilter || assigneeFilter || createdFrom || createdTo
  );

  function clearFilters() {
    setSearch("");
    setStatusFilter("");
    setAssigneeFilter("");
    setCreatedFrom("");
    setCreatedTo("");
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  }

  // Populate the assignee filter dropdown once, for admins only.
  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    listUsers()
      .then((users) => {
        if (active) setAssignableUsers(users);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [isAdmin]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(false);

    listLeads({
      page: paginationModel.page + 1,
      limit: paginationModel.pageSize,
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      assignedToId: isAdmin && assigneeFilter ? assigneeFilter : undefined,
      createdFrom: createdFrom || undefined,
      createdTo: createdTo || undefined,
      sortBy,
      order: order as "asc" | "desc",
    })
      .then((result) => {
        if (!isMounted) return;
        setLeads(result.leads);
        setTotal(result.meta.total);
      })
      .catch(() => {
        if (isMounted) setError(true);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [
    paginationModel,
    sortBy,
    order,
    debouncedSearch,
    statusFilter,
    isAdmin,
    assigneeFilter,
    createdFrom,
    createdTo,
  ]);

  function handleDeleteConfirmed() {
    if (!deleteTarget) return;
    setDeleting(true);
    deleteLead(deleteTarget.id)
      .then(() => {
        setLeads((prev) => prev.filter((lead) => lead.id !== deleteTarget.id));
        setTotal((prev) => prev - 1);
      })
      .finally(() => {
        setDeleting(false);
        setDeleteTarget(null);
      });
  }

  const columns: GridColDef<Lead>[] = useMemo(
    () => [
      { field: "name", headerName: "Name", flex: 1, minWidth: 160 },
      {
        field: "company",
        headerName: "Company",
        flex: 1,
        minWidth: 140,
        renderCell: (params) => params.row.company ?? "—",
      },
      {
        field: "status",
        headerName: "Status",
        width: 150,
        sortable: true,
        renderCell: (params) => <StatusChip status={params.row.status} />,
      },
      {
        field: "assignedTo",
        headerName: "Assigned",
        width: 150,
        sortable: false,
        renderCell: (params) => params.row.assignedTo?.name ?? "Unassigned",
      },
      {
        field: "createdAt",
        headerName: "Created",
        width: 130,
        renderCell: (params) => formatDate(params.row.createdAt),
      },
      {
        field: "actions",
        headerName: "",
        width: 60,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setMenuAnchor(e.currentTarget);
              setMenuLeadId(params.row.id);
            }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        ),
      },
    ],
    []
  );

  const menuLead = leads.find((lead) => lead.id === menuLeadId) ?? null;

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ sm: "center" }}
        spacing={2}
      >
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Leads
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {total} {total === 1 ? "lead" : "leads"} in your pipeline
          </Typography>
        </Box>
        <Button component={RouterLink} to="/leads/new" variant="contained" startIcon={<AddIcon />}>
          Create Lead
        </Button>
      </Stack>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ xs: "stretch", sm: "flex-end" }}
      >
        <TextField
          size="small"
          label="Search"
          placeholder="Search leads..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPaginationModel((prev) => ({ ...prev, page: 0 }));
          }}
          sx={{ minWidth: 240 }}
        />
        <TextField
          size="small"
          select
          label="Status"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as LeadStatus | "");
            setPaginationModel((prev) => ({ ...prev, page: 0 }));
          }}
          sx={{ minWidth: 180 }}
          SelectProps={{ native: true }}
          InputLabelProps={{ shrink: true }}
        >
          <option value="">All statuses</option>
          {LEAD_STATUS_ORDER.map((status) => (
            <option key={status} value={status}>
              {LEAD_STATUS_LABEL[status]}
            </option>
          ))}
        </TextField>

        {isAdmin && (
          <TextField
            size="small"
            select
            label="Assigned to"
            value={assigneeFilter}
            onChange={(e) => {
              setAssigneeFilter(e.target.value);
              setPaginationModel((prev) => ({ ...prev, page: 0 }));
            }}
            sx={{ minWidth: 180 }}
            SelectProps={{ native: true }}
            InputLabelProps={{ shrink: true }}
          >
            <option value="">Anyone</option>
            {assignableUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </TextField>
        )}

        <TextField
          size="small"
          type="date"
          label="From"
          value={createdFrom}
          onChange={(e) => {
            setCreatedFrom(e.target.value);
            setPaginationModel((prev) => ({ ...prev, page: 0 }));
          }}
          sx={{ minWidth: 150 }}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          size="small"
          type="date"
          label="To"
          value={createdTo}
          onChange={(e) => {
            setCreatedTo(e.target.value);
            setPaginationModel((prev) => ({ ...prev, page: 0 }));
          }}
          sx={{ minWidth: 150 }}
          InputLabelProps={{ shrink: true }}
        />

        {hasActiveFilters && (
          <Button
            size="small"
            color="inherit"
            onClick={clearFilters}
            startIcon={<FilterAltOffOutlinedIcon />}
            sx={{ color: "text.secondary", whiteSpace: "nowrap", height: 40 }}
          >
            Clear filters
          </Button>
        )}
      </Stack>

      <Box
        sx={{
          bgcolor: "background.paper",
          borderRadius: 4,
          border: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
          boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
        }}
      >
        {error ? (
          <ErrorState
            message="We couldn't load your leads."
            onRetry={() => setPaginationModel((prev) => ({ ...prev }))}
          />
        ) : (
          <DataGrid
            rows={leads}
            columns={columns}
            loading={loading}
            rowCount={total}
            paginationMode="server"
            sortingMode="server"
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            sortModel={sortModel}
            onSortModelChange={setSortModel}
            pageSizeOptions={[10, 25, 50]}
            disableColumnMenu
            disableRowSelectionOnClick
            onRowClick={(params) => navigate(`/leads/${params.row.id}`)}
            autoHeight
            rowHeight={60}
            columnHeaderHeight={52}
            slots={{
              noRowsOverlay: () => (
                <LeadsEmptyOverlay filtered={hasActiveFilters} onClearFilters={clearFilters} />
              ),
            }}
            sx={{
              border: "none",
              // Give the empty-state overlay room to breathe (autoHeight
              // collapses an empty grid otherwise).
              "--DataGrid-overlayHeight": "320px",
              "& .MuiDataGrid-columnHeaders": {
                bgcolor: "#FBFCFE",
                borderBottom: "1px solid",
                borderColor: "divider",
              },
              "& .MuiDataGrid-columnHeaderTitle": {
                fontWeight: 600,
                fontSize: 12,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "text.secondary",
              },
              "& .MuiDataGrid-row": { cursor: "pointer" },
              "& .MuiDataGrid-cell": { borderColor: "#EEF2F7" },
              "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within": { outline: "none" },
              "& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within": {
                outline: "none",
              },
            }}
          />
        )}
      </Box>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem
          onClick={() => {
            if (menuLead) navigate(`/leads/${menuLead.id}`);
            setMenuAnchor(null);
          }}
        >
          <ListItemIcon>
            <VisibilityOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuLead) navigate(`/leads/${menuLead.id}/edit`);
            setMenuAnchor(null);
          }}
        >
          <ListItemIcon>
            <EditOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        {currentUser?.role === "ADMIN" && (
          <MenuItem
            onClick={() => {
              setDeleteTarget(menuLead);
              setMenuAnchor(null);
            }}
            sx={{ color: "error.main" }}
          >
            <ListItemIcon>
              <DeleteOutlineIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        )}
      </Menu>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this lead?"
        description={`This will permanently delete "${deleteTarget?.name}" and all of its notes and activity. This cannot be undone.`}
        confirmLabel="Delete"
        confirmColor="error"
        loading={deleting}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeleteTarget(null)}
      />
    </Stack>
  );
}
