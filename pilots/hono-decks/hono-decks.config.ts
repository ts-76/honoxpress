import { defineDecksConfig } from "hono-decks";

export default defineDecksConfig({
  mountPath: "/demo",
  build: { root: "decks", outDir: "app/generated" },
  router: {
    embed: { frameAncestors: ["'self'"], robots: false },
    pages: { index: false, viewer: true, print: false, presentation: false, presenter: false },
    presenter: false,
  },
});
