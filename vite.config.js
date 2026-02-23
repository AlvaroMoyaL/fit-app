/* global process */
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    define: {
      "import.meta.env.VITE_APP_VERSION": JSON.stringify(
        process.env.npm_package_version || "0.0.0"
      ),
    },
    server: {
      port: 5175,
      strictPort: true,
      proxy: {
        "/edb": {
          target: "https://exercisedb.p.rapidapi.com",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/edb/, ""),
          headers: {
            "X-RapidAPI-Key": env.VITE_RAPIDAPI_KEY,
            "X-RapidAPI-Host": env.VITE_RAPIDAPI_HOST,
          },
        },
      },
    },
  };
});
