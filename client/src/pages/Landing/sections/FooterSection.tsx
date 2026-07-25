import { Box, Container, Stack, Typography } from "@mui/material";
import { Logo } from "../../../components/Logo";
import { DigitalHeroesCredit } from "../../../components/DigitalHeroesCredit";

export function FooterSection() {
  return (
    <Box sx={{ py: 4, borderTop: "1px solid", borderColor: "divider" }}>
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems="center"
          spacing={2}
        >
          <Logo size={28} />
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} LeadFlow. All rights reserved.
          </Typography>
          <DigitalHeroesCredit />
        </Stack>
      </Container>
    </Box>
  );
}
