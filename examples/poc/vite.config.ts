import { defineConfig, type Plugin, lazyPlugins } from "vite-plus";
import honox from "./build/honox-watch.ts";
import client from "honox/vite/client";
import mdx from "@mdx-js/rollup";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import ssg from "@hono/vite-ssg";
import worker from "@hono/vite-build/cloudflare-workers";
import { defaultPlugin } from "hono/ssg";
import { mkdir, writeFile } from "node:fs/promises";
import { docsMetadataPlugin, remarkDocsHeadings } from "honoxpress/build";
import { docsOnlyPlugin } from "./build/docs-only.ts";

function audit(target: string): Plugin {
  return {
    name: "bundle-evidence",
    async generateBundle(_, bundle) {
      const loaded = [...this.getModuleIds()].map((id) => id.replace(process.cwd(), ".")).sort();
      const chunks = Object.values(bundle)
        .filter((x) => x.type === "chunk")
        .map((x) => ({
          file: x.fileName,
          modules: Object.keys(x.modules)
            .map((id) => id.replace(process.cwd(), "."))
            .sort(),
        }));
      await mkdir("dist/evidence", { recursive: true });
      await writeFile(
        `dist/evidence/${target}-modules.json`,
        JSON.stringify({ loaded, chunks }, null, 2),
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  if (mode === "client")
    return {
      fmt: {
        ignorePatterns: [
          "dist/**",
          "packages/*/dist/**",
          "evidence/**",
          ".cloudflare/**",
          "test-results/**",
          "pnpm-lock.yaml",
        ],
      },
      test: {
        include: ["tests/build.test.mjs"],
        fileParallelism: false,
        testTimeout: 60000,
        hookTimeout: 60000,
      },
      lint: {
        jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
        rules: { "vite-plus/prefer-vite-plus-imports": "error" },
        options: { typeAware: true, typeCheck: true },
      },
      plugins: lazyPlugins(() => [client(), audit("client")]),
      build: { outDir: "dist/public", emptyOutDir: true },
    };
  const ssgReport = { accepted: [] as string[], skipped: [] as string[] };
  return {
    fmt: {
      ignorePatterns: [
        "dist/**",
        "packages/*/dist/**",
        "evidence/**",
        ".cloudflare/**",
        "test-results/**",
        "pnpm-lock.yaml",
      ],
    },
    test: {
      include: ["tests/build.test.mjs"],
      fileParallelism: false,
      testTimeout: 60000,
      hookTimeout: 60000,
    },
    lint: {
      jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
      rules: { "vite-plus/prefer-vite-plus-imports": "error" },
      options: { typeAware: true, typeCheck: true },
    },
    plugins: lazyPlugins(async () => [
      docsMetadataPlugin({ locales: ["en", "ja"], defaultLocale: "en", worker: mode === "worker" }),
      honox({ entry: mode === "worker" ? "./app/worker.ts" : "./app/server.ts" }),
      ...(mode === "worker"
        ? []
        : [
            mdx({
              jsxImportSource: "hono/jsx",
              remarkPlugins: [
                remarkFrontmatter,
                [remarkMdxFrontmatter, { name: "frontmatter" }],
                remarkDocsHeadings,
              ],
            }),
          ]),
      ...(mode === "ssg"
        ? [
            ssg({
              entry: "./app/server.ts",
              plugins: [
                docsOnlyPlugin(ssgReport),
                defaultPlugin(),
                {
                  async afterGenerateHook(result) {
                    await mkdir("dist/evidence", { recursive: true });
                    await writeFile(
                      "dist/evidence/ssg.json",
                      JSON.stringify({ ...ssgReport, result }, null, 2),
                    );
                  },
                },
              ],
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
            audit("worker"),
          ]
        : []),
    ]),
    build: { outDir: "dist/public", emptyOutDir: false, copyPublicDir: false },
  };
});
