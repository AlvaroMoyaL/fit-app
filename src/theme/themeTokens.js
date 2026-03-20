export const LIGHT_THEME_TOKENS = {
  primary: "#556b74",
  primaryDark: "#43575f",
  bg: "#f3f5f7",
  paper: "#fbfcfd",
  border: "#d8dee5",
  textMain: "#172331",
  textMuted: "#687587",
  shellBg: "transparent",
  panelBg: "rgba(251, 252, 253, 0.94)",
  softBg: "rgba(15, 23, 42, 0.025)",
  softBorder: "rgba(216, 222, 229, 0.82)",
  strongBorder: "rgba(216, 222, 229, 0.98)",
  accentSoft: "rgba(85, 107, 116, 0.08)",
  accentStrong: "rgba(85, 107, 116, 0.16)",
  surfaceTop: "rgba(255, 255, 255, 0.98)",
  surfaceBottom: "rgba(245, 248, 251, 0.94)",
  surfaceRaisedTop: "rgba(255, 255, 255, 0.99)",
  surfaceRaisedBottom: "rgba(241, 246, 250, 0.95)",
  shadowSoft: "0 10px 24px rgba(15, 23, 42, 0.05)",
  shadowMedium: "0 16px 34px rgba(15, 23, 42, 0.08)",
  shadowStrong: "0 22px 46px rgba(15, 23, 42, 0.1)",
  highlightInset: "inset 0 1px 0 rgba(255, 255, 255, 0.78)",
  bodyBackground:
    "radial-gradient(1200px circle at 0% 0%, #ffffff 0%, #f8fafb 34%, #f3f5f7 72%, #edf1f4 100%)",
};

export const DARK_THEME_TOKENS = {
  primary: "#8aa0a8",
  primaryDark: "#6f878f",
  bg: "#0f141b",
  paper: "#171e26",
  border: "#2e3946",
  textMain: "#e7edf4",
  textMuted: "#98a6b6",
  shellBg: "transparent",
  panelBg: "rgba(23, 30, 38, 0.92)",
  softBg: "rgba(255,255,255,0.035)",
  softBorder: "rgba(46, 57, 70, 0.82)",
  strongBorder: "rgba(46, 57, 70, 0.98)",
  accentSoft: "rgba(138, 160, 168, 0.1)",
  accentStrong: "rgba(138, 160, 168, 0.18)",
  surfaceTop: "rgba(28, 37, 48, 0.98)",
  surfaceBottom: "rgba(20, 27, 35, 0.95)",
  surfaceRaisedTop: "rgba(31, 41, 53, 0.98)",
  surfaceRaisedBottom: "rgba(21, 28, 37, 0.96)",
  shadowSoft: "0 14px 30px rgba(0, 0, 0, 0.24)",
  shadowMedium: "0 18px 38px rgba(0, 0, 0, 0.3)",
  shadowStrong: "0 24px 48px rgba(0, 0, 0, 0.36)",
  highlightInset: "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
  bodyBackground:
    "radial-gradient(1200px circle at 10% 0%, #19222d 0%, #0f141b 52%, #0b1016 100%)",
};

export function getThemeTokens(mode = "light") {
  return mode === "dark" ? DARK_THEME_TOKENS : LIGHT_THEME_TOKENS;
}

export function applyThemeTokensToDocument(mode = "light") {
  const tokens = getThemeTokens(mode);
  const root = document.documentElement;
  const body = document.body;
  if (!root || !body) return;

  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  const nextThemeColor = mode === "dark" ? "#141b22" : "#43575f";

  root.style.setProperty("--fit-shell-bg", tokens.shellBg);
  root.style.setProperty("--fit-panel-bg", tokens.panelBg);
  root.style.setProperty("--fit-soft-bg", tokens.softBg);
  root.style.setProperty("--fit-soft-border", tokens.softBorder);
  root.style.setProperty("--fit-strong-border", tokens.strongBorder);
  root.style.setProperty("--fit-accent-soft", tokens.accentSoft);
  root.style.setProperty("--fit-accent-strong", tokens.accentStrong);
  root.style.setProperty("--fit-text-muted", tokens.textMuted);
  root.style.setProperty("--fit-text-main", tokens.textMain);
  root.style.setProperty("--fit-surface-top", tokens.surfaceTop);
  root.style.setProperty("--fit-surface-bottom", tokens.surfaceBottom);
  root.style.setProperty("--fit-surface-raised-top", tokens.surfaceRaisedTop);
  root.style.setProperty("--fit-surface-raised-bottom", tokens.surfaceRaisedBottom);
  root.style.setProperty("--fit-shadow-soft", tokens.shadowSoft);
  root.style.setProperty("--fit-shadow-medium", tokens.shadowMedium);
  root.style.setProperty("--fit-shadow-strong", tokens.shadowStrong);
  root.style.setProperty("--fit-highlight-inset", tokens.highlightInset);
  root.style.setProperty("--fit-body-bg", tokens.bodyBackground);
  root.style.setProperty("--fit-paper", tokens.paper);
  root.style.setProperty("--fit-divider", tokens.border);
  root.style.setProperty("--fit-primary", tokens.primary);
  root.style.setProperty("--fit-primary-dark", tokens.primaryDark);
  root.setAttribute("data-theme", mode);
  root.style.colorScheme = mode;

  body.style.background = tokens.bodyBackground;
  body.style.color = tokens.textMain;
  body.setAttribute("data-theme", mode);
  body.style.colorScheme = mode;

  if (themeColorMeta) {
    themeColorMeta.setAttribute("content", nextThemeColor);
  }
}
