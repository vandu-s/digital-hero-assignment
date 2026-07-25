/**
 * Read-only account overview. There's no self-service profile-edit
 * endpoint in this API (only admins can update a user, via PUT /users/:id)
 * so this page intentionally shows account details without an edit form
 * rather than building UI for an endpoint that doesn't exist.
 */
import { Avatar, Card, CardContent, Chip, Divider, Stack, Typography } from "@mui/material";
import { useAppSelector } from "../../hooks/reduxHooks";
import { formatDate } from "../../utils/formatDate";
import { DetailRow } from "../../components/DetailRow";

export function SettingsPage() {
  const user = useAppSelector((state) => state.auth.user);

  if (!user) return null;

  return (
    <Stack spacing={3} sx={{ maxWidth: 560 }}>
      <Typography variant="h5" fontWeight={700}>
        Settings
      </Typography>

      <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
            <Avatar sx={{ width: 56, height: 56, bgcolor: "primary.main", fontSize: 20 }}>
              {user.name.charAt(0)}
            </Avatar>
            <Stack>
              <Typography variant="h6" fontWeight={600}>
                {user.name}
              </Typography>
              <Chip
                label={user.role === "ADMIN" ? "Administrator" : "Team Member"}
                size="small"
                color={user.role === "ADMIN" ? "primary" : "default"}
                sx={{ width: "fit-content", mt: 0.5 }}
              />
            </Stack>
          </Stack>

          <Divider sx={{ mb: 2 }} />

          <Stack spacing={2}>
            <DetailRow label="Email" value={user.email} />
            <DetailRow label="Member since" value={formatDate(user.createdAt)} />
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
