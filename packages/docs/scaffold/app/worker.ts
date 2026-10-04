import { createApp } from "honox/server/base";

// Select routes before importing them so the Worker graph never includes MDX.
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
