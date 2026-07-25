import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { RoleRoute } from "./RoleRoute";
import { renderWithProviders, adminUser, memberUser } from "../test/renderWithProviders";

function Protected() {
  return (
    <Routes>
      <Route path="/login" element={<div>Login screen</div>} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<div>Secret dashboard</div>} />
      </Route>
    </Routes>
  );
}

function AdminOnly() {
  return (
    <Routes>
      <Route path="/dashboard" element={<div>Dashboard home</div>} />
      <Route element={<RoleRoute allowedRoles={["ADMIN"]} />}>
        <Route path="/users" element={<div>Admin users page</div>} />
      </Route>
    </Routes>
  );
}

describe("ProtectedRoute", () => {
  it("redirects an unauthenticated visitor to /login", () => {
    renderWithProviders(<Protected />, {
      auth: { status: "unauthenticated" },
      route: "/dashboard",
    });
    expect(screen.getByText("Login screen")).toBeInTheDocument();
    expect(screen.queryByText("Secret dashboard")).not.toBeInTheDocument();
  });

  it("renders the protected content for an authenticated user", () => {
    renderWithProviders(<Protected />, {
      auth: { status: "authenticated", user: memberUser },
      route: "/dashboard",
    });
    expect(screen.getByText("Secret dashboard")).toBeInTheDocument();
  });
});

describe("RoleRoute", () => {
  it("blocks a member from an admin-only route", () => {
    renderWithProviders(<AdminOnly />, {
      auth: { status: "authenticated", user: memberUser },
      route: "/users",
    });
    expect(screen.getByText("Dashboard home")).toBeInTheDocument();
    expect(screen.queryByText("Admin users page")).not.toBeInTheDocument();
  });

  it("allows an admin into an admin-only route", () => {
    renderWithProviders(<AdminOnly />, {
      auth: { status: "authenticated", user: adminUser },
      route: "/users",
    });
    expect(screen.getByText("Admin users page")).toBeInTheDocument();
  });
});
