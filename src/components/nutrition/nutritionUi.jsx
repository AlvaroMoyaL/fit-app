import { Box } from "@mui/material";
import { alpha } from "@mui/material/styles";

function toneFromTheme(theme, paletteKey = "secondary", label = "") {
  const paletteEntry = theme.palette[paletteKey] || theme.palette.secondary;
  const main = paletteEntry.main || theme.palette.secondary.main;
  return {
    accent: alpha(main, 0.92),
    fill: main,
    track: alpha(main, theme.palette.mode === "dark" ? 0.2 : 0.12),
    background: alpha(main, theme.palette.mode === "dark" ? 0.12 : 0.07),
    border: alpha(main, theme.palette.mode === "dark" ? 0.28 : 0.18),
    label,
  };
}

function nutritionInsetHighlight(theme) {
  return theme.palette.mode === "dark"
    ? "inset 0 1px 0 rgba(255,255,255,0.04)"
    : "inset 0 1px 0 rgba(255,255,255,0.76)";
}

function nutritionSurfaceGradient(theme, level = "base") {
  if (theme.palette.mode === "dark") {
    return level === "raised"
      ? "linear-gradient(180deg, rgba(31,41,53,0.98) 0%, rgba(21,28,37,0.96) 100%)"
      : "linear-gradient(180deg, rgba(28,37,48,0.98) 0%, rgba(20,27,35,0.95) 100%)";
  }

  return level === "raised"
    ? "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(241,246,250,0.95) 100%)"
    : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(245,248,251,0.94) 100%)";
}

function nutritionSurfaceShadow(theme, level = "base") {
  const inset = nutritionInsetHighlight(theme);

  if (theme.palette.mode === "dark") {
    if (level === "hero") return `0 24px 48px rgba(0, 0, 0, 0.34), ${inset}`;
    if (level === "raised") return `0 18px 38px rgba(0, 0, 0, 0.3), ${inset}`;
    return `0 14px 30px rgba(0, 0, 0, 0.24), ${inset}`;
  }

  if (level === "hero") return "0 22px 46px rgba(15, 23, 42, 0.1), inset 0 1px 0 rgba(255,255,255,0.76)";
  if (level === "raised") return "0 16px 34px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255,255,255,0.76)";
  return "0 10px 24px rgba(15, 23, 42, 0.05), inset 0 1px 0 rgba(255,255,255,0.76)";
}

export function getNutritionMetricState(theme, value, target, options = {}) {
  const current = Math.max(0, Number(value || 0));
  const goal = Math.max(0, Number(target || 0));
  const overWarnRatio = Number(options.overWarnRatio || 1.2);
  const lowWarnRatio = Number(options.lowWarnRatio || 0.6);
  const progress = goal > 0 ? Math.max(0, Math.min(1, current / goal)) : 0;
  const ratio = goal > 0 ? current / goal : 0;

  if (!goal) {
    return {
      progress,
      ...toneFromTheme(theme, "secondary", "Sin referencia"),
    };
  }

  if (ratio > overWarnRatio) {
    return {
      progress,
      ...toneFromTheme(theme, "error", "Sobre rango"),
    };
  }

  if (ratio >= 0.9) {
    return {
      progress,
      ...toneFromTheme(theme, "primary", "En rango"),
    };
  }

  if (ratio >= lowWarnRatio) {
    return {
      progress,
      ...toneFromTheme(theme, "warning", "Avanzando"),
    };
  }

  return {
    progress,
    ...toneFromTheme(theme, "info", "Bajo objetivo"),
  };
}

export function getNutritionInformationalMetricState(theme, value, reference) {
  const current = Math.max(0, Number(value || 0));
  const goal = Math.max(0, Number(reference || 0));
  return {
    progress: goal > 0 ? Math.max(0, Math.min(1, current / goal)) : 0,
    ...toneFromTheme(theme, "secondary", "Informativo"),
  };
}

export function nutritionTabLabelDot(color, text) {
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
      <Box
        component="span"
        sx={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          bgcolor: color,
          flex: "0 0 auto",
        }}
      />
      <Box component="span">{text}</Box>
    </Box>
  );
}

export const nutritionSurfaceSx = (theme) => ({
  border: "1px solid",
  borderColor: alpha(theme.palette.divider, 0.95),
  borderRadius: { xs: 3, sm: 3.5 },
  bgcolor: theme.palette.background.paper,
  backgroundImage: nutritionSurfaceGradient(theme),
  boxShadow: nutritionSurfaceShadow(theme),
});

export const nutritionHeroSx = (theme) => ({
  ...nutritionSurfaceSx(theme),
  position: "relative",
  overflow: "hidden",
  display: "grid",
  gap: { xs: 1.1, sm: 1.4 },
  p: { xs: 1.45, sm: 1.9, md: 2.2 },
  boxShadow: nutritionSurfaceShadow(theme, "hero"),
  "& > *": {
    position: "relative",
    zIndex: 1,
  },
  "&::before": {
    content: '""',
    position: "absolute",
    inset: "0 auto auto 0",
    width: "100%",
    height: 4,
    background: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.88)} 0%, ${alpha(
      theme.palette.primary.main,
      0.2,
    )} 78%, transparent 100%)`,
  },
  "&::after": {
    content: '""',
    position: "absolute",
    right: -12,
    top: -18,
    width: 176,
    height: 176,
    borderRadius: "50%",
    background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.18 : 0.16)} 0%, ${alpha(
      theme.palette.primary.main,
      theme.palette.mode === "dark" ? 0.08 : 0.04,
    )} 42%, transparent 74%)`,
    filter: "blur(2px)",
    pointerEvents: "none",
  },
});

export const nutritionTabsRailSx = (theme) => ({
  ...nutritionSurfaceSx(theme),
  p: { xs: 0.4, sm: 0.5 },
  bgcolor: "transparent",
  backgroundImage: nutritionSurfaceGradient(theme, "raised"),
  boxShadow: nutritionSurfaceShadow(theme),
});

export const nutritionCompactTabsSx = (theme, options = {}) => ({
  minHeight: { xs: options.mobileMinHeight || 42, sm: options.desktopMinHeight || 38 },
  width: "100%",
  "& .MuiTabs-indicator": {
    display: "none",
  },
  "& .MuiTabs-flexContainer": {
    gap: options.gap || 0.45,
  },
  "& .MuiTab-root": {
    minHeight: { xs: options.mobileMinHeight || 42, sm: options.desktopMinHeight || 38 },
    minWidth: "auto",
    px: { xs: options.mobilePx || 1.15, sm: options.desktopPx || 1.2 },
    py: { xs: 0.72, sm: 0.52 },
    mr: 0,
    borderRadius: 2.6,
    border: `1px solid ${alpha(theme.palette.divider, 0.78)}`,
    backgroundImage: `linear-gradient(180deg, ${alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.06 : 0.04)} 0%, ${alpha(
      theme.palette.text.primary,
      theme.palette.mode === "dark" ? 0.03 : 0.02,
    )} 100%)`,
    color: theme.palette.text.secondary,
    textTransform: "none",
    fontWeight: 700,
    whiteSpace: options.wrapLabels ? "normal" : "nowrap",
    fontSize: { xs: options.mobileFontSize || "0.88rem", sm: options.desktopFontSize || "0.84rem" },
    lineHeight: 1.2,
    boxShadow: nutritionInsetHighlight(theme),
    "&.Mui-selected": {
      color: theme.palette.text.primary,
      backgroundImage: `linear-gradient(180deg, ${alpha(
        theme.palette.primary.main,
        theme.palette.mode === "dark" ? 0.24 : 0.18,
      )} 0%, ${alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.12 : 0.08)} 100%)`,
      borderColor: alpha(theme.palette.primary.main, 0.24),
      boxShadow:
        theme.palette.mode === "dark"
          ? `0 10px 22px ${alpha(theme.palette.primary.dark, 0.18)}, ${nutritionInsetHighlight(theme)}`
          : `0 10px 22px ${alpha(theme.palette.primary.dark, 0.12)}, ${nutritionInsetHighlight(theme)}`,
    },
    "&:hover": {
      backgroundColor: alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.08 : 0.05),
      boxShadow: nutritionSurfaceShadow(theme),
    },
  },
});

export const nutritionNavButtonSx = (theme, isActive) => ({
  flex: { xs: "0 0 auto", sm: "1 1 auto" },
  minWidth: { xs: 148, sm: 0 },
  minHeight: 52,
  px: 1.5,
  py: 1.1,
  borderRadius: 3,
  justifyContent: "flex-start",
  textAlign: "left",
  whiteSpace: { xs: "nowrap", sm: "normal" },
  textTransform: "none",
  fontWeight: 700,
  lineHeight: 1.2,
  fontSize: { xs: "0.92rem", sm: "0.94rem" },
  border: "1px solid",
  borderColor: isActive
    ? alpha(theme.palette.primary.main, 0.24)
    : alpha(theme.palette.divider, 0.8),
  bgcolor: "transparent",
  backgroundImage: isActive
    ? `linear-gradient(180deg, ${alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.2 : 0.16)} 0%, ${alpha(
        theme.palette.primary.main,
        theme.palette.mode === "dark" ? 0.1 : 0.06,
      )} 100%)`
    : `linear-gradient(180deg, ${alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.06 : 0.04)} 0%, ${alpha(
        theme.palette.text.primary,
        theme.palette.mode === "dark" ? 0.03 : 0.02,
      )} 100%)`,
  color: isActive ? "text.primary" : "text.secondary",
  boxShadow: isActive
    ? nutritionSurfaceShadow(theme, "raised")
    : nutritionInsetHighlight(theme),
  "&:hover": {
    bgcolor: isActive
      ? alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.24 : 0.12)
      : alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.08 : 0.05),
    borderColor: isActive
      ? alpha(theme.palette.primary.main, 0.28)
      : alpha(theme.palette.divider, 0.95),
    boxShadow: isActive ? nutritionSurfaceShadow(theme, "hero") : nutritionSurfaceShadow(theme),
  },
});
