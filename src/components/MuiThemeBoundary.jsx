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
            borderRadius: 14,
            border: `1px solid ${muiTheme.palette.divider}`,
            backgroundColor: muiTheme.palette.background.paper,
            boxShadow:
              muiTheme.palette.mode === "dark"
                ? "0 10px 28px rgba(0,0,0,0.28)"
                : "0 8px 24px rgba(15,23,42,0.06)",
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
              muiTheme.palette.mode === "dark"
                ? "0 0 0 2px rgba(52,211,153,0.3) inset"
                : "0 0 0 2px rgba(15,118,110,0.18) inset",
          },
          "button, .tiny, .tab, .primary, .primary-btn": {
            borderRadius: 10,
            transition:
              "background-color 160ms ease, border-color 160ms ease, color 160ms ease, box-shadow 160ms ease",
          },
          "button:hover, .tiny:hover, .tab:hover": {
            filter: "saturate(1.04)",
          },
          "input, select, textarea": {
            borderRadius: 10,
          },
          ".empty-state": {
            border: `1px dashed ${muiTheme.palette.divider}`,
            borderRadius: 12,
            padding: "14px 12px",
            color: muiTheme.palette.text.secondary,
            background: muiTheme.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "#fff",
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
