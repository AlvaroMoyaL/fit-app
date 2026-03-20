import { useMemo } from "react";
import { CssBaseline, GlobalStyles } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { createAppTheme } from "../theme/appTheme";

export default function MuiThemeBoundary({ mode = "light", children }) {
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles
        styles={(muiTheme) => ({
          ".page": {
            maxWidth: "none",
            marginInline: "auto",
          },
          ".rest-panel, .card, .metrics, .metrics-log, .metric-card, .form-section, .plan-metrics, .week-day": {
            width: "100%",
            maxWidth: "100%",
            boxSizing: "border-box",
            overflow: "hidden",
            borderRadius: 18,
            border: `1px solid ${muiTheme.palette.divider}`,
            backgroundColor: muiTheme.palette.background.paper,
            backgroundImage:
              "linear-gradient(180deg, var(--fit-surface-raised-top, rgba(255,255,255,0.99)), var(--fit-surface-raised-bottom, rgba(241,246,250,0.95)))",
            boxShadow:
              "var(--fit-shadow-soft, 0 10px 24px rgba(15,23,42,0.05)), var(--fit-highlight-inset, inset 0 1px 0 rgba(255,255,255,0.76))",
          },
          ".card > *, .rest-panel > *, .metrics > *, .metrics-log > *, .form-section > *": {
            maxWidth: "100%",
            boxSizing: "border-box",
          },
          ".collapsible-body > *, .chart, .chart-highlight": {
            width: "100%",
            maxWidth: "100%",
            boxSizing: "border-box",
          },
          ".tab.active, .profile-item.active": {
            boxShadow:
              "var(--fit-shadow-soft, 0 10px 24px rgba(15,23,42,0.05)), var(--fit-highlight-inset, inset 0 1px 0 rgba(255,255,255,0.76))",
          },
          "button, .tiny, .tab, .primary, .primary-btn": {
            borderRadius: 10,
            transition:
              "background-color 160ms ease, border-color 160ms ease, color 160ms ease, box-shadow 160ms ease",
          },
          "input, select, textarea": {
            borderRadius: 10,
          },
          ".empty-state": {
            border: `1px dashed ${muiTheme.palette.divider}`,
            borderRadius: 12,
            padding: "14px 12px",
            color: muiTheme.palette.text.secondary,
            background:
              "linear-gradient(180deg, var(--fit-surface-top, rgba(255,255,255,0.98)), var(--fit-surface-bottom, rgba(245,248,251,0.94)))",
            boxShadow:
              "var(--fit-shadow-soft, 0 10px 24px rgba(15,23,42,0.05)), var(--fit-highlight-inset, inset 0 1px 0 rgba(255,255,255,0.76))",
          },
          ".primary-btn:disabled, button:disabled": {
            opacity: 0.62,
          },
          "@media (max-width: 900px)": {
            ".sidebar": {
              padding: "14px 12px",
            },
            ".sidebar .tab": {
              padding: "7px 10px",
              fontSize: "0.88rem",
            },
            ".page": {
              padding: "10px",
            },
            ".card, .rest-panel, .form-section": {
              padding: "12px",
            },
            ".chart-kpis": {
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            },
          },
          "@media (max-width: 640px)": {
            ".chart-kpis": {
              gridTemplateColumns: "1fr",
            },
          },
        })}
      />
      {children}
    </ThemeProvider>
  );
}
