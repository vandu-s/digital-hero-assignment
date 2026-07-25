import { Card, CardContent, Typography } from "@mui/material";

interface StatCardProps {
  label: string;
  value: string;
  accentColor: string;
  /** Optional small caption under the value, e.g. "of 9 total". */
  caption?: string;
}

export function StatCard({ label, value, accentColor, caption }: StatCardProps) {
  return (
    <Card
      sx={{
        height: "100%",
        position: "relative",
        overflow: "hidden",
        transition: "transform 150ms ease, box-shadow 150ms ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
        },
        // Thin colored accent bar across the TOP edge (compact, mockup-style).
        "&::before": {
          content: '""',
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 3,
          bgcolor: accentColor,
        },
      }}
    >
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            fontSize: 11,
          }}
          noWrap
        >
          {label}
        </Typography>
        <Typography
          variant="h4"
          fontWeight={800}
          sx={{ letterSpacing: "-0.02em", mt: 0.5, lineHeight: 1.1 }}
        >
          {value}
        </Typography>
        {caption && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: "block" }}>
            {caption}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
