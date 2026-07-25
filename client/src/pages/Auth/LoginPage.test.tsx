import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "./LoginPage";
import { renderWithProviders, adminUser } from "../../test/renderWithProviders";
import * as authApi from "../../services/authApi";

// The login thunk calls loginRequest under the hood; mock the network layer
// so the test exercises the real form + Redux wiring without a server.
vi.mock("../../services/authApi");

describe("LoginPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders the sign-in form", () => {
    renderWithProviders(<LoginPage />, { auth: { status: "unauthenticated" } });
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
  });

  it("submits credentials and dispatches a successful login", async () => {
    const loginMock = vi.mocked(authApi.loginRequest).mockResolvedValue({
      user: adminUser,
      token: "test-token",
    });

    const user = userEvent.setup();
    const { store } = renderWithProviders(<LoginPage />, {
      auth: { status: "unauthenticated" },
    });

    await user.type(screen.getByLabelText(/email/i), "admin@crm.test");
    await user.type(screen.getByLabelText(/^password/i), "Password123!");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({
        email: "admin@crm.test",
        password: "Password123!",
      });
    });
    await waitFor(() => {
      expect(store.getState().auth.user?.email).toBe("admin@crm.test");
      expect(store.getState().auth.status).toBe("authenticated");
    });
  });

  it("shows an error message when login is rejected", async () => {
    vi.mocked(authApi.loginRequest).mockRejectedValue({
      response: { data: { error: { message: "Invalid email or password" } } },
    });

    const user = userEvent.setup();
    renderWithProviders(<LoginPage />, { auth: { status: "unauthenticated" } });

    await user.type(screen.getByLabelText(/email/i), "admin@crm.test");
    await user.type(screen.getByLabelText(/^password/i), "wrong");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
  });
});
