import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ListAltOutlinedIcon from "@mui/icons-material/ListAltOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import PieChartOutlineIcon from "@mui/icons-material/PieChartOutline";
import { Box, Card, CardContent, Container, Grid, Link, Stack, Typography } from "@mui/material";
import { SvgIconComponent } from "@mui/icons-material";

const features: Array<{
  icon: SvgIconComponent;
  color: string;
  title: string;
  description: string;
}> = [
  {
    icon: ListAltOutlinedIcon,
    color: "#6366F1",
    title: "Capture Leads",
    description:
      "Capture leads from your website or any source with our simple and beautiful forms.",
  },
  {
    icon: GroupsOutlinedIcon,
    color: "#22C55E",
    title: "Manage & Assign",
    description: "Assign leads to your team members and track their progress in real-time.",
  },
  {
    icon: BarChartOutlinedIcon,
    color: "#F59E0B",
    title: "Track Activities",
    description: "Log calls, meetings, notes and keep track of every interaction with your leads.",
  },
  {
    icon: PieChartOutlineIcon,
    color: "#3B82F6",
    title: "Reports & Analytics",
    description:
      "Get detailed reports and insights to make data-driven decisions and grow your business.",
  },
];

export function FeaturesSection() {
  return (
    <Box sx={{ py: { xs: 8, md: 12 } }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: "center", mb: 6 }}>
          <Typography variant="h4" fontWeight={800} gutterBottom>
            Everything You Need to Manage Leads
          </Typography>
          <Typography color="text.secondary">
            Powerful features to help your sales team work smarter and close more deals.
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {features.map((feature) => (
            <Grid item xs={12} sm={6} md={3} key={feature.title}>
              <Card
                elevation={0}
                sx={{
                  height: "100%",
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                  p: 1,
                  transition:
                    "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 16px 32px rgba(15,23,42,0.08)",
                    borderColor: "transparent",
                  },
                }}
              >
                <CardContent>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2.5,
                      bgcolor: feature.color,
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mb: 2,
                    }}
                  >
                    <feature.icon fontSize="small" />
                  </Box>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {feature.description}
                  </Typography>
                  <Link
                    href="#lead-form"
                    underline="none"
                    sx={{ fontWeight: 600, fontSize: 14, color: "primary.main" }}
                  >
                    <Stack direction="row" spacing={0.5} alignItems="center" component="span">
                      <span>Learn more</span>
                      <ArrowForwardIcon sx={{ fontSize: 16 }} />
                    </Stack>
                  </Link>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
