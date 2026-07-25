/**
 * Restricts a route subtree to specific roles (e.g. Admin-only pages like
 * Users). Must sit inside <ProtectedRoute/> - it assumes state.auth.user
 * is already populated.
 */
import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "../hooks/reduxHooks";
import { Role } from "../types/models";

interface RoleRouteProps {
  allowedRoles: Role[];
}

export function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const user = useAppSelector((state) => state.auth.user);

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
