import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { applyThemeTokensToDocument } from "./theme/themeTokens";

function getStoredThemeMode() {
  try {
    const saved = localStorage.getItem("fit_theme_mode");
    return saved === "light" || saved === "dark" ? saved : "";
  } catch {
    return "";
  }
}

function resolveInitialThemeMode() {
  const saved = getStoredThemeMode();
  if (saved) return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
}

function applyThemeModeToDom(themeMode) {
  try {
    localStorage.setItem("fit_theme_mode", themeMode);
  } catch {
    // ignore storage failures
  }
  document.documentElement.classList.toggle("theme-dark", themeMode === "dark");
  document.body.classList.toggle("theme-dark", themeMode === "dark");
  applyThemeTokensToDocument(themeMode);
}

const bootThemeMode = resolveInitialThemeMode();
if (typeof document !== "undefined") {
  applyThemeModeToDom(bootThemeMode);
}

function RootApp() {
  const [themeMode, setThemeMode] = useState(bootThemeMode);

  useEffect(() => {
    applyThemeModeToDom(themeMode);
  }, [themeMode]);

  return (
    <>
      <App
        themeMode={themeMode}
        onToggleTheme={() => setThemeMode((prev) => (prev === "dark" ? "light" : "dark"))}
      />
    </>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootApp />
  </StrictMode>,
)

const removeSplash = () => {
  const splash = document.getElementById("boot-splash");
  if (!splash) return;
  splash.style.opacity = "0";
  setTimeout(() => splash.remove(), 240);
};

const hideSplashWhenReady = () => {
  requestAnimationFrame(() => {
    requestAnimationFrame(removeSplash);
  });
};

if (document.readyState === "complete") {
  hideSplashWhenReady();
} else {
  window.addEventListener("load", hideSplashWhenReady, { once: true });
}

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const swUrl = `/sw.js?v=${import.meta.env.VITE_APP_BUILD || import.meta.env.VITE_APP_VERSION || "dev"}`;
    navigator.serviceWorker
      .register(swUrl)
      .then((registration) => registration.update().catch(() => {}))
      .catch(() => {
        // ignore
      });
  });
}
