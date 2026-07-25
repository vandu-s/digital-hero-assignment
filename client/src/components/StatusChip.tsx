/**
 * Soft-tinted status pill (tinted background + matching text + a small dot),
 * the look used across Linear / Attio-style CRMs. Colors come from the
 * shared leadStatus config so chips, the dashboard chart, and everything
 * else stay in sync.
 */
import { Box, Chip } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { LeadStatus } from "../types/models";
import { LEAD_STATUS_HEX, LEAD_STATUS_INK, LEAD_STATUS_LABEL } from "../utils/leadStatus";

export function StatusChip({ status }: { status: LeadStatus }) {
  const dot = LEAD_STATUS_HEX[status]; // identity color for the dot
  const ink = LEAD_STATUS_INK[status]; // legible text/border color

  return (
    <Chip
      size="small"
      label={LEAD_STATUS_LABEL[status]}
      icon={
        <Box
          component="span"
          sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: dot, ml: "2px" }}
        />
      }
      sx={{
        bgcolor: alpha(ink, 0.1),
        color: ink,
        fontWeight: 600,
        border: `1px solid ${alpha(ink, 0.2)}`,
      }}
    />
  );
}
