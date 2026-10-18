import { defineConfig } from "void/config";
import docsConfig from "./app/docs.config";
export default defineConfig({
  cloudflare: { name: "honoxpress-void-docs" },
  head: {
    title: docsConfig.name,
    meta: [
      { charset: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
    ],
    link: [
      { rel: "stylesheet", href: docsConfig.stylesheetHref ?? "/style.css" },
      { rel: "icon", href: "data:," },
    ],
  },
});
