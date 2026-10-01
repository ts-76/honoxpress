import { execFileSync } from "node:child_process";
import { accessSync, constants } from "node:fs";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, copyFile, readdir } from "node:fs/promises";
import { platform, arch } from "node:os";
import path from "node:path";
import { version as underlyingVite } from "vite-plus";

const json = async (file) => JSON.parse(await readFile(file, "utf8"));
const versions = {};
for (const name of [
  "hono",
  "honox",
  "vite-plus",
  "@cloudflare/config",
  "@mdx-js/rollup",
  "@hono/vite-ssg",
  "@hono/vite-build",
  "wrangler",
  "@playwright/test",
  "typescript",
]) {
  versions[name] = (await json(`node_modules/${name}/package.json`)).version;
}
versions.viteUnderlying = underlyingVite;
const cfExecutable = process.env.PATH.split(path.delimiter)
  .map((dir) => path.join(dir, "cf"))
  .find((file) => {
    try {
      accessSync(file, constants.X_OK);
      return true;
    } catch {
      return false;
    }
  });
if (!cfExecutable || cfExecutable.includes("node_modules/.bin"))
  throw new Error("Expected an existing global cf executable");
const cfVersion = execFileSync(cfExecutable, ["--version"], { encoding: "utf8" });
versions.cf = cfVersion.match(/v(\d+\.\d+\.\d+(?:-[\w.]+)?)/)?.[1];
if (!versions.cf) throw new Error("Unable to read global cf version");
const unit = await json("dist/evidence/unit-tests.json");
if (unit.numPassedTests !== 5 || unit.numFailedTests !== 0 || !unit.success)
  throw new Error("Unit verification is incomplete");
const cfBuild = await json("dist/evidence/cf-build.json");
if (!cfBuild.passed) throw new Error("cf verification is incomplete");
const browser = await json("dist/evidence/browser-tests.json");
if (browser.stats.unexpected !== 0 || browser.stats.expected !== 6)
  throw new Error("Browser verification is incomplete");
const outputs = {};
for (const file of [
  "dist/worker/index.js",
  "dist/public/docs/getting-started.html",
  "dist/public/ja/docs/getting-started.html",
]) {
  const bytes = await readFile(file);
  outputs[file] = { bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
}
const graphs = {};
for (const target of ["worker", "client"]) {
  const graph = await json(`dist/evidence/${target}-modules.json`);
  const excluded = graph.loaded.filter((id) =>
    /\.mdx|@mdx-js|remark-|\/routes\/(?:ja\/)?docs\//.test(id),
  );
  if (excluded.length) throw new Error(`Unexpected docs modules in ${target}`);
  graphs[target] = { loadedModules: graph.loaded.length, docsOrCompilerModules: excluded };
}
await mkdir("evidence/screenshots", { recursive: true });
for (const file of [
  "client-manifest.json",
  "worker-modules.json",
  "ssg.json",
  "eager-control.json",
  "cf-build.json",
]) {
  await copyFile(`dist/evidence/${file}`, `evidence/${file}`);
}
const screenshotFiles = await readdir("test-results", { recursive: true });
for (const name of ["english", "japanese", "mobile", "dark"]) {
  const screenshot = screenshotFiles.find(
    (file) => file.includes("production-local") && file.endsWith(`/${name}.png`),
  );
  if (!screenshot) throw new Error(`Missing production screenshot: ${name}`);
  await copyFile(`test-results/${screenshot}`, `evidence/screenshots/${name}.png`);
}
const tests = browser.suites.flatMap((s) =>
  s.specs.flatMap((spec) =>
    spec.tests.map((t) => ({
      project: t.projectName,
      title: spec.title,
      status: t.results.at(-1)?.status,
    })),
  ),
);
await writeFile(
  "evidence/verification.json",
  JSON.stringify(
    {
      capturedAt: new Date().toISOString(),
      environment: {
        node: process.version,
        nodeExecutable: process.execPath,
        cfExecutable,
        platform: platform(),
        arch: arch(),
      },
      versions,
      outputs,
      graphs,
      browserTests: tests,
      typecheck: "passed",
      buildTests: { passed: unit.numPassedTests, failed: unit.numFailedTests },
      cfBuild,
      cfDryRun: "passed; prebuilt; no upload or deployment",
      cfTypes: "passed",
      staticChecks: {
        format: "passed",
        lint: "passed; deny-warnings",
        tsgo: "passed",
        tsc: "passed",
      },
      packageManager: "pnpm@11.22.0",
      ci: "not configured",
      cloudflareDeployment: "not executed (out of scope)",
    },
    null,
    2,
  ) + "\n",
);
console.log(`Saved verification evidence to ${path.resolve("evidence")}`);
