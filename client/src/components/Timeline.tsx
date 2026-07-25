/**
 * Lightweight timeline built from Box/Stack rather than pulling in
 * @mui/lab for a single component - a vertical connector line plus a dot
 * per entry is simple enough to hand-build and keeps one less dependency
 * to explain.
 */
import { Box, Stack, Typography } from "@mui/material";
import { ReactNode } from "react";

export interface TimelineEntry {
  id: string;
  content: ReactNode;
  timestamp: string;
}

export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No activity yet.
      </Typography>
    );
  }

  return (
    <Stack spacing={0}>
      {entries.map((entry, index) => (
        <Stack key={entry.id} direction="row" spacing={2}>
          <Stack alignItems="center" sx={{ width: 12 }}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                bgcolor: "primary.main",
                mt: 0.75,
                flexShrink: 0,
              }}
            />
            {index < entries.length - 1 && (
              <Box sx={{ width: "1px", flex: 1, bgcolor: "divider", minHeight: 24 }} />
            )}
          </Stack>
          <Box sx={{ pb: 3, minWidth: 0 }}>{entry.content}</Box>
        </Stack>
      ))}
    </Stack>
  );
}
