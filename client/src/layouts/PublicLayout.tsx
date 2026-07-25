/**
 * Shell for unauthenticated marketing pages (Landing). Just renders the
 * routed page - kept as its own layout component (rather than nothing)
 * so a shared public navbar/footer can be added here later without
 * touching route definitions.
 */
import { Outlet } from "react-router-dom";

export function PublicLayout() {
  return <Outlet />;
}
