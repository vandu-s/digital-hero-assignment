/**
 * The app's wordmark: a gradient "L" tile + "LeadFlow" text. Reused by the
 * landing navbar, the dashboard sidebar, and the auth layout so the brand
 * mark is defined in exactly one place.
 */
import { Box, Stack, Typography } from "@mui/material";
import { brand } from "../theme";

export function Logo({ size = 34, onDark = false }: { size?: number; onDark?: boolean }) {
  return (
    <Stack direction="row" spacing={1.25} alignItems="center">
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: size / 3.4,
          background: brand.gradient,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontSize: size * 0.47,
          boxShadow: "0 4px 12px rgba(79,70,229,0.35)",
        }}
      >
        L
      </Box>
      <Typography
        variant="h6"
        sx={{
          fontWeight: 800,
          letterSpacing: "-0.01em",
          color: onDark ? "#F8FAFC" : "text.primary",
        }}
      >
        LeadFlow
      </Typography>
    </Stack>
  );
}
