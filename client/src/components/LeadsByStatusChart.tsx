/**
 * Horizontal bar chart of lead counts per pipeline status. Built by hand
 * (no charting library) since it's a single chart - keeps the bundle
 * small and gives full control over the accessibility requirements below.
 *
 * Accessibility notes (see utils/leadStatus.ts for the color rationale):
 * - Every bar has a visible legend swatch (StatusChip-style dot + label)
 *   AND a direct value-at-tip label, so no bar's identity depends on
 *   color alone - required because WON (good) vs LOST (critical) is a
 *   genuinely hard color pair for deuteranopia.
 * - Bars are capped at 24px thick per the mark spec, with a 4px rounded
 *   end and square baseline.
 */
import { Box, Stack, Typography, useTheme } from "@mui/material";
import {
  LEAD_STATUS_HEX,
  LEAD_STATUS_HEX_DARK,
  LEAD_STATUS_LABEL,
  LEAD_STATUS_ORDER,
} from "../utils/leadStatus";
import { LeadStatus } from "../types/models";

interface LeadsByStatusChartProps {
  counts: Record<LeadStatus, number>;
}

export function LeadsByStatusChart({ counts }: LeadsByStatusChartProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const colorMap = isDark ? LEAD_STATUS_HEX_DARK : LEAD_STATUS_HEX;
  const maxCount = Math.max(1, ...LEAD_STATUS_ORDER.map((status) => counts[status] ?? 0));

  return (
    <Stack spacing={2}>
      {LEAD_STATUS_ORDER.map((status) => {
        const count = counts[status] ?? 0;
        const widthPercent = (count / maxCount) * 100;

        return (
          <Box key={status} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ width: 110, flexShrink: 0 }}>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: colorMap[status],
                    flexShrink: 0,
                  }}
                />
                <Typography variant="body2" color="text.secondary" noWrap>
                  {LEAD_STATUS_LABEL[status]}
                </Typography>
              </Stack>
            </Box>

            <Box sx={{ flex: 1, position: "relative", height: 24 }}>
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  bgcolor: "action.hover",
                  borderRadius: "4px",
                }}
              />
              <Box
                sx={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${widthPercent}%`,
                  bgcolor: colorMap[status],
                  borderRadius: "4px",
                  transition: "width 0.3s ease",
                }}
              />
            </Box>

            <Typography
              variant="body2"
              fontWeight={600}
              sx={{ width: 28, textAlign: "right", flexShrink: 0 }}
            >
              {count}
            </Typography>
          </Box>
        );
      })}
    </Stack>
  );
}
