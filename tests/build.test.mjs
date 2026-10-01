import { test } from "vite-plus/test";
import assert from "node:assert/strict";
import { readFile, access, mkdir, writeFile, readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";

import { relative } from "node:path";

const read = (p) => readFile(p, "utf8");
const json = async (p) => JSON.parse(await read(p));

async function assertArtifacts() {
  const manifest = await json("dist/evidence/client-manifest.json");
  assert.ok(manifest["app/client.ts"].isEntry);
  for (const entry of Object.values(manifest))
    if (entry.file) await access(`dist/public/${entry.file}`);
  for (const path of ["docs/getting-started", "ja/docs/getting-started"]) {
    const html = await read(`dist/public/${path}.html`);
    assert.match(html, /DOCS_BODY_/);
    assert.match(html, /component-name="\/app\/islands\/counter.tsx"/);
    assert.match(html, new RegExp(`src="/${manifest["app/client.ts"].file}"`));
    assert.match(html, /src="\/demo\/clock"/);
  }
  const worker = await read("dist/worker/index.js");
  assert.doesNotMatch(
    worker,
    /DOCS_BODY_|Getting started ·|はじめに ·|@mdx-js|remark-frontmatter|remark-mdx-frontmatter|function _createMdxContent/,
  );
  for (const target of ["worker", "client"]) {
    const evidence = await json(`dist/evidence/${target}-modules.json`);
    assert.ok(evidence.loaded.length > 0);
    assert.equal(
      evidence.loaded.filter((id) => /\.mdx|@mdx-js|remark-|\/routes\/(?:ja\/)?docs\//.test(id))
        .length,
      0,
    );
  }
  const report = await json("dist/evidence/ssg.json");
  assert.deepEqual(
    [...new Set(report.accepted)].sort((a, b) => a.localeCompare(b)),
    ["/docs/getting-started", "/ja/docs/getting-started"],
  );
  assert.ok(report.skipped.includes("/demo/clock"), JSON.stringify(report));
  assert.ok(report.skipped.includes("/demo/status"));
  assert.equal(report.result.success, true);
  assert.equal(report.result.files.length, 2);
  await assert.rejects(access("dist/public/demo/clock.html"));
  await assert.rejects(access("dist/public/.vite/manifest.json"));
}

test(
  "separate client/SSG/Worker graphs, manifest and static files survive the full pipeline",
  assertArtifacts,
);

test("SSG excludes /demo before execution (including an adversarial dynamic route)", async () => {
  const { createServer } = await import("vite-plus");
  const { Hono } = await import("hono");
  const { toSSG, defaultPlugin } = await import("hono/ssg");
  const server = await createServer({
    server: { middlewareMode: true, hmr: false, ws: false },
    mode: "ssg",
  });
  try {
    const { docsOnlyPlugin } = await server.ssrLoadModule("/build/docs-only.ts");
    const app = new Hono();
    let calls = 0;
    app.get("/docs/example", (c) => c.html("<h1>Static</h1>"));
    app.get("/demo/clock", () => {
      calls++;
      throw new Error("unexpected execution");
    });
    app.get("/demo/:name", () => {
      calls++;
      throw new Error("unexpected param discovery");
    });
    const generated = [];
    const report = { accepted: [], skipped: [] };
    const result = await toSSG(
      app,
      {
        async mkdir() {},
        async writeFile(path) {
          generated.push(path);
        },
      },
      { dir: "dist/test-memory", plugins: [docsOnlyPlugin(report), defaultPlugin()] },
    );
    assert.equal(result.success, true);
    assert.equal(calls, 0);
    assert.equal(generated.length, 1);
    assert.ok(report.skipped.includes("/demo/:name"));
  } finally {
    await server.close();
  }
});

test("subsequent full build removes obsolete HTML, client assets and Worker outputs", async () => {
  const previousManifest = await read("dist/evidence/client-manifest.json");
  const previousWorker = await read("dist/worker/index.js");
  await mkdir("dist/public/docs", { recursive: true });
  for (const path of [
    "dist/public/docs/obsolete.html",
    "dist/public/static/obsolete.js",
    "dist/worker/obsolete.js",
  ]) {
    await writeFile(path, "stale build output");
  }
  const rebuilt = spawnSync(process.execPath, ["build/build.mjs"], { encoding: "utf8" });
  assert.equal(rebuilt.status, 0, rebuilt.stdout + rebuilt.stderr);
  for (const path of [
    "dist/public/docs/obsolete.html",
    "dist/public/static/obsolete.js",
    "dist/worker/obsolete.js",
  ]) {
    await assert.rejects(access(path));
  }
  await assertArtifacts();
  assert.equal(await read("dist/evidence/client-manifest.json"), previousManifest);
  assert.equal(await read("dist/worker/index.js"), previousWorker);
});

test("positive control: standard eager router includes MDX bodies in a Worker bundle", async () => {
  const { build } = await import("vite-plus");
  const { default: honox } = await import("honox/vite");
  const { default: mdx } = await import("@mdx-js/rollup");
  const { default: remarkFrontmatter } = await import("remark-frontmatter");
  const { default: remarkMdxFrontmatter } = await import("remark-mdx-frontmatter");
  const { default: worker } = await import("@hono/vite-build/cloudflare-workers");
  const result = await build({
    configFile: false,
    mode: "eager-control",
    logLevel: "error",
    plugins: [
      honox(),
      mdx({
        jsxImportSource: "hono/jsx",
        remarkPlugins: [remarkFrontmatter, [remarkMdxFrontmatter, { name: "frontmatter" }]],
      }),
      worker({ entry: "./app/server.ts", outputDir: "dist/eager-control", minify: false }),
    ],
    build: { write: false, copyPublicDir: false },
  });
  const outputs = (Array.isArray(result) ? result : [result]).flatMap((x) => x.output);
  const chunks = outputs.filter((x) => x.type === "chunk");
  const code = chunks.map((x) => x.code).join("\n");
  const mdxModules = chunks
    .flatMap((x) => Object.keys(x.modules))
    .filter((id) => id.endsWith(".mdx"));
  assert.match(code, /DOCS_BODY_EN_7f91/);
  assert.match(code, /DOCS_BODY_JA_8e42/);
  assert.equal(mdxModules.length, 2);
  await writeFile(
    "dist/evidence/eager-control.json",
    JSON.stringify(
      {
        bytes: Buffer.byteLength(code),
        mdxModules: mdxModules.map((id) => id.replace(process.cwd(), ".")),
        sentinelsPresent: true,
        emittedToDisk: false,
      },
      null,
      2,
    ),
  );
});

test("cf Build Output preserves routes/assets and excludes docs/compiler code", async () => {
  const base = ".cloudflare/output/v0/workers/default";
  await mkdir(`${base}/assets`, { recursive: true });
  await writeFile(`${base}/assets/obsolete.txt`, "stale cf output");
  const built = spawnSync("cf", ["build"], { encoding: "utf8" });
  assert.equal(built.status, 0, built.stdout + built.stderr);
  await assert.rejects(access(`${base}/assets/obsolete.txt`));
  const config = await json(`${base}/worker.config.json`);
  assert.equal(config.assets.htmlHandling, "drop-trailing-slash");
  assert.equal(config.assets.notFoundHandling, "none");
  assert.deepEqual(config.assets.runWorkerFirst, ["/demo/*"]);
  assert.ok(config.compatibilityFlags.includes("nodejs_compat"));
  const code = await read(`${base}/bundle/${config.manifest.mainModule}`);
  assert.doesNotMatch(code, /DOCS_BODY_|@mdx-js|remark-frontmatter|function _createMdxContent/);
  const files = async (dir) =>
    (await readdir(dir, { recursive: true, withFileTypes: true }))
      .filter((entry) => entry.isFile())
      .map((entry) => relative(dir, `${entry.parentPath}/${entry.name}`))
      .sort((a, b) => a.localeCompare(b));
  assert.deepEqual(await files(`${base}/assets`), await files("dist/public"));
  for (const path of ["docs/getting-started.html", "ja/docs/getting-started.html"]) {
    assert.equal(await read(`${base}/assets/${path}`), await read(`dist/public/${path}`));
  }
  await writeFile(
    "dist/evidence/cf-build.json",
    JSON.stringify(
      {
        passed: true,
        staleOutputRemoved: true,
        docsOrCompilerInBundle: false,
        bundleBytes: Buffer.byteLength(code),
        assets: await files(`${base}/assets`),
        assetsConfig: config.assets,
      },
      null,
      2,
    ),
  );
});
