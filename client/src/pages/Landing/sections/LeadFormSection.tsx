import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  TextField,
  Typography,
} from "@mui/material";
import { FormEvent, useState } from "react";
import { createPublicLead } from "../../../services/publicLeadApi";
import { isNonEmpty, isValidEmail } from "../../../utils/validation";

interface FieldErrors {
  name?: string;
  email?: string;
}

export function LeadFormSection() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (!isNonEmpty(name)) errors.name = "Name is required";
    if (!isNonEmpty(email)) errors.email = "Email is required";
    else if (!isValidEmail(email)) errors.email = "Enter a valid email address";
    return errors;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setError(null);

    try {
      await createPublicLead({
        name: name.trim(),
        email: email.trim(),
        company: company.trim() || undefined,
        phone: phone.trim() || undefined,
        message: message.trim() || undefined,
        source: "Website",
      });
      setSubmitted(true);
      setName("");
      setEmail("");
      setCompany("");
      setPhone("");
      setMessage("");
      setFieldErrors({});
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box id="lead-form" sx={{ py: { xs: 8, md: 12 } }}>
      <Container maxWidth="sm">
        <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Typography variant="h5" fontWeight={700} gutterBottom textAlign="center">
              Talk to our team
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 3 }}>
              Tell us a bit about yourself and we'll be in touch.
            </Typography>

            {submitted ? (
              <Alert severity="success">
                Thanks! We've received your details and will reach out shortly.
              </Alert>
            ) : (
              <Box component="form" onSubmit={handleSubmit} noValidate>
                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Full name"
                      fullWidth
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      error={Boolean(fieldErrors.name)}
                      helperText={fieldErrors.name}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Email"
                      type="email"
                      fullWidth
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      error={Boolean(fieldErrors.email)}
                      helperText={fieldErrors.email}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Company"
                      fullWidth
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Phone"
                      fullWidth
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Message"
                      fullWidth
                      multiline
                      minRows={3}
                      placeholder="How can we help?"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </Grid>
                </Grid>

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={submitting}
                  sx={{ mt: 3 }}
                >
                  {submitting ? "Sending..." : "Submit"}
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
