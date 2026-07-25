/**
 * Shell for every authenticated page: a permanent sidebar on desktop (a
 * temporary/collapsible drawer on mobile) plus the sticky top bar. The
 * routed page renders in <Outlet/>.
 */
import { Box, Divider } from "@mui/material";
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar, SIDEBAR_WIDTH } from "./Sidebar";
import { Topbar } from "./Topbar";
import { DigitalHeroesCredit } from "../components/DigitalHeroesCredit";

export function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <Box sx={{ display: { xs: "none", md: "block" } }}>
        <Sidebar variant="permanent" open onClose={() => {}} />
      </Box>
      <Box sx={{ display: { xs: "block", md: "none" } }}>
        <Sidebar variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} />
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          width: { md: `calc(100% - ${SIDEBAR_WIDTH}px)` },
        }}
      >
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <Box sx={{ p: { xs: 2, sm: 3 }, flexGrow: 1 }}>
          <Outlet />
        </Box>

        {/* Required Digital Heroes attribution - visible on every authenticated page. */}
        <Box component="footer" sx={{ mt: "auto" }}>
          <Divider />
          <Box sx={{ px: 3, py: 2, textAlign: "center" }}>
            <DigitalHeroesCredit />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
