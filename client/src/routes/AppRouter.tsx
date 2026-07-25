/**
 * Full route tree. Structure mirrors the plan's wireframes:
 * - Public routes (Landing) under PublicLayout
 * - Auth route (Login) under AuthLayout. There is no public self-registration:
 *   only an admin creates accounts, via the Users page.
 * - Everything else requires a session (ProtectedRoute), and Users is
 *   additionally admin-only (RoleRoute).
 *
 * Page components are lazy-loaded (code-split) so the initial bundle only
 * ships the shell + the first route the user hits. The heavy ones - the
 * Leads table (pulls in @mui/x-data-grid) and the marketing landing page -
 * each become their own chunk fetched on demand. Layouts and route guards
 * stay eager since they're tiny and needed on every navigation.
 */
import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { AuthLayout } from "../layouts/AuthLayout";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { PublicLayout } from "../layouts/PublicLayout";
import { LoadingState } from "../components/states/LoadingState";
import { ProtectedRoute } from "./ProtectedRoute";
import { RoleRoute } from "./RoleRoute";

// Named-export pages wrapped so React.lazy (which expects a default export)
// can code-split them.
const LandingPage = lazy(() =>
  import("../pages/Landing/LandingPage").then((m) => ({ default: m.LandingPage }))
);
const LoginPage = lazy(() =>
  import("../pages/Auth/LoginPage").then((m) => ({ default: m.LoginPage }))
);
const DashboardPage = lazy(() =>
  import("../pages/Dashboard/DashboardPage").then((m) => ({ default: m.DashboardPage }))
);
const LeadsListPage = lazy(() =>
  import("../pages/Leads/LeadsListPage").then((m) => ({ default: m.LeadsListPage }))
);
const CreateLeadPage = lazy(() =>
  import("../pages/Leads/CreateLeadPage").then((m) => ({ default: m.CreateLeadPage }))
);
const LeadDetailsPage = lazy(() =>
  import("../pages/Leads/LeadDetailsPage").then((m) => ({ default: m.LeadDetailsPage }))
);
const EditLeadPage = lazy(() =>
  import("../pages/Leads/EditLeadPage").then((m) => ({ default: m.EditLeadPage }))
);
const SettingsPage = lazy(() =>
  import("../pages/Settings/SettingsPage").then((m) => ({ default: m.SettingsPage }))
);
const UsersPage = lazy(() =>
  import("../pages/Users/UsersPage").then((m) => ({ default: m.UsersPage }))
);
const NotFoundPage = lazy(() =>
  import("../pages/NotFound/NotFoundPage").then((m) => ({ default: m.NotFoundPage }))
);

export function AppRouter() {
  return (
    <Suspense fallback={<LoadingState minHeight="100vh" />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
        </Route>

        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />

            <Route path="/leads" element={<LeadsListPage />} />
            <Route path="/leads/new" element={<CreateLeadPage />} />
            <Route path="/leads/:id" element={<LeadDetailsPage />} />
            <Route path="/leads/:id/edit" element={<EditLeadPage />} />

            <Route path="/settings" element={<SettingsPage />} />

            <Route element={<RoleRoute allowedRoles={["ADMIN"]} />}>
              <Route path="/users" element={<UsersPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
