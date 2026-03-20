import { createTheme, alpha } from "@mui/material/styles";
import { getThemeTokens } from "./themeTokens";

export function createAppTheme(mode = "light") {
  const colors = getThemeTokens(mode);
  const radius = 12;
  const mobileQuery = "@media (max-width:900px)";
  const narrowQuery = "@media (max-width:600px)";

  return createTheme({
    shape: {
      borderRadius: radius,
    },
    typography: {
      fontFamily:
        '"DM Sans", "Inter", "Avenir Next", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
      h4: { fontWeight: 800, letterSpacing: -0.4 },
      h5: { fontWeight: 780, letterSpacing: -0.2 },
      h6: { fontWeight: 740, letterSpacing: -0.1 },
      subtitle1: { fontWeight: 650 },
      subtitle2: { fontWeight: 650 },
      body1: { lineHeight: 1.45 },
      body2: { lineHeight: 1.42 },
      button: { textTransform: "none", fontWeight: 700, letterSpacing: 0 },
    },
    palette: {
      mode,
      primary: {
        main: colors.primary,
        dark: colors.primaryDark,
        light: mode === "dark" ? "#6ee7b7" : "#2f948b",
      },
      secondary: {
        main: mode === "dark" ? "#cbd5e1" : "#334155",
      },
      background: {
        default: colors.bg,
        paper: colors.paper,
      },
      text: {
        primary: colors.textMain,
        secondary: colors.textMuted,
      },
      divider: colors.border,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          "html, body, #root": {
            minHeight: "100%",
          },
          body: {
            "--fit-shell-bg": colors.shellBg,
            "--fit-panel-bg": colors.panelBg,
            "--fit-soft-bg": colors.softBg,
            "--fit-soft-border": alpha(colors.border, 0.72),
            "--fit-strong-border": alpha(colors.border, 0.96),
            "--fit-accent-soft": alpha(colors.primary, 0.12),
            "--fit-accent-strong": alpha(colors.primary, 0.22),
            "--fit-text-muted": colors.textMuted,
            background: colors.bodyBackground,
            color: colors.textMain,
            textRendering: "optimizeLegibility",
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
          },
          "input, select, textarea, .MuiInputBase-input, .MuiSelect-select": {
            fontSize: "0.96rem",
          },
          [mobileQuery]: {
            "input, select, textarea, .MuiInputBase-input, .MuiSelect-select": {
              fontSize: "16px !important",
            },
            ".MuiAutocomplete-popper .MuiAutocomplete-option, .MuiMenuItem-root": {
              fontSize: "0.98rem",
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            width: "100%",
            boxSizing: "border-box",
            borderRadius: radius,
            border: `1px solid ${alpha(colors.border, 0.8)}`,
            boxShadow:
              mode === "dark"
                ? "0 10px 30px rgba(0, 0, 0, 0.24)"
                : "0 10px 24px rgba(20, 24, 38, 0.05)",
            backgroundImage: "none",
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            width: "100%",
            boxSizing: "border-box",
            overflow: "hidden",
            borderRadius: radius + 2,
            border: `1px solid ${alpha(colors.border, 0.82)}`,
            boxShadow:
              mode === "dark"
                ? "0 12px 28px rgba(0, 0, 0, 0.28)"
                : "0 10px 24px rgba(20, 24, 38, 0.06)",
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            width: "100%",
            boxSizing: "border-box",
            padding: 18,
            "&:last-child": {
              paddingBottom: 18,
            },
            [mobileQuery]: {
              padding: 14,
              "&:last-child": {
                paddingBottom: 14,
              },
            },
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 10,
            minHeight: 40,
            paddingInline: 14,
            transition: "background-color 160ms ease, border-color 160ms ease, transform 120ms ease",
            "&:active": {
              transform: "translateY(1px)",
            },
            [mobileQuery]: {
              minHeight: 44,
              paddingInline: 16,
            },
          },
          containedPrimary: {
            background: `linear-gradient(180deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
            "&:hover": {
              background:
                mode === "dark"
                  ? "linear-gradient(180deg, #2dd4bf 0%, #0ea5a0 100%)"
                  : "linear-gradient(180deg, #0d6c64 0%, #095952 100%)",
            },
            "&.Mui-disabled": {
              background: mode === "dark" ? "#4b5563" : "#95a5a6",
              color: mode === "dark" ? "#cbd5e1" : "#e8eaed",
            },
          },
          outlined: {
            borderColor: alpha(colors.primary, 0.48),
            "&:hover": {
              borderColor: colors.primary,
              backgroundColor: alpha(colors.primary, 0.08),
            },
          },
          text: {
            "&:hover": {
              backgroundColor: alpha(colors.primary, 0.1),
            },
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          size: "small",
          variant: "outlined",
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            backgroundColor: mode === "dark" ? alpha("#0f172a", 0.45) : "#fff",
            minHeight: 42,
            transition: "box-shadow 140ms ease, border-color 140ms ease",
            "& .MuiInputBase-input": {
              fontSize: "0.96rem",
              paddingBlock: 10,
              [mobileQuery]: {
                fontSize: "16px",
                paddingBlock: 12,
              },
            },
            "& .MuiSelect-select": {
              fontSize: "0.96rem",
              [mobileQuery]: {
                fontSize: "16px",
              },
            },
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: mode === "dark" ? alpha("#64748b", 0.6) : alpha("#8b95a7", 0.42),
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: alpha(colors.primary, 0.5),
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: colors.primary,
              borderWidth: 2,
            },
            "&.Mui-focused": {
              boxShadow: `0 0 0 3px ${alpha(colors.primary, 0.2)}`,
            },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          select: {
            display: "flex",
            alignItems: "center",
            minHeight: "1.5em",
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            fontWeight: 600,
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: {
            minHeight: 42,
            borderBottom: `1px solid ${alpha(colors.border, 0.72)}`,
            [mobileQuery]: {
              minHeight: 40,
            },
          },
          indicator: {
            height: 3,
            borderRadius: 99,
            backgroundColor: colors.primary,
          },
          scrollButtons: {
            color: colors.textMuted,
            "&.Mui-disabled": {
              opacity: 0.24,
            },
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            minHeight: 40,
            borderRadius: 10,
            marginRight: 6,
            paddingInline: 14,
            color: colors.textMuted,
            fontWeight: 700,
            fontSize: "0.92rem",
            "&.Mui-selected": {
              color: mode === "dark" ? colors.textMain : colors.primaryDark,
              backgroundColor: alpha(colors.primary, 0.14),
            },
            "&:hover": {
              backgroundColor: alpha(colors.primary, 0.08),
            },
            [mobileQuery]: {
              minHeight: 44,
              paddingInline: 12,
              fontSize: "0.9rem",
            },
          },
        },
      },
      MuiAutocomplete: {
        styleOverrides: {
          inputRoot: {
            "& .MuiInputBase-input": {
              minWidth: 0,
            },
          },
          paper: {
            marginTop: 6,
            borderRadius: 14,
          },
          listbox: {
            padding: 6,
            "& .MuiAutocomplete-option": {
              borderRadius: 10,
              minHeight: 42,
              alignItems: "flex-start",
              [mobileQuery]: {
                minHeight: 48,
                fontSize: "0.98rem",
                paddingTop: 10,
                paddingBottom: 10,
              },
            },
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            maxHeight: "min(68vh, 420px)",
            marginTop: 6,
            borderRadius: 14,
          },
          list: {
            padding: 6,
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            fontSize: "0.95rem",
            minHeight: 42,
            alignItems: "flex-start",
            whiteSpace: "normal",
            lineHeight: 1.35,
            [mobileQuery]: {
              minHeight: 48,
              fontSize: "0.98rem",
              paddingTop: 10,
              paddingBottom: 10,
            },
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            maxWidth: "100%",
            backgroundImage: "none",
            "&.MuiDrawer-paperAnchorRight": {
              width: "min(100vw, 440px)",
              borderRadius: "22px 0 0 22px",
            },
            "&.MuiDrawer-paperAnchorBottom": {
              borderRadius: "22px 22px 0 0",
              maxHeight: "90vh",
            },
            [narrowQuery]: {
              "&.MuiDrawer-paperAnchorRight": {
                width: "100vw",
                borderRadius: "22px 22px 0 0",
              },
              "&.MuiDrawer-paperAnchorBottom": {
                maxHeight: "92vh",
              },
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            width: "min(100vw, 720px)",
            maxWidth: "calc(100vw - 24px)",
            [narrowQuery]: {
              margin: 12,
              borderRadius: 18,
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 750,
            color: mode === "dark" ? "#e2e8f0" : "#1e293b",
            backgroundColor: mode === "dark" ? "#1f2937" : "#f8fafc",
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: alpha(colors.border, 0.95),
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 650,
          },
        },
      },
    },
  });
}
