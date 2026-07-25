import { Box, Card, CardContent, CircularProgress, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppSelector } from "../../hooks/reduxHooks";
import { getLead, updateLead } from "../../services/leadApi";
import { listUsers } from "../../services/userApi";
import { LeadDetail, User } from "../../types/models";
import { LeadForm, LeadFormValues } from "./LeadForm";

export function EditLeadPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useAppSelector((state) => state.auth.user);

  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [users, setUsers] = useState<User[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getLead(id)
      .then(setLead)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (currentUser?.role === "ADMIN") {
      listUsers().then(setUsers);
    }
  }, [currentUser]);

  async function handleSubmit(values: LeadFormValues) {
    if (!id) return;
    setSubmitting(true);
    setError(null);

    try {
      await updateLead(id, {
        name: values.name,
        email: values.email,
        phone: values.phone || undefined,
        company: values.company || undefined,
        message: values.message || undefined,
        source: values.source || undefined,
        value: values.value ? parseFloat(values.value) : undefined,
        status: values.status,
        ...(currentUser?.role === "ADMIN" ? { assignedToId: values.assignedToId || null } : {}),
      });
      navigate(`/leads/${id}`);
    } catch {
      setError("Could not save changes. Please try again.");
    } finally {
      setSubmitting(false);
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

  return (
    <Stack spacing={3} sx={{ maxWidth: 720 }}>
      <Typography variant="h5" fontWeight={700}>
        Edit Lead
      </Typography>

      <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
        <CardContent sx={{ p: 3 }}>
          <LeadForm
            initialValues={{
              name: lead.name,
              email: lead.email,
              phone: lead.phone ?? "",
              company: lead.company ?? "",
              message: lead.message ?? "",
              source: lead.source ?? "",
              value: lead.value ?? "",
              status: lead.status,
              assignedToId: lead.assignedToId ?? "",
            }}
            assignableUsers={currentUser?.role === "ADMIN" ? users : undefined}
            showStatus
            submitLabel="Save Changes"
            submitting={submitting}
            errorMessage={error}
            onSubmit={handleSubmit}
            onCancel={() => navigate(`/leads/${id}`)}
          />
        </CardContent>
      </Card>
    </Stack>
  );
}
