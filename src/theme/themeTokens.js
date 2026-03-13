export const LIGHT_THEME_TOKENS = {
  primary: "#0f766e",
  primaryDark: "#0b5f58",
  bg: "#f4f1eb",
  paper: "#ffffff",
  border: "#ddd4c9",
  textMain: "#1f2937",
  textMuted: "#5b6472",
  shellBg: "transparent",
  panelBg: "rgba(255, 255, 255, 0.78)",
  softBg: "rgba(15, 23, 42, 0.03)",
  softBorder: "rgba(221, 212, 201, 0.72)",
  strongBorder: "rgba(221, 212, 201, 0.96)",
  accentSoft: "rgba(15, 118, 110, 0.12)",
  accentStrong: "rgba(15, 118, 110, 0.22)",
  bodyBackground:
    "radial-gradient(1200px circle at 10% 0%, #ffffff 0%, #f4f1eb 52%, #ece7de 100%)",
};

export const DARK_THEME_TOKENS = {
  primary: "#34d399",
  primaryDark: "#10b981",
  bg: "#0f1318",
  paper: "#171d24",
  border: "#2d3745",
  textMain: "#e5e7eb",
  textMuted: "#9aa4b2",
  shellBg: "transparent",
  panelBg: "rgba(23, 29, 36, 0.82)",
  softBg: "rgba(255,255,255,0.04)",
  softBorder: "rgba(45, 55, 69, 0.72)",
  strongBorder: "rgba(45, 55, 69, 0.96)",
  accentSoft: "rgba(52, 211, 153, 0.12)",
  accentStrong: "rgba(52, 211, 153, 0.22)",
  bodyBackground:
    "radial-gradient(1200px circle at 10% 0%, #1b2330 0%, #0f1318 52%, #0a0d12 100%)",
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
  const nextThemeColor = mode === "dark" ? "#0f1318" : "#0b5f58";

  root.style.setProperty("--fit-shell-bg", tokens.shellBg);
  root.style.setProperty("--fit-panel-bg", tokens.panelBg);
  root.style.setProperty("--fit-soft-bg", tokens.softBg);
  root.style.setProperty("--fit-soft-border", tokens.softBorder);
  root.style.setProperty("--fit-strong-border", tokens.strongBorder);
  root.style.setProperty("--fit-accent-soft", tokens.accentSoft);
  root.style.setProperty("--fit-accent-strong", tokens.accentStrong);
  root.style.setProperty("--fit-text-muted", tokens.textMuted);
  root.style.setProperty("--fit-text-main", tokens.textMain);
  root.style.setProperty("--fit-body-bg", tokens.bodyBackground);
  root.style.setProperty("--fit-paper", tokens.paper);
  root.style.setProperty("--fit-divider", tokens.border);
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
