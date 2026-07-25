import {
  Avatar,
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { useAppSelector } from "../hooks/reduxHooks";
import { navItems } from "./navConfig";
import { brand } from "../theme";
import { Logo } from "../components/Logo";

export const SIDEBAR_WIDTH = 248;

// Dark navy sidebar surface (matches the design reference). Kept here so the
// Drawer paper and the inner content agree on the exact background.
const SIDEBAR_BG = "#0B1220";
const SIDEBAR_MUTED = "#94A3B8";

interface SidebarProps {
  variant: "permanent" | "temporary";
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ variant, open, onClose }: SidebarProps) {
  const location = useLocation();
  const user = useAppSelector((state) => state.auth.user);
  const role = user?.role;

  const visibleItems = navItems.filter(
    (item) => !item.allowedRoles || (role && item.allowedRoles.includes(role))
  );

  const initials = user?.name
    ?.split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const content = (
    <Box
      sx={{
        width: SIDEBAR_WIDTH,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: SIDEBAR_BG,
        color: "#E2E8F0",
      }}
    >
      <Box sx={{ px: 2.5, py: 2.5 }}>
        <Logo onDark />
      </Box>

      <Typography
        variant="caption"
        sx={{
          px: 2.5,
          pt: 1,
          pb: 0.5,
          color: SIDEBAR_MUTED,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        Menu
      </Typography>

      <List sx={{ px: 1.5, flex: 1 }}>
        {visibleItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <ListItemButton
              key={item.path}
              component={RouterLink}
              to={item.path}
              onClick={onClose}
              selected={isActive}
              sx={{
                borderRadius: 2.5,
                mb: 0.5,
                py: 1,
                color: SIDEBAR_MUTED,
                "& .MuiListItemIcon-root": { color: SIDEBAR_MUTED },
                "&:hover": { bgcolor: "rgba(255,255,255,0.06)", color: "#F8FAFC" },
                "&.Mui-selected": {
                  background: brand.gradient,
                  color: "#fff",
                  boxShadow: "0 4px 12px rgba(79,70,229,0.35)",
                  "& .MuiListItemIcon-root": { color: "#fff" },
                  "&:hover": { background: brand.gradient, opacity: 0.95 },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <item.icon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }}
              />
            </ListItemButton>
          );
        })}
      </List>

      {user && (
        <Box sx={{ p: 1.5, mt: "auto" }}>
          <Stack
            direction="row"
            spacing={1.25}
            alignItems="center"
            sx={{
              px: 1.5,
              py: 1.25,
              borderRadius: 2.5,
              bgcolor: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <Avatar
              sx={{
                width: 34,
                height: 34,
                fontSize: 13,
                fontWeight: 700,
                background: brand.gradient,
              }}
            >
              {initials}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={600} noWrap sx={{ color: "#F8FAFC" }}>
                {user.name}
              </Typography>
              <Typography variant="caption" noWrap sx={{ color: SIDEBAR_MUTED }}>
                {role === "ADMIN" ? "Admin" : "Member"}
              </Typography>
            </Box>
          </Stack>
        </Box>
      )}
    </Box>
  );

  return (
    <Drawer
      variant={variant}
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: SIDEBAR_WIDTH,
          boxSizing: "border-box",
          border: "none",
          bgcolor: SIDEBAR_BG,
        },
      }}
    >
      {content}
    </Drawer>
  );
}
