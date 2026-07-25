import MenuIcon from "@mui/icons-material/Menu";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import SearchIcon from "@mui/icons-material/Search";
import {
  AppBar,
  Avatar,
  Box,
  Breadcrumbs,
  IconButton,
  InputAdornment,
  Link,
  Menu,
  MenuItem,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../hooks/reduxHooks";
import { logout } from "../features/auth/authSlice";
import { logoutRequest } from "../services/authApi";
import { brand } from "../theme";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function useBreadcrumbSegments() {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);
  return segments.map((segment, index) => ({
    // Raw record IDs read as noise in a breadcrumb - show "Details" for a
    // UUID segment instead of the id itself.
    label: UUID_PATTERN.test(segment)
      ? "Details"
      : segment.charAt(0).toUpperCase() + segment.slice(1),
    path: "/" + segments.slice(0, index + 1).join("/"),
    isLast: index === segments.length - 1,
  }));
}

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const breadcrumbs = useBreadcrumbSegments();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  function handleLogout() {
    setAnchorEl(null);
    // Notify the server (best-effort) before we drop the token locally.
    // The local clear below is what actually ends the session, so we don't
    // await or block navigation on this call.
    void logoutRequest().catch(() => undefined);
    dispatch(logout());
    navigate("/login");
  }

  const initials = user?.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <AppBar
      position="sticky"
      color="transparent"
      elevation={0}
      sx={{
        bgcolor: "rgba(247, 248, 252, 0.8)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Toolbar sx={{ gap: 2 }}>
        <IconButton
          onClick={onMenuClick}
          sx={{ display: { md: "none" } }}
          aria-label="Open navigation menu"
        >
          <MenuIcon />
        </IconButton>

        <Breadcrumbs sx={{ flexGrow: 1, display: { xs: "none", sm: "flex" } }}>
          {breadcrumbs.length === 0 ? (
            <Typography color="text.primary" fontWeight={600}>
              Home
            </Typography>
          ) : (
            breadcrumbs.map((crumb) =>
              crumb.isLast ? (
                <Typography key={crumb.path} color="text.primary" fontWeight={600}>
                  {crumb.label}
                </Typography>
              ) : (
                <Link
                  key={crumb.path}
                  component={RouterLink}
                  to={crumb.path}
                  underline="hover"
                  color="text.secondary"
                >
                  {crumb.label}
                </Link>
              )
            )
          )}
        </Breadcrumbs>

        <TextField
          size="small"
          placeholder="Search..."
          sx={{ display: { xs: "none", md: "block" }, width: 220 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
              </InputAdornment>
            ),
          }}
        />

        <IconButton aria-label="Notifications" sx={{ color: "text.secondary" }}>
          <NotificationsNoneOutlinedIcon />
        </IconButton>

        <IconButton
          onClick={(e) => setAnchorEl(e.currentTarget)}
          aria-label="Profile menu"
          sx={{ p: 0.5 }}
        >
          <Avatar
            sx={{
              width: 36,
              height: 36,
              fontSize: 14,
              fontWeight: 700,
              background: brand.gradient,
            }}
          >
            {initials}
          </Avatar>
        </IconButton>

        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="body2" fontWeight={600}>
              {user?.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.email}
            </Typography>
          </Box>
          <MenuItem component={RouterLink} to="/settings" onClick={() => setAnchorEl(null)}>
            Settings
          </MenuItem>
          <MenuItem onClick={handleLogout}>Log out</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
