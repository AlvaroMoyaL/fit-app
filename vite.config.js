/* global process */
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const pkg = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf-8")
);
const appVersion = String(pkg?.version || "0.0.0");
let gitBuild = "dev";
try {
  gitBuild = execSync("git rev-parse --short HEAD").toString().trim() || "dev";
} catch {
  gitBuild = "dev";
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    define: {
      "import.meta.env.VITE_APP_VERSION": JSON.stringify(
        env.VITE_APP_VERSION || process.env.npm_package_version || appVersion
      ),
      "import.meta.env.VITE_APP_BUILD": JSON.stringify(
        env.VITE_APP_BUILD ||
          process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
          gitBuild
      ),
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) {
              if (
                id.includes("/src/components/StatsMetricDrawer") ||
                id.includes("/src/components/MetricsCharts") ||
                id.includes("/src/components/WeeklyCharts") ||
                id.includes("/src/components/HistoryWeek")
              ) {
                return "insights";
              }
              return undefined;
            }

            if (id.includes("@mui") || id.includes("@emotion")) return "vendor-mui";
            if (id.includes("@supabase")) return "vendor-supabase";
            return "vendor";
          },
        },
      },
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
