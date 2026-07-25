/**
 * Consistent inline error panel for failed data loads. Gives the user a
 * reason + a retry action instead of a silently-empty screen (the audit
 * flagged list/read fetches that swallowed errors and looked like "no data").
 */
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { Box, Button, Stack, Typography } from "@mui/material";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = "Something went wrong while loading this data.",
  onRetry,
}: ErrorStateProps) {
  return (
    <Box sx={{ py: 6, textAlign: "center" }}>
      <Stack spacing={1.5} alignItems="center">
        <ErrorOutlineIcon sx={{ fontSize: 40, color: "error.main" }} />
        <Typography variant="subtitle1" fontWeight={600}>
          Couldn't load data
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>
          {message}
        </Typography>
        {onRetry && (
          <Button variant="outlined" onClick={onRetry} sx={{ mt: 1 }}>
            Try again
          </Button>
        )}
      </Stack>
    </Box>
  );
}
