/**
 * Donut chart of lead counts per pipeline status, with a legend beside it.
 * Hand-rolled SVG (no charting library) to keep the bundle small.
 *
 * Accessibility (see utils/leadStatus.ts for the color rationale): identity
 * is NEVER color-alone — the legend pairs each status's color dot with its
 * label AND its count, and there is a 2px surface gap between arc segments so
 * adjacent slices never blur together. The center shows the total headline.
 */
import { Box, Stack, Typography, useTheme } from "@mui/material";
import { LEAD_STATUS_HEX, LEAD_STATUS_LABEL, LEAD_STATUS_ORDER } from "../utils/leadStatus";
import { LeadStatus } from "../types/models";

interface LeadsStatusDonutProps {
  counts: Record<LeadStatus, number>;
}

// SVG donut geometry.
const SIZE = 200;
const STROKE = 26;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = 2; // px surface gap between segments

export function LeadsStatusDonut({ counts }: LeadsStatusDonutProps) {
  const theme = useTheme();
  const total = LEAD_STATUS_ORDER.reduce((sum, status) => sum + (counts[status] ?? 0), 0);

  // Build the arc segments. When total is 0 we render a single neutral ring.
  let offset = 0;
  const segments = LEAD_STATUS_ORDER.map((status) => {
    const value = counts[status] ?? 0;
    const fraction = total > 0 ? value / total : 0;
    const length = fraction * CIRCUMFERENCE;
    // Subtract the gap from each visible segment so slices don't touch.
    const dash = Math.max(0, length - GAP);
    const seg = {
      status,
      value,
      color: LEAD_STATUS_HEX[status],
      dash,
      gapRemainder: CIRCUMFERENCE - dash,
      rotation: (offset / CIRCUMFERENCE) * 360,
    };
    offset += length;
    return seg;
  });

  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={4}
      alignItems="center"
      justifyContent="center"
    >
      <Box sx={{ position: "relative", width: SIZE, height: SIZE, flexShrink: 0 }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label="Leads by status"
        >
          {/* Track */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={theme.palette.grey[100]}
            strokeWidth={STROKE}
          />
          {total > 0 &&
            segments.map(
              (seg) =>
                seg.value > 0 && (
                  <circle
                    key={seg.status}
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={RADIUS}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={STROKE}
                    strokeDasharray={`${seg.dash} ${seg.gapRemainder}`}
                    strokeLinecap="butt"
                    transform={`rotate(${-90 + seg.rotation} ${SIZE / 2} ${SIZE / 2})`}
                  />
                )
            )}
        </svg>
        {/* Center headline */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: "-0.02em" }}>
            {total.toLocaleString()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Total
          </Typography>
        </Box>
      </Box>

      {/* Legend — dot + label + count, so identity never depends on color alone */}
      <Stack spacing={1} sx={{ minWidth: 150 }}>
        {LEAD_STATUS_ORDER.map((status) => (
          <Stack key={status} direction="row" alignItems="center" spacing={1.25}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                bgcolor: LEAD_STATUS_HEX[status],
                flexShrink: 0,
              }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
              {LEAD_STATUS_LABEL[status]}
            </Typography>
            <Typography variant="body2" fontWeight={700}>
              {(counts[status] ?? 0).toLocaleString()}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}
