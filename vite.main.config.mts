import path from "node:path";
import { defineConfig } from "vite";

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      external: [
        // Stagehand + Playwright are native Node modules that must stay unbundled
        "@browserbasehq/stagehand",
        "playwright",
        "playwright-core",
        "patchright-core",
        "puppeteer-core",
      ],
    },
  },
});
