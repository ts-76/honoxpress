import { Style } from "hono/css";

// Void redraws #app on first mount. Keep Hono's CSSOM host outside that root
// before classes are serialized; otherwise Hono can cache a detached sheet.
if (!import.meta.env.SSR) {
  const host =
    document.getElementById("hono-css") ??
    Object.assign(document.createElement("style"), { id: "hono-css" });
  if (host.parentElement !== document.head) {
    document.head.insertBefore(
      host,
      document.head.querySelector('link[rel="stylesheet"], style[data-vite-dev-id]'),
    );
  }
}

export function SsrStyles() {
  return import.meta.env.SSR ? <Style /> : null;
}
