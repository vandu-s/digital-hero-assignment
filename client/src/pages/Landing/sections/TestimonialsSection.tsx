import { Avatar, Box, Card, CardContent, Container, Grid, Stack, Typography } from "@mui/material";

const testimonials = [
  {
    quote: "We went from tracking leads in spreadsheets to a real pipeline in one afternoon.",
    name: "Priya Sharma",
    role: "Founder, Studio Loop",
  },
  {
    quote: "The assignment and status tracking alone cut our response time in half.",
    name: "Marcus Lee",
    role: "Sales Lead, Northwind",
  },
  {
    quote: "Simple enough that the whole team adopted it in a day, no training needed.",
    name: "Elena Cruz",
    role: "Ops Manager, Brightpath",
  },
];

export function TestimonialsSection() {
  return (
    <Box
      sx={{
        py: { xs: 8, md: 12 },
        bgcolor: "white",
        borderTop: "1px solid",
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ textAlign: "center", mb: 6 }}>
          <Typography variant="h4" fontWeight={700}>
            Loved by growing teams
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {testimonials.map((testimonial) => (
            <Grid item xs={12} md={4} key={testimonial.name}>
              <Card
                elevation={0}
                sx={{
                  height: "100%",
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <CardContent>
                  <Typography variant="body1" sx={{ mb: 3, fontStyle: "italic" }}>
                    &ldquo;{testimonial.quote}&rdquo;
                  </Typography>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{ bgcolor: "primary.main", width: 36, height: 36, fontSize: 14 }}>
                      {testimonial.name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {testimonial.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {testimonial.role}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
