import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { DetailRow } from "../../components/DetailRow";
import { StatusChip } from "../../components/StatusChip";
import { Timeline } from "../../components/Timeline";
import { useAppSelector } from "../../hooks/reduxHooks";
import { deleteLead, getLead, updateLead } from "../../services/leadApi";
import { createNote } from "../../services/noteApi";
import { listUsers } from "../../services/userApi";
import { LeadDetail, LeadStatus, User } from "../../types/models";
import { formatCurrency, formatDateTime, formatRelativeTime } from "../../utils/formatDate";
import { LEAD_STATUS_LABEL, LEAD_STATUS_ORDER } from "../../utils/leadStatus";

export function LeadDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useAppSelector((state) => state.auth.user);
  const isAdmin = currentUser?.role === "ADMIN";

  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [noteBody, setNoteBody] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [assignSaving, setAssignSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadLead = useCallback(() => {
    if (!id) return;
    setLoading(true);
    getLead(id)
      .then(setLead)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(loadLead, [loadLead]);

  useEffect(() => {
    if (isAdmin) {
      listUsers().then(setUsers);
    }
  }, [isAdmin]);

  async function handleStatusChange(status: LeadStatus) {
    if (!id) return;
    setStatusSaving(true);
    setActionError(null);
    try {
      await updateLead(id, { status });
      loadLead();
    } catch {
      setActionError("Could not update the status.");
    } finally {
      setStatusSaving(false);
    }
  }

  async function handleAssign(assignedToId: string) {
    if (!id) return;
    setAssignSaving(true);
    setActionError(null);
    try {
      await updateLead(id, { assignedToId: assignedToId || null });
      loadLead();
    } catch {
      setActionError("Could not update the assignment.");
    } finally {
      setAssignSaving(false);
    }
  }

  async function handleAddNote(event: FormEvent) {
    event.preventDefault();
    if (!id || !noteBody.trim()) return;

    setAddingNote(true);
    setActionError(null);
    try {
      await createNote({ leadId: id, body: noteBody.trim() });
      setNoteBody("");
      loadLead();
    } catch {
      setActionError("Could not add the note.");
    } finally {
      setAddingNote(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    setDeleting(true);
    try {
      await deleteLead(id);
      navigate("/leads");
    } catch {
      setActionError("Could not delete the lead.");
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!lead) {
    return <Typography color="text.secondary">Lead not found.</Typography>;
  }

  const timelineEntries = lead.activities.map((activity) => ({
    id: activity.id,
    timestamp: activity.createdAt,
    content: (
      <Box>
        <Typography variant="body2">
          <strong>{activity.actor.name}</strong> {activity.message.toLowerCase()}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {formatRelativeTime(activity.createdAt)}
        </Typography>
      </Box>
    ),
  }));

  return (
    <Stack spacing={3}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <IconButton component={RouterLink} to="/leads" size="small">
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>
          {lead.name}
        </Typography>
        <StatusChip status={lead.status} />
        <Button
          component={RouterLink}
          to={`/leads/${lead.id}/edit`}
          startIcon={<EditOutlinedIcon />}
          size="small"
        >
          Edit
        </Button>
        {isAdmin && (
          <IconButton size="small" color="error" onClick={() => setDeleteOpen(true)}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        )}
      </Stack>

      {actionError && <Alert severity="error">{actionError}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Stack spacing={3}>
            <Card
              elevation={0}
              sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider" }}
            >
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Contact
                </Typography>
                <Stack spacing={1.5} sx={{ mt: 2 }}>
                  <DetailRow label="Email" value={lead.email} />
                  <DetailRow label="Phone" value={lead.phone ?? "—"} />
                  <DetailRow label="Company" value={lead.company ?? "—"} />
                  <DetailRow label="Source" value={lead.source ?? "—"} />
                  <DetailRow label="Value" value={formatCurrency(lead.value)} />
                  <DetailRow label="Created by" value={lead.createdBy.name} />
                  <DetailRow label="Created" value={formatDateTime(lead.createdAt)} />
                </Stack>

                {lead.message && (
                  <Stack spacing={0.5} sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Message
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                      {lead.message}
                    </Typography>
                  </Stack>
                )}
              </CardContent>
            </Card>

            <Card
              elevation={0}
              sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider" }}
            >
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Status
                </Typography>
                <TextField
                  select
                  fullWidth
                  size="small"
                  value={lead.status}
                  disabled={statusSaving}
                  onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
                  sx={{ mt: 1 }}
                >
                  {LEAD_STATUS_ORDER.map((status) => (
                    <MenuItem key={status} value={status}>
                      {LEAD_STATUS_LABEL[status]}
                    </MenuItem>
                  ))}
                </TextField>
              </CardContent>
            </Card>

            <Card
              elevation={0}
              sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider" }}
            >
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Assignment
                </Typography>
                {isAdmin ? (
                  <TextField
                    select
                    fullWidth
                    size="small"
                    value={lead.assignedToId ?? ""}
                    disabled={assignSaving}
                    onChange={(e) => handleAssign(e.target.value)}
                    sx={{ mt: 1 }}
                  >
                    <MenuItem value="">Unassigned</MenuItem>
                    {users.map((user) => (
                      <MenuItem key={user.id} value={user.id}>
                        {user.name}
                      </MenuItem>
                    ))}
                  </TextField>
                ) : (
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1 }}>
                    <Avatar sx={{ width: 32, height: 32, fontSize: 13, bgcolor: "primary.main" }}>
                      {lead.assignedTo?.name.charAt(0) ?? "?"}
                    </Avatar>
                    <Typography variant="body2">{lead.assignedTo?.name ?? "Unassigned"}</Typography>
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        <Grid item xs={12} md={7}>
          <Stack spacing={3}>
            <Card
              elevation={0}
              sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider" }}
            >
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Timeline
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Timeline entries={timelineEntries} />
                </Box>
              </CardContent>
            </Card>

            <Card
              elevation={0}
              sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider" }}
            >
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Notes
                </Typography>

                <Box component="form" onSubmit={handleAddNote} sx={{ mt: 2, mb: 3 }}>
                  <Stack direction="row" spacing={1.5}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Write a note..."
                      value={noteBody}
                      onChange={(e) => setNoteBody(e.target.value)}
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={addingNote || !noteBody.trim()}
                    >
                      Add
                    </Button>
                  </Stack>
                </Box>

                <Stack spacing={2} divider={<Divider />}>
                  {lead.notes.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      No notes yet.
                    </Typography>
                  )}
                  {lead.notes.map((note) => (
                    <Box key={note.id}>
                      <Typography variant="body2">{note.body}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {note.author.name} · {formatRelativeTime(note.createdAt)}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete this lead?"
        description={`This will permanently delete "${lead.name}" and all of its notes and activity. This cannot be undone.`}
        confirmLabel="Delete"
        confirmColor="error"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </Stack>
  );
}
