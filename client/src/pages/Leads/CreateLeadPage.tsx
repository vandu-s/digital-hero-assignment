import { Card, CardContent, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createLead } from "../../services/leadApi";
import { listUsers } from "../../services/userApi";
import { User } from "../../types/models";
import { useAppSelector } from "../../hooks/reduxHooks";
import { emptyLeadFormValues, LeadForm, LeadFormValues } from "./LeadForm";

export function CreateLeadPage() {
  const navigate = useNavigate();
  const currentUser = useAppSelector((state) => state.auth.user);
  const [users, setUsers] = useState<User[] | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only admins can assign a lead at creation time (see server-side rule:
  // members creating a lead cannot set assignedToId either).
  useEffect(() => {
    if (currentUser?.role === "ADMIN") {
      listUsers().then(setUsers);
    }
  }, [currentUser]);

  async function handleSubmit(values: LeadFormValues) {
    setSubmitting(true);
    setError(null);

    try {
      const lead = await createLead({
        name: values.name,
        email: values.email,
        phone: values.phone || undefined,
        company: values.company || undefined,
        message: values.message || undefined,
        source: values.source || undefined,
        value: values.value ? parseFloat(values.value) : undefined,
        assignedToId: values.assignedToId || undefined,
      });
      navigate(`/leads/${lead.id}`);
    } catch {
      setError("Could not create the lead. Please check the form and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Stack spacing={3} sx={{ maxWidth: 720 }}>
      <Typography variant="h5" fontWeight={700}>
        Create Lead
      </Typography>

      <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
        <CardContent sx={{ p: 3 }}>
          <LeadForm
            initialValues={emptyLeadFormValues}
            assignableUsers={users}
            showStatus={false}
            submitLabel="Create Lead"
            submitting={submitting}
            errorMessage={error}
            onSubmit={handleSubmit}
            onCancel={() => navigate("/leads")}
          />
        </CardContent>
      </Card>
    </Stack>
  );
}
