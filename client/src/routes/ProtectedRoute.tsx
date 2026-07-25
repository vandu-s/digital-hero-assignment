/**
 * Blocks access to authenticated-only routes. While auth.status is still
 * "checking" (rehydrating a session from a stored token on app boot), it
 * renders nothing rather than redirecting - redirecting too early would
 * bounce an already-logged-in user back to /login on every page refresh.
 */
import { Box, CircularProgress } from "@mui/material";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppSelector } from "../hooks/reduxHooks";

export function ProtectedRoute() {
  const { status } = useAppSelector((state) => state.auth);
  const location = useLocation();

  if (status === "checking") {
    return (
      <Box
        sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
