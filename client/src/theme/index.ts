/**
 * Central MUI theme. Every color, spacing, and typography choice in the app
 * should come from here rather than being hardcoded in components - that's
 * what keeps a "premium SaaS" look consistent across 15+ pages.
 *
 * Design language: indigo/blue primary with a violet secondary accent, a
 * cool slate neutral scale, soft layered shadows (never harsh), generous
 * radii, and the Inter typeface. Aims for the calm, high-contrast feel of
 * Linear / Vercel / Attio rather than heavy Material defaults.
 */
import { alpha, createTheme } from "@mui/material/styles";

// Brand tokens kept as named constants so components can reference the exact
// same values the theme is built from (e.g. gradients that must match).
export const brand = {
  primary: "#4F46E5", // indigo-600
  primaryDark: "#4338CA",
  primaryLight: "#6366F1",
  secondary: "#7C3AED", // violet-600
  gradient: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
  gradientSoft: "linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)",
};

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: brand.primary,
      dark: brand.primaryDark,
      light: brand.primaryLight,
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: brand.secondary,
      contrastText: "#FFFFFF",
    },
    success: { main: "#16A34A", light: "#DCFCE7", dark: "#15803D" },
    error: { main: "#DC2626", light: "#FEE2E2", dark: "#B91C1C" },
    warning: { main: "#D97706", light: "#FEF3C7", dark: "#B45309" },
    info: { main: "#0EA5E9", light: "#E0F2FE", dark: "#0284C7" },
    background: {
      default: "#F7F8FC",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#0F172A", // slate-900
      secondary: "#64748B", // slate-500
    },
    divider: "#E9EDF3",
    grey: {
      50: "#F8FAFC",
      100: "#F1F5F9",
      200: "#E2E8F0",
      300: "#CBD5E1",
      400: "#94A3B8",
      500: "#64748B",
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: [
      "Inter",
      "-apple-system",
      "BlinkMacSystemFont",
      "Segoe UI",
      "Roboto",
      "sans-serif",
    ].join(","),
    h1: { fontWeight: 800, letterSpacing: "-0.03em" },
    h2: { fontWeight: 800, letterSpacing: "-0.02em" },
    h3: { fontWeight: 700, letterSpacing: "-0.02em" },
    h4: { fontWeight: 700, letterSpacing: "-0.01em" },
    h5: { fontWeight: 700, letterSpacing: "-0.01em" },
    h6: { fontWeight: 700 },
    subtitle1: { fontWeight: 600 },
    body2: { lineHeight: 1.6 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          // Nicer font rendering for the SaaS look.
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 8,
          paddingInline: 18,
          fontWeight: 600,
          transition: "transform 120ms ease, box-shadow 120ms ease, background-color 120ms ease",
        },
        containedPrimary: {
          boxShadow: `0 1px 2px ${alpha("#4F46E5", 0.25)}`,
          "&:hover": {
            boxShadow: `0 6px 16px ${alpha("#4F46E5", 0.28)}`,
            transform: "translateY(-1px)",
          },
        },
        outlined: {
          borderColor: "#E2E8F0",
          color: "#334155",
          "&:hover": { borderColor: "#CBD5E1", backgroundColor: "#F8FAFC" },
        },
        sizeLarge: { paddingBlock: 11, fontSize: 15 },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderRadius: 14,
          border: "1px solid #EEF1F6",
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.03)",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: 999 },
        sizeSmall: { height: 24 },
      },
    },
    // Form fields in the mockup use a label ABOVE a light-bordered input with a
    // placeholder, rather than MUI's floating notched label. Setting the
    // default variant to "filled"-style-free outlined + shrink label achieves
    // the stacked look app-wide without changing any field markup.
    MuiTextField: {
      defaultProps: { InputLabelProps: { shrink: true } },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          // Stacked, static label above the field (mockup style).
          position: "static",
          transform: "none",
          transformOrigin: "top left",
          fontSize: 13,
          fontWeight: 600,
          color: "#334155",
          marginBottom: 6,
          "&.Mui-focused": { color: "#334155" },
          "&.Mui-error": { color: "#DC2626" },
        },
        shrink: { transform: "none" },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: "#FFFFFF",
          // No notch cut-out, since the label sits above the field now.
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "#E2E8F0",
            top: 0,
            "& legend": { display: "none" },
          },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#CBD5E1" },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderWidth: 1.5,
            borderColor: brand.primary,
          },
        },
        input: {
          "&::placeholder": { color: "#94A3B8", opacity: 1 },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: "#EEF2F7", paddingBlock: 14 },
        head: {
          fontWeight: 600,
          fontSize: 12,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "#94A3B8",
          backgroundColor: "#FFFFFF",
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:hover": { backgroundColor: "#F8FAFC" },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: "#0F172A",
          borderRadius: 8,
          fontSize: 12,
          padding: "6px 10px",
        },
      },
    },
  },
});
