import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LeadFormSection } from "./LeadFormSection";
import { renderWithProviders } from "../../../test/renderWithProviders";
import * as publicLeadApi from "../../../services/publicLeadApi";

vi.mock("../../../services/publicLeadApi");

describe("Public LeadFormSection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shows inline validation errors and does not submit when required fields are empty", async () => {
    const createMock = vi.mocked(publicLeadApi.createPublicLead);
    const user = userEvent.setup();
    renderWithProviders(<LeadFormSection />);

    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("rejects a malformed email", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LeadFormSection />);

    await user.type(screen.getByLabelText(/full name/i), "Jane Doe");
    await user.type(screen.getByLabelText(/email/i), "not-an-email");
    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument();
    expect(vi.mocked(publicLeadApi.createPublicLead)).not.toHaveBeenCalled();
  });

  it("renders the Message field", () => {
    renderWithProviders(<LeadFormSection />);
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
  });

  it("submits a valid lead including the message and shows a success message", async () => {
    const createMock = vi
      .mocked(publicLeadApi.createPublicLead)
      .mockResolvedValue(undefined as unknown as never);
    const user = userEvent.setup();
    renderWithProviders(<LeadFormSection />);

    await user.type(screen.getByLabelText(/full name/i), "Jane Doe");
    await user.type(screen.getByLabelText(/email/i), "jane@example.com");
    await user.type(screen.getByLabelText(/message/i), "Please call me about pricing.");
    await user.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Jane Doe",
          email: "jane@example.com",
          message: "Please call me about pricing.",
        })
      );
    });
    expect(await screen.findByText(/we've received your details/i)).toBeInTheDocument();
  });
});
