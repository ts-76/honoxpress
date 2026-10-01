import { defineConfig } from "@cloudflare/config/public";

export default defineConfig({
  worker: {
    name: "honoxpress-poc",
    compatibilityDate: "2026-10-01",
    compatibilityFlags: ["nodejs_compat"],
    entrypoint: "./dist/worker/index.js",
    assets: {
      htmlHandling: "drop-trailing-slash",
      notFoundHandling: "none",
      runWorkerFirst: ["/demo/*"],
    },
  },
});
