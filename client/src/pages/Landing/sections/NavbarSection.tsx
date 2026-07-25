import { AppBar, Box, Button, Container, Link, Stack, Toolbar } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { Logo } from "../../../components/Logo";

const NAV_LINKS = ["Features", "How It Works", "Pricing", "Testimonials", "FAQ", "Contact"];

export function NavbarSection() {
  return (
    <AppBar
      position="sticky"
      color="transparent"
      elevation={0}
      sx={{
        bgcolor: "rgba(255, 255, 255, 0.85)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ justifyContent: "space-between", gap: 2 }}>
          <Logo />

          <Stack
            direction="row"
            spacing={3}
            sx={{ display: { xs: "none", md: "flex" }, mx: "auto" }}
          >
            {NAV_LINKS.map((label) => (
              <Link
                key={label}
                href="#"
                underline="none"
                sx={{
                  color: "text.secondary",
                  fontWeight: 600,
                  fontSize: 14,
                  "&:hover": { color: "text.primary" },
                }}
              >
                {label}
              </Link>
            ))}
          </Stack>

          <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
            <Button component={RouterLink} to="/login" variant="outlined">
              Login
            </Button>
            <Button component={RouterLink} to="/login" variant="contained">
              Get Started
            </Button>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
