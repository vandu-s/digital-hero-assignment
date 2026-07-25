/**
 * Shared form body for both Create and Edit Lead pages. The two pages
 * differ only in submit behavior (create vs. update) and which fields are
 * editable (assignment/status only make sense once a lead exists) - so
 * this component owns the field layout and validation, while the pages
 * own what happens on submit.
 */
import { Alert, Button, Grid, MenuItem, Stack, TextField } from "@mui/material";
import { FormEvent, useState } from "react";
import { LeadStatus, User } from "../../types/models";
import { LEAD_STATUS_LABEL, LEAD_STATUS_ORDER } from "../../utils/leadStatus";

export interface LeadFormValues {
  name: string;
  email: string;
  phone: string;
  company: string;
  message: string;
  source: string;
  value: string;
  status: LeadStatus;
  assignedToId: string;
}

export const emptyLeadFormValues: LeadFormValues = {
  name: "",
  email: "",
  phone: "",
  company: "",
  message: "",
  source: "",
  value: "",
  status: "NEW",
  assignedToId: "",
};

interface LeadFormProps {
  initialValues: LeadFormValues;
  assignableUsers?: User[]; // omit to hide the assignment field (e.g. member creating a lead)
  showStatus?: boolean; // status only makes sense once a lead exists
  submitLabel: string;
  submitting: boolean;
  errorMessage: string | null;
  onSubmit: (values: LeadFormValues) => void;
  onCancel: () => void;
}

export function LeadForm({
  initialValues,
  assignableUsers,
  showStatus = false,
  submitLabel,
  submitting,
  errorMessage,
  onSubmit,
  onCancel,
}: LeadFormProps) {
  const [values, setValues] = useState<LeadFormValues>(initialValues);

  function set<K extends keyof LeadFormValues>(key: K, value: LeadFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit(values);
  }

  return (
    <Stack component="form" onSubmit={handleSubmit} spacing={3}>
      {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Full name"
            fullWidth
            required
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Email"
            type="email"
            fullWidth
            required
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Phone"
            fullWidth
            value={values.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Company"
            fullWidth
            value={values.company}
            onChange={(e) => set("company", e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Source"
            fullWidth
            placeholder="Website, Referral, Cold Call..."
            value={values.source}
            onChange={(e) => set("source", e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Deal value"
            type="number"
            fullWidth
            inputProps={{ min: 0, step: "0.01" }}
            value={values.value}
            onChange={(e) => set("value", e.target.value)}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Message"
            fullWidth
            multiline
            minRows={3}
            placeholder="The lead's message or any context"
            value={values.message}
            onChange={(e) => set("message", e.target.value)}
          />
        </Grid>

        {showStatus && (
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Status"
              fullWidth
              value={values.status}
              onChange={(e) => set("status", e.target.value as LeadStatus)}
            >
              {LEAD_STATUS_ORDER.map((status) => (
                <MenuItem key={status} value={status}>
                  {LEAD_STATUS_LABEL[status]}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        )}

        {assignableUsers && (
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Assigned to"
              fullWidth
              value={values.assignedToId}
              onChange={(e) => set("assignedToId", e.target.value)}
            >
              <MenuItem value="">Unassigned</MenuItem>
              {assignableUsers.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        )}
      </Grid>

      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <Button onClick={onCancel} color="inherit">
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={submitting}>
          {submitting ? "Saving..." : submitLabel}
        </Button>
      </Stack>
    </Stack>
  );
}
