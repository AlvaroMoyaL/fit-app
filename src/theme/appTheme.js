import { createTheme, alpha } from "@mui/material/styles";
import { getThemeTokens } from "./themeTokens";

export function createAppTheme(mode = "light") {
  const colors = getThemeTokens(mode);
  const radius = 14;
  const mobileQuery = "@media (max-width:900px)";
  const narrowQuery = "@media (max-width:600px)";
  const surfaceInset = colors.highlightInset;
  const buttonInset = `inset 0 1px 0 ${alpha("#ffffff", mode === "dark" ? 0.08 : 0.2)}`;

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
        light: mode === "dark" ? "#a6bac1" : "#6f848d",
      },
      secondary: {
        main: mode === "dark" ? "#b4c0cc" : "#687587",
      },
      success: {
        main: mode === "dark" ? "#8ea89e" : "#6d877d",
      },
      info: {
        main: mode === "dark" ? "#8ea3b8" : "#72879a",
      },
      warning: {
        main: mode === "dark" ? "#b09a7a" : "#8f7956",
      },
      error: {
        main: mode === "dark" ? "#b09292" : "#8c6f6f",
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
            "--fit-surface-top": colors.surfaceTop,
            "--fit-surface-bottom": colors.surfaceBottom,
            "--fit-surface-raised-top": colors.surfaceRaisedTop,
            "--fit-surface-raised-bottom": colors.surfaceRaisedBottom,
            "--fit-shadow-soft": colors.shadowSoft,
            "--fit-shadow-medium": colors.shadowMedium,
            "--fit-shadow-strong": colors.shadowStrong,
            "--fit-highlight-inset": colors.highlightInset,
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
            backgroundImage: `linear-gradient(180deg, ${colors.surfaceTop} 0%, ${colors.surfaceBottom} 100%)`,
            boxShadow: `${colors.shadowSoft}, ${surfaceInset}`,
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
            backgroundImage: `linear-gradient(180deg, ${colors.surfaceRaisedTop} 0%, ${colors.surfaceRaisedBottom} 100%)`,
            boxShadow: `${colors.shadowMedium}, ${surfaceInset}`,
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
            transition:
              "transform 160ms ease, background-color 160ms ease, border-color 160ms ease, box-shadow 140ms ease",
            [mobileQuery]: {
              minHeight: 44,
              paddingInline: 16,
            },
          },
          containedPrimary: {
            background: `linear-gradient(180deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
            boxShadow: `${
              mode === "dark"
                ? `0 14px 28px ${alpha(colors.primaryDark, 0.24)}`
                : `0 14px 28px ${alpha(colors.primaryDark, 0.18)}`
            }, ${buttonInset}`,
            "&:hover": {
              background: `linear-gradient(180deg, ${colors.primaryDark} 0%, ${colors.primaryDark} 100%)`,
              transform: "translateY(-1px)",
              boxShadow: `${
                mode === "dark"
                  ? `0 18px 34px ${alpha(colors.primaryDark, 0.28)}`
                  : `0 18px 34px ${alpha(colors.primaryDark, 0.22)}`
              }, ${buttonInset}`,
            },
            "&.Mui-disabled": {
              background: mode === "dark" ? "#4b5563" : "#95a5a6",
              color: mode === "dark" ? "#cbd5e1" : "#e8eaed",
            },
          },
          outlined: {
            borderColor: alpha(colors.primary, 0.26),
            backgroundImage: `linear-gradient(180deg, ${alpha(colors.primary, 0.06)} 0%, ${alpha(
              colors.primary,
              0.02,
            )} 100%)`,
            boxShadow: surfaceInset,
            "&:hover": {
              borderColor: alpha(colors.primary, 0.36),
              backgroundColor: alpha(colors.primary, 0.065),
              boxShadow: `${colors.shadowSoft}, ${surfaceInset}`,
            },
          },
          text: {
            "&:hover": {
              backgroundColor: alpha(colors.textMain, 0.04),
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
            backgroundColor: mode === "dark" ? alpha("#0f172a", 0.4) : alpha("#ffffff", 0.98),
            backgroundImage:
              mode === "dark"
                ? `linear-gradient(180deg, ${alpha("#ffffff", 0.03)} 0%, ${alpha("#ffffff", 0.01)} 100%)`
                : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(247,250,252,0.96) 100%)",
            minHeight: 42,
            boxShadow: surfaceInset,
            transition: "box-shadow 140ms ease, border-color 140ms ease, background-color 140ms ease",
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
              borderColor: mode === "dark" ? alpha("#64748b", 0.44) : alpha("#8b95a7", 0.28),
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: alpha(colors.primary, 0.34),
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: colors.primary,
              borderWidth: 1.5,
            },
            "&.Mui-focused": {
              boxShadow: `0 0 0 3px ${alpha(colors.primary, 0.12)}`,
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
            border: `1px solid ${alpha(colors.border, 0.76)}`,
            backgroundImage: `linear-gradient(180deg, ${alpha(colors.textMain, mode === "dark" ? 0.06 : 0.04)} 0%, ${alpha(
              colors.textMain,
              mode === "dark" ? 0.03 : 0.02,
            )} 100%)`,
            boxShadow: surfaceInset,
            "&.Mui-selected": {
              color: mode === "dark" ? colors.textMain : colors.primaryDark,
              backgroundImage: `linear-gradient(180deg, ${alpha(colors.primary, mode === "dark" ? 0.22 : 0.18)} 0%, ${alpha(
                colors.primary,
                mode === "dark" ? 0.12 : 0.08,
              )} 100%)`,
              borderColor: alpha(colors.primary, 0.22),
              boxShadow: `${
                mode === "dark"
                  ? `0 10px 22px ${alpha(colors.primaryDark, 0.18)}`
                  : `0 10px 22px ${alpha(colors.primaryDark, 0.12)}`
              }, ${surfaceInset}`,
            },
            "&:hover": {
              backgroundColor: alpha(colors.textMain, mode === "dark" ? 0.08 : 0.05),
              boxShadow: `${colors.shadowSoft}, ${surfaceInset}`,
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
            backgroundColor: mode === "dark" ? "#1b2430" : "#f5f7fa",
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
            borderRadius: 999,
            fontWeight: 650,
          },
        },
      },
    },
  });
}
