import { createDocsCatalog, resolveClientScript, type DocsCatalog } from "@honox-docs-poc/docs";
import { docsMetadataPlugin, docsOnlyPlugin, remarkDocsHeadings } from "@honox-docs-poc/docs/build";
import type { Plugin } from "vite-plus";

const docs: DocsCatalog = createDocsCatalog({
  locales: ["en", "ja"],
  defaultLocale: "en",
  entries: [{ route: "docs/start.mdx", title: "Start" }],
});
const plugin: Plugin = docsMetadataPlugin({
  locales: ["en", "ja"],
  defaultLocale: "en",
  worker: false,
});
resolveClientScript({ "app/client.ts": { file: "static/client-hash.js" } }, "app/client.ts");
docs.navigation("en");
docs.translations("/docs/start");
docsOnlyPlugin({ locales: ["en"], defaultLocale: "en" });
remarkDocsHeadings();
void plugin;
// @ts-expect-error title is required by the package's emitted types
createDocsCatalog({ locales: ["en"], defaultLocale: "en", entries: [{ route: "docs/a.mdx" }] });
// @ts-expect-error Worker target choice must be explicit
docsMetadataPlugin({ locales: ["en"], defaultLocale: "en" });
