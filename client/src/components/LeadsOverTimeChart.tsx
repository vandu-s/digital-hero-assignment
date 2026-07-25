/**
 * "Leads Over Time" — a single-series line/area chart of how many leads were
 * created in each of the last N months. Hand-rolled SVG (no charting library).
 *
 * Single series, so no legend is needed — the card title names it. A 2px
 * line with an indigo soft-fill area, a recessive baseline grid, and ≥8px
 * point markers on each month. Derived purely from the leads already loaded
 * by the dashboard (created dates), so it needs no new endpoint.
 */
import { Box, Stack, Typography, useTheme } from "@mui/material";
import { useMemo } from "react";
import { alpha } from "@mui/material/styles";
import { brand } from "../theme";

interface LeadsOverTimeChartProps {
  createdDates: string[]; // ISO date strings of each lead's createdAt
  months?: number; // how many trailing months to show
}

const WIDTH = 960;
const HEIGHT = 200;
const PAD_X = 10;
const PAD_TOP = 14;
const PAD_BOTTOM = 26;

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function LeadsOverTimeChart({ createdDates, months = 8 }: LeadsOverTimeChartProps) {
  const theme = useTheme();

  const buckets = useMemo(() => {
    // Build the trailing `months` month-buckets ending at the most recent
    // month present in the data (or, if empty, a flat set of zeroes).
    const now = new Date();
    const keys: { label: string; key: string }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push({ label: MONTH_LABELS[d.getMonth()], key: `${d.getFullYear()}-${d.getMonth()}` });
    }
    const countByKey = new Map(keys.map((k) => [k.key, 0]));
    for (const iso of createdDates) {
      const d = new Date(iso);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (countByKey.has(key)) countByKey.set(key, (countByKey.get(key) ?? 0) + 1);
    }
    return keys.map((k) => ({ label: k.label, value: countByKey.get(k.key) ?? 0 }));
  }, [createdDates, months]);

  const maxValue = Math.max(1, ...buckets.map((b) => b.value));
  const plotW = WIDTH - PAD_X * 2;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const points = buckets.map((b, i) => {
    const x = PAD_X + (buckets.length === 1 ? plotW / 2 : (i / (buckets.length - 1)) * plotW);
    const y = PAD_TOP + plotH - (b.value / maxValue) * plotH;
    return { ...b, x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${PAD_TOP + plotH} L ${points[0].x} ${
          PAD_TOP + plotH
        } Z`
      : "";

  // A few horizontal gridlines for reference (recessive).
  const gridLines = [0, 0.5, 1].map((t) => PAD_TOP + plotH - t * plotH);

  return (
    <Box sx={{ width: "100%", overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        role="img"
        aria-label="Leads created per month"
        style={{ display: "block", minWidth: 480 }}
      >
        <defs>
          <linearGradient id="leadsOverTimeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={alpha(brand.primary, 0.22)} />
            <stop offset="100%" stopColor={alpha(brand.primary, 0)} />
          </linearGradient>
        </defs>

        {/* Recessive gridlines */}
        {gridLines.map((y, i) => (
          <line
            key={i}
            x1={PAD_X}
            x2={WIDTH - PAD_X}
            y1={y}
            y2={y}
            stroke={theme.palette.divider}
            strokeWidth={1}
          />
        ))}

        {/* Area fill */}
        {areaPath && <path d={areaPath} fill="url(#leadsOverTimeFill)" />}

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={brand.primary}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Point markers */}
        {points.map((p) => (
          <circle
            key={p.label}
            cx={p.x}
            cy={p.y}
            r={4}
            fill="#fff"
            stroke={brand.primary}
            strokeWidth={2}
          />
        ))}

        {/* Month labels */}
        {points.map((p) => (
          <text
            key={`l-${p.label}`}
            x={p.x}
            y={HEIGHT - 8}
            textAnchor="middle"
            fontSize={11}
            fill={theme.palette.text.secondary}
          >
            {p.label}
          </text>
        ))}
      </svg>

      {createdDates.length === 0 && (
        <Stack alignItems="center" sx={{ mt: -6, mb: 4 }}>
          <Typography variant="body2" color="text.secondary">
            No leads yet to chart.
          </Typography>
        </Stack>
      )}
    </Box>
  );
}
