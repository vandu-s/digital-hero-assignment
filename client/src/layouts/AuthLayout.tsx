/**
 * Split-screen shell for Login and Register: a gradient brand panel on the
 * left (hidden on mobile) and the form card on the right. Keeping this in
 * one layout means both auth pages share the exact same framing.
 */
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { Box, Paper, Stack, Typography } from "@mui/material";
import { Link as RouterLink, Outlet } from "react-router-dom";
import { Logo } from "../components/Logo";
import { brand } from "../theme";

const VALUE_PROPS = [
  "Capture leads from anywhere in seconds",
  "Assign, track, and never drop a follow-up",
  "See your whole pipeline at a glance",
];

export function AuthLayout() {
  return (
    <Box sx={{ minHeight: "100vh", display: "flex" }}>
      {/* Left brand panel - desktop only */}
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          justifyContent: "space-between",
          width: "44%",
          p: 6,
          color: "#fff",
          background: brand.gradient,
          position: "relative",
          overflow: "hidden",
          "&::after": {
            content: '""',
            position: "absolute",
            bottom: -120,
            right: -120,
            width: 320,
            height: 320,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.10)",
          },
        }}
      >
        <Box
          component={RouterLink}
          to="/"
          sx={{ textDecoration: "none", color: "inherit", filter: "brightness(0) invert(1)" }}
        >
          <Logo />
        </Box>

        <Stack spacing={3} sx={{ position: "relative", zIndex: 1 }}>
          <Typography
            variant="h3"
            sx={{ fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.15 }}
          >
            Close more deals, with less busywork.
          </Typography>
          <Stack spacing={1.5}>
            {VALUE_PROPS.map((text) => (
              <Stack key={text} direction="row" spacing={1.5} alignItems="center">
                <CheckCircleRoundedIcon sx={{ fontSize: 20, opacity: 0.9 }} />
                <Typography variant="body1" sx={{ opacity: 0.95 }}>
                  {text}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Stack>

        <Typography variant="body2" sx={{ opacity: 0.7, position: "relative", zIndex: 1 }}>
          © {new Date().getFullYear()} LeadFlow
        </Typography>
      </Box>

      {/* Right form panel */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.default",
          px: 2,
          py: 6,
        }}
      >
        <Box sx={{ width: "100%", maxWidth: 400 }}>
          <Box sx={{ display: { md: "none" }, mb: 4, textAlign: "center" }}>
            <Box
              component={RouterLink}
              to="/"
              sx={{ textDecoration: "none", display: "inline-block" }}
            >
              <Logo />
            </Box>
          </Box>

          <Paper
            elevation={0}
            sx={{
              width: "100%",
              p: { xs: 3, sm: 4 },
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              boxShadow: "0 8px 30px rgba(15,23,42,0.06)",
            }}
          >
            <Outlet />
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
