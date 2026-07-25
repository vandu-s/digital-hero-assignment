/**
 * A label-on-the-left, value-on-the-right row. Used by the Lead Details
 * contact card and the Settings account card - previously duplicated as two
 * identical local components, now shared here (DRY).
 */
import { Stack, Typography } from "@mui/material";

export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={500} sx={{ textAlign: "right" }}>
        {value}
      </Typography>
    </Stack>
  );
}
