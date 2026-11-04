import { defineConfig } from "void/config";

export default defineConfig({
  worker: { compatibility_date: "2026-02-24" },
  cloudflare: {
    name: "void-hono-decks-example",
    workers_dev: true,
    preview_urls: false,
  },
});
