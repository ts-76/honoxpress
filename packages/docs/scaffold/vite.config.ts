import { defineConfig, lazyPlugins } from "vite-plus";
import honox from "./build/honox-watch.ts";
import client from "honox/vite/client";
import mdx from "@mdx-js/rollup";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import ssg from "@hono/vite-ssg";
import worker from "@hono/vite-build/cloudflare-workers";
import { defaultPlugin } from "hono/ssg";
import { docsMetadataPlugin, remarkDocsComponents, remarkDocsHeadings } from "honoxpress/build";
import { components } from "./app/mdx-components";
import docsSite from "./app/docs.config";
import { docsOnlyPlugin } from "./build/docs-only.ts";

const locales = Object.keys(docsSite.localeLabels);
const defaultLocale = "en";

export default defineConfig(({ mode }) => {
  if (mode === "client") {
    return {
      plugins: lazyPlugins(() => [client()]),
      build: { outDir: "dist/public", emptyOutDir: true },
    };
  }

  return {
    optimizeDeps: {
      noDiscovery: true,
      include: [
        "honox/client",
        "honox/vite/components",
        "honox/server/components",
        "hono/jsx",
        "hono/jsx/jsx-runtime",
        "hono/jsx/jsx-dev-runtime",
        "hono/jsx/dom",
      ],
    },
    plugins: lazyPlugins(async () => [
      docsMetadataPlugin({ locales, defaultLocale, worker: mode === "worker" }),
      honox({ entry: mode === "worker" ? "./app/worker.ts" : "./app/server.ts" }),
      ...(mode === "worker"
        ? []
        : [
            mdx({
              jsxImportSource: "hono/jsx",
              providerImportSource: "/app/mdx-components",
              remarkPlugins: [
                remarkFrontmatter,
                [remarkMdxFrontmatter, { name: "frontmatter" }],
                remarkDocsHeadings,
                [remarkDocsComponents, { names: Object.keys(components) }],
              ],
            }),
          ]),
      ...(mode === "ssg"
        ? [
            ssg({
              entry: "./app/server.ts",
              plugins: [docsOnlyPlugin(), defaultPlugin()],
            }),
          ]
        : []),
      ...(mode === "worker"
        ? [
            worker({
              entry: "./app/worker.ts",
              outputDir: "dist/worker",
              output: "index.js",
              emptyOutDir: true,
              minify: false,
            }),
          ]
        : []),
    ]),
    build: { outDir: "dist/public", emptyOutDir: false, copyPublicDir: false },
  };
});
