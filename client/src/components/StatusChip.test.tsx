import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusChip } from "./StatusChip";
import { LEAD_STATUS_LABEL } from "../utils/leadStatus";

describe("StatusChip", () => {
  it("renders the human-readable label for a status", () => {
    render(<StatusChip status="PROPOSAL_SENT" />);
    expect(screen.getByText(LEAD_STATUS_LABEL.PROPOSAL_SENT)).toBeInTheDocument();
  });

  it("renders Won distinctly from New", () => {
    const { rerender } = render(<StatusChip status="NEW" />);
    expect(screen.getByText("New")).toBeInTheDocument();
    rerender(<StatusChip status="WON" />);
    expect(screen.getByText("Won")).toBeInTheDocument();
  });
});
