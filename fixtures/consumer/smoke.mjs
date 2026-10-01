import assert from "node:assert/strict";
import { readFile, realpath, copyFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createDocsCatalog, resolveClientScript } from "@honox-docs-poc/docs";
import { docsMetadataPlugin, docsOnlyPlugin } from "@honox-docs-poc/docs/build";

const entry = fileURLToPath(import.meta.resolve("@honox-docs-poc/docs"));
const root = path.dirname(path.dirname(entry));
assert.ok((await realpath(root)).startsWith(await realpath(process.cwd())));
for (const name of ["index", "catalog", "client"]) {
  const code = await readFile(path.join(root, "dist", `${name}.js`), "utf8");
  assert.doesNotMatch(code, /node:|@mdx-js|remark-|from ["']react/);
  await readFile(path.join(root, "dist", `${name}.d.ts`));
}
assert.throws(() => import.meta.resolve("@honox-docs-poc/docs/src/catalog.ts"), {
  code: "ERR_PACKAGE_PATH_NOT_EXPORTED",
});
const catalog = createDocsCatalog({
  locales: ["en", "ja"],
  defaultLocale: "en",
  entries: [{ route: "docs/start.mdx", title: "Start" }],
});
assert.deepEqual(catalog.translations("/docs/start"), [
  { locale: "en", href: "/docs/start" },
  { locale: "ja" },
]);
assert.equal(
  resolveClientScript({ entry: { file: "static/client-hash.js" } }, "entry"),
  "/static/client-hash.js",
);
assert.equal(
  docsOnlyPlugin({ locales: ["en"], defaultLocale: "en" }).beforeRequestHook(
    new Request("https://local.test/demo/:name"),
  ),
  false,
);
const plugin = docsMetadataPlugin({
  locales: ["en", "ja"],
  defaultLocale: "en",
  worker: true,
  routeRoot: "deliberately-does-not-exist",
});
plugin.configResolved({ root: process.cwd() });
const virtual = await plugin.load.call(
  {
    addWatchFile() {
      throw new Error("Worker must not discover MDX");
    },
  },
  "\0virtual:honox-docs/catalog",
);
assert.match(virtual, /entries:\[\]/);
assert.doesNotMatch(virtual, /frontmatter|\.mdx/);
for (const [name, target] of [
  ["docs-ui.tsx", "app/components/docs-ui.tsx"],
  ["copy-code.tsx", "app/islands/copy-code.tsx"],
  ["demo-frame.tsx", "app/components/demo-frame.tsx"],
  ["docs.css", "public/style.css"],
]) {
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(
    fileURLToPath(import.meta.resolve(`@honox-docs-poc/docs/templates/${name}`)),
    target,
  );
}
console.log(
  "External package runtime, private exports, emitted types, Worker empty metadata and copied assets passed",
);
