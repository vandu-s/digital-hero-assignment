/**
 * A decorative, non-interactive "product preview" panel for the landing hero,
 * echoing the reference marketing image: a framed mini-dashboard with a dark
 * sidebar rail, a row of stat chips, and the real status donut fed sample
 * numbers. Purely presentational — no data fetching, no routing.
 */
import { Box, Paper, Stack, Typography } from "@mui/material";
import { LeadsStatusDonut } from "../../../components/LeadsStatusDonut";
import { LeadStatus } from "../../../types/models";
import { brand } from "../../../theme";

// Sample numbers for the decorative preview; chosen to sum to 1,248 so the
// donut's center total matches the "Total Leads" stat chip above it.
const SAMPLE_COUNTS: Record<LeadStatus, number> = {
  NEW: 320,
  CONTACTED: 280,
  QUALIFIED: 250,
  PROPOSAL_SENT: 150,
  WON: 158,
  LOST: 90,
};

const STAT_CHIPS = [
  { label: "Total Leads", value: "1,248" },
  { label: "New", value: "320" },
  { label: "Won", value: "220" },
];

export function HeroDashboardPreview() {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 4,
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "0 24px 60px rgba(15,23,42,0.14)",
        display: "flex",
        minHeight: 380,
      }}
    >
      {/* Dark sidebar rail */}
      <Box
        sx={{
          width: 132,
          flexShrink: 0,
          bgcolor: "#0B1220",
          color: "#E2E8F0",
          p: 2,
          display: { xs: "none", sm: "block" },
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
          <Box
            sx={{
              width: 22,
              height: 22,
              borderRadius: 1.5,
              background: brand.gradient,
            }}
          />
          <Typography variant="caption" fontWeight={700} sx={{ color: "#F8FAFC" }}>
            LeadFlow
          </Typography>
        </Stack>
        {["Dashboard", "Leads", "Users", "Reports", "Settings"].map((item, i) => (
          <Box
            key={item}
            sx={{
              px: 1.25,
              py: 0.85,
              mb: 0.5,
              borderRadius: 1.5,
              fontSize: 12,
              fontWeight: 600,
              color: i === 0 ? "#fff" : "#94A3B8",
              background: i === 0 ? brand.gradient : "transparent",
            }}
          >
            {item}
          </Box>
        ))}
      </Box>

      {/* Main preview area */}
      <Box sx={{ flex: 1, p: 2.5, bgcolor: "#FFFFFF" }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
          Dashboard
        </Typography>

        <Stack direction="row" spacing={1.5} sx={{ mb: 2.5 }}>
          {STAT_CHIPS.map((chip) => (
            <Box
              key={chip.label}
              sx={{
                flex: 1,
                p: 1.25,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography variant="caption" color="text.secondary" noWrap>
                {chip.label}
              </Typography>
              <Typography variant="subtitle1" fontWeight={800} lineHeight={1.2}>
                {chip.value}
              </Typography>
            </Box>
          ))}
        </Stack>

        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="caption" fontWeight={700} color="text.secondary">
            Leads by status
          </Typography>
          <Box sx={{ transform: "scale(0.9)", transformOrigin: "top left", mt: 1 }}>
            <LeadsStatusDonut counts={SAMPLE_COUNTS} />
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}
