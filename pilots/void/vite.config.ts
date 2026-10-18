import { defineConfig } from "vite";
import { voidPlugin } from "void";
import { voidHonoJsx } from "void-plugin-hono-jsx/plugin";
import { fileURLToPath } from "node:url";
import { ssrCssPilot } from "./integration/ssr-css-plugin.ts";

export default defineConfig({
  resolve: {
    alias: {
      "@components": fileURLToPath(
        new URL(
          process.env.HX_BASELINE === "1" ? "./.generated/baseline" : "./.generated/adapted",
          import.meta.url,
        ),
      ),
    },
  },
  define: { __HX_BASELINE__: JSON.stringify(process.env.HX_BASELINE === "1") },
  plugins: [
    voidPlugin(),
    voidHonoJsx(),
    ...(process.env.HX_BASELINE === "1" ? [] : [ssrCssPilot()]),
  ],
});
