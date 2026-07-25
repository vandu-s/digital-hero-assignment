import { Box, CircularProgress } from "@mui/material";

/** Centered spinner for a page/section that is loading its initial data. */
export function LoadingState({ minHeight = 240 }: { minHeight?: number | string }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight }}>
      <CircularProgress />
    </Box>
  );
}
