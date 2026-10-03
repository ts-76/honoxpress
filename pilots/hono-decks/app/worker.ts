import { createApp } from "honox/server/base";

// Filtering after createApp() is too late: its default globs eagerly import MDX.
// These literal globs select the graph before Vite resolves any docs imports.
export default createApp({
  root: "/app/routes",
  ROUTES: import.meta.glob(["/app/routes/index.tsx", "/app/routes/demo/index.tsx"], {
    eager: true,
  }),
  RENDERER: import.meta.glob("/app/routes/_renderer.tsx", { eager: true }),
  NOT_FOUND: import.meta.glob("/app/routes/_404.tsx", { eager: true }),
  ERROR: {},
  MIDDLEWARE: {},
});
