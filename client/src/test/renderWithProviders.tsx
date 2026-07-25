/**
 * Test helper that renders a component inside the same providers the real
 * app uses - a fresh Redux store (optionally with a preloaded auth state),
 * the MUI theme, and a MemoryRouter so route-aware components work. Every
 * component test goes through this so tests exercise the real wiring.
 */
import { configureStore } from "@reduxjs/toolkit";
import { ThemeProvider } from "@mui/material/styles";
import { render, RenderOptions } from "@testing-library/react";
import { ReactElement, ReactNode } from "react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import authReducer from "../features/auth/authSlice";
import { theme } from "../theme";
import { User } from "../types/models";

type AuthStatus = "checking" | "authenticated" | "unauthenticated";

interface PreloadedAuth {
  user?: User | null;
  status?: AuthStatus;
  actionLoading?: boolean;
  actionError?: string | null;
}

interface RenderOpts extends Omit<RenderOptions, "wrapper"> {
  auth?: PreloadedAuth;
  route?: string;
}

export function makeStore(auth?: PreloadedAuth) {
  return configureStore({
    reducer: { auth: authReducer },
    preloadedState: auth
      ? {
          auth: {
            user: auth.user ?? null,
            status: auth.status ?? "unauthenticated",
            actionLoading: auth.actionLoading ?? false,
            actionError: auth.actionError ?? null,
          },
        }
      : undefined,
  });
}

export function renderWithProviders(
  ui: ReactElement,
  { auth, route = "/", ...options }: RenderOpts = {}
) {
  const store = makeStore(auth);

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
        </ThemeProvider>
      </Provider>
    );
  }

  return { store, ...render(ui, { wrapper: Wrapper, ...options }) };
}

export const adminUser: User = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Ada Admin",
  email: "admin@crm.test",
  role: "ADMIN",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

export const memberUser: User = {
  id: "22222222-2222-2222-2222-222222222222",
  name: "Mel Member",
  email: "mel@crm.test",
  role: "MEMBER",
  createdAt: "2024-01-02T00:00:00.000Z",
  updatedAt: "2024-01-02T00:00:00.000Z",
};
