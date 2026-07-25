/**
 * Central place mapping a LeadStatus to its display label and chip color.
 * Every status chip in the app (dashboard chart, leads table, lead
 * details) reads from here so the palette stays consistent everywhere.
 */
import { LeadStatus } from "../types/models";

export const LEAD_STATUS_ORDER: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL_SENT",
  "WON",
  "LOST",
];

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  PROPOSAL_SENT: "Proposal Sent",
  WON: "Won",
  LOST: "Lost",
};

// Chart series colors, split by what the data actually means (see the
// dataviz skill's color-formula.md "Status is fixed" rule):
//   - NEW/CONTACTED/QUALIFIED/PROPOSAL_SENT are just pipeline PROGRESS, not
//     good/bad outcomes, so they get 4 steps of the single-hue blue ordinal
//     ramp from palette.md (lightness increases monotonically with stage -
//     "further along" reads as "further along").
//   - WON/LOST genuinely ARE a good/bad outcome, so they use the fixed,
//     reserved status palette (good/critical), never the categorical ramp -
//     this is what keeps "won" reading as unambiguously positive.
// The good/critical pair is not reliably distinguishable for deuteranopia
// at a glance (this is exactly why the status palette spec requires an
// icon + label pairing rather than color alone) - the bar chart that
// consumes this MUST always render a visible legend and direct value
// labels on every bar, never rely on color alone to convey which bar is
// which. Never reuse these six colors for an unrelated categorical chart.
export const LEAD_STATUS_HEX: Record<LeadStatus, string> = {
  NEW: "#86b6ef", // sequential step 250 (lightest allowed on light surface)
  CONTACTED: "#3987e5", // step 400
  QUALIFIED: "#1c5cab", // step 550
  PROPOSAL_SENT: "#0d366b", // step 700 (darkest - closest to done)
  WON: "#0ca30c", // fixed status: good
  LOST: "#d03b3b", // fixed status: critical
};

export const LEAD_STATUS_HEX_DARK: Record<LeadStatus, string> = {
  NEW: "#9ec5f4",
  CONTACTED: "#3987e5",
  QUALIFIED: "#1c5cab",
  PROPOSAL_SENT: "#0d366b",
  WON: "#0ca30c",
  LOST: "#d03b3b",
};

// Ink colors for the status PILL text. The chart hexes above are chosen to
// read as filled BARS; some (e.g. NEW's light blue) are too light to use as
// text on a tinted pill. These are guaranteed-dark variants so pill text
// always clears contrast, while the pill's dot still uses the identity hex.
export const LEAD_STATUS_INK: Record<LeadStatus, string> = {
  NEW: "#1d4ed8",
  CONTACTED: "#1d4ed8",
  QUALIFIED: "#1c5cab",
  PROPOSAL_SENT: "#0d366b",
  WON: "#15803d",
  LOST: "#b91c1c",
};
