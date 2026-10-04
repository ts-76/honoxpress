import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const json = async (file) => JSON.parse(await readFile(file, "utf8"));
const build = await json("dist/evidence/unit-tests.json");
const browser = await json("dist/evidence/browser-tests.json");
const hmr = await json("dist/evidence/hmr-tests.json");
assert.equal(build.numPassedTests, 5);
assert.equal(build.numFailedTests, 0);
assert.equal(browser.stats.expected, 6);
assert.equal(browser.stats.unexpected, 0);
assert.equal(hmr.stats.expected, 3);
assert.equal(hmr.stats.unexpected, 0);
const specs = (suites) =>
  suites.flatMap((suite) => [...(suite.specs ?? []), ...specs(suite.suites ?? [])]);
const hmrTests = specs(hmr.suites).flatMap((spec) =>
  spec.tests.map((test) => ({ ...test, title: spec.title })),
);
assert.equal(hmr.stats.skipped, 0);
assert.equal(hmr.stats.flaky, 0);
assert.ok(hmrTests.every((test) => test.expectedStatus === "passed"));
assert.equal(hmrTests.filter((test) => test.results.at(-1).status === "passed").length, 3);
const graphs = {};
for (const target of ["worker", "client"]) {
  const graph = await json(`dist/evidence/${target}-modules.json`);
  const leaks = graph.loaded.filter((id) =>
    /\.mdx|@mdx-js|remark-|honoxpress\/dist\/build\.js|hono-decks\/dist\/(?:node|cli|bin|vite)\.js/.test(
      id,
    ),
  );
  assert.deepEqual(leaks, []);
  graphs[target] = { loadedModules: graph.loaded.length, docsOrCompilerModules: leaks };
}
const receipt = {
  capturedAt: new Date().toISOString(),
  commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  dirty: Boolean(execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim()),
  node: process.version,
  platform: process.platform,
  packages: {
    honoxpress: (await json("node_modules/honoxpress/package.json")).version,
    honoDecks: (await json("node_modules/hono-decks/package.json")).version,
  },
  lockSha256: createHash("sha256")
    .update(await readFile("pnpm-lock.yaml"))
    .digest("hex"),
  validation: { buildTests: 5, browserTests: 6, hmrPassed: 3, hmrExpectedFailures: 0 },
  graphs,
  ssg: await json("dist/evidence/ssg.json"),
  cfBuild: await json("dist/evidence/cf-build.json"),
  npmApprovalStageOrPublish: "not executed",
  deployment: "not executed; cf dry-run only",
};
await writeFile("dist/evidence/pilot-receipt.json", JSON.stringify(receipt, null, 2) + "\n");
console.log(
  "Pilot evidence: build 5, browser 6, HMR 3 passed; zero expected failures; no module leaks",
);
