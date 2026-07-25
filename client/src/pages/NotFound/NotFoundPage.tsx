import { Box, Button, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export function NotFoundPage() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        px: 2,
        textAlign: "center",
      }}
    >
      <Typography
        variant="h1"
        sx={{ fontWeight: 700, color: "primary.main", fontSize: { xs: 72, sm: 96 } }}
      >
        404
      </Typography>
      <Typography variant="h5" fontWeight={600}>
        Page not found
      </Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 420 }}>
        The page you're looking for doesn't exist or may have been moved.
      </Typography>
      <Button component={RouterLink} to="/" variant="contained" sx={{ mt: 2 }}>
        Back to home
      </Button>
    </Box>
  );
}
