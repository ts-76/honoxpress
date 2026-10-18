import { defineConfig } from "void/config";
import { themeBootstrap } from "./integration/theme-bootstrap";

export default defineConfig({
  cloudflare: { name: "honoxpress-void-tsx-pilot" },
  head: {
    title: "honoxpress · Void TSX pilot",
    meta: [
      { charset: "UTF-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
    ],
    link: [{ rel: "icon", href: "data:," }],
    script: [{ id: "hx-pilot-theme", innerHTML: themeBootstrap }],
  },
});
