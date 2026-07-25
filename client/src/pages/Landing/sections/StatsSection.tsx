import { Box, Container, Grid, Typography } from "@mui/material";

const stats = [
  { label: "Leads Managed", value: "10K+" },
  { label: "Happy Customers", value: "500+" },
  { label: "Satisfaction Rate", value: "98%" },
  { label: "Support Available", value: "24/7" },
];

export function StatsSection() {
  return (
    <Box
      sx={{
        py: { xs: 6, md: 8 },
        bgcolor: "white",
        borderTop: "1px solid",
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Container maxWidth="lg">
        <Typography
          variant="body2"
          color="text.secondary"
          textAlign="center"
          sx={{ mb: 4, fontWeight: 500 }}
        >
          Trusted by 500+ businesses worldwide
        </Typography>
        <Grid container spacing={4}>
          {stats.map((stat) => (
            <Grid item xs={6} md={3} key={stat.label} sx={{ textAlign: "center" }}>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {stat.value}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {stat.label}
              </Typography>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
