import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
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
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // ignore
    });
  });
}
