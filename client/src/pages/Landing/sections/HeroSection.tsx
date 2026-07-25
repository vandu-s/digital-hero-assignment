import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import BoltOutlinedIcon from "@mui/icons-material/BoltOutlined";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import { Box, Button, Container, Grid, Stack, SvgIconTypeMap, Typography } from "@mui/material";
import { OverridableComponent } from "@mui/material/OverridableComponent";
import { Link as RouterLink } from "react-router-dom";
import { brand } from "../../../theme";
import { HeroDashboardPreview } from "./HeroDashboardPreview";

function TrustPoint({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: OverridableComponent<SvgIconTypeMap>;
  title: string;
  subtitle: string;
}) {
  return (
    <Stack direction="row" spacing={1.25} alignItems="flex-start">
      <Box sx={{ color: "primary.main", mt: 0.25 }}>
        <Icon fontSize="small" />
      </Box>
      <Box>
        <Typography variant="body2" fontWeight={700}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      </Box>
    </Stack>
  );
}

export function HeroSection() {
  return (
    <Box
      sx={{
        position: "relative",
        py: { xs: 7, md: 11 },
        overflow: "hidden",
        // Soft brand wash behind the hero, echoing the reference.
        background: "linear-gradient(180deg, #FFFFFF 0%, #F5F3FF 100%)",
        "&::before": {
          content: '""',
          position: "absolute",
          top: -160,
          right: -120,
          width: 640,
          height: 640,
          borderRadius: "50%",
          background: "radial-gradient(closest-side, rgba(124,58,237,0.12), transparent)",
          zIndex: 0,
        },
      }}
    >
      <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
        <Grid container spacing={6} alignItems="center">
          {/* Left: headline + copy + CTAs + trust points */}
          <Grid item xs={12} md={6}>
            <Stack spacing={3}>
              <Typography
                variant="h1"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: 40, sm: 52, md: 58 },
                  lineHeight: 1.05,
                  letterSpacing: "-0.03em",
                }}
              >
                Manage Leads.
                <br />
                Close Deals.
                <br />
                <Box component="span" sx={{ color: brand.secondary }}>
                  Grow Your Business.
                </Box>
              </Typography>

              <Typography
                variant="h6"
                color="text.secondary"
                sx={{ fontWeight: 400, maxWidth: 480 }}
              >
                A simple and powerful lead management system designed for small sales teams to
                capture, track, and convert more leads into customers.
              </Typography>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ pt: 1 }}>
                <Button
                  component={RouterLink}
                  to="/login"
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForwardIcon />}
                >
                  Get Started
                </Button>
              </Stack>

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={{ xs: 2, sm: 4 }}
                sx={{ pt: 2 }}
              >
                <TrustPoint
                  icon={ShieldOutlinedIcon}
                  title="Secure & Reliable"
                  subtitle="Your data is safe with us"
                />
                <TrustPoint
                  icon={BoltOutlinedIcon}
                  title="Easy to Use"
                  subtitle="Simple interface for everyone"
                />
                <TrustPoint
                  icon={TrendingUpOutlinedIcon}
                  title="Boost Sales"
                  subtitle="Track leads and close more deals"
                />
              </Stack>
            </Stack>
          </Grid>

          {/* Right: framed dashboard preview */}
          <Grid item xs={12} md={6}>
            <HeroDashboardPreview />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
