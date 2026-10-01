import assert from "node:assert/strict";
import {
  copyFile,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
  access,
} from "node:fs/promises";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";

const root = process.cwd();
const example = path.join(root, "examples/poc");
const artifacts = path.join(root, "artifacts");
await mkdir(artifacts, { recursive: true });
let step = 0;
const run = async (command, args, cwd = root) => {
  const name = `${++step}-${command}-${args[0]}`.replace(/[^\w-]/g, "_");
  console.log(`Consumer verification: ${command} ${args.join(" ")}`);
  const child = spawn(command, args, { cwd, env: process.env, detached: true });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (data) => {
    stdout += data;
  });
  child.stderr.on("data", (data) => {
    stderr += data;
  });
  let timedOut = false;
  const timer = setTimeout(
    () => {
      timedOut = true;
      if (child.pid !== undefined) process.kill(-child.pid, "SIGTERM");
    },
    10 * 60 * 1000,
  );
  const status = await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  }).finally(() => clearTimeout(timer));
  const log = stdout + stderr;
  await writeFile(path.join(artifacts, `${name}.log`), log);
  assert.equal(timedOut, false, `${command} timed out; see artifacts/${name}.log`);
  assert.equal(status, 0, `${command} failed (log: artifacts/${name}.log):\n${log.slice(-7000)}`);
  return stdout;
};
const json = async (file) => JSON.parse(await readFile(file, "utf8"));
await mkdir(path.join(root, "packages/docs/dist"), { recursive: true });
await writeFile(path.join(root, "packages/docs/dist/obsolete.js"), "stale package output");
await run("pnpm", ["build:package"]);
await assert.rejects(access(path.join(root, "packages/docs/dist/obsolete.js")));
const packageRoot = path.join(root, "packages/docs");
await run("pnpm", ["pack", "--pack-destination", artifacts], packageRoot);
const packed = (await readdir(artifacts)).filter((file) => file.endsWith(".tgz"));
assert.equal(packed.length, 1, "Keep a single evaluation tarball in artifacts");
const tarball = path.join(artifacts, packed[0]);
const files = (await run("tar", ["-tzf", tarball])).trim().split("\n").sort();
for (const file of files)
  assert.match(
    file,
    /^package\/(?:package\.json|README\.md|dist\/[a-z-]+\.(?:js|d\.ts)|templates\/(?:docs-ui\.tsx|copy-code\.tsx|demo-frame\.tsx|docs\.css))$/,
  );
for (const file of [
  "dist/index.js",
  "dist/index.d.ts",
  "dist/build.js",
  "dist/build.d.ts",
  "templates/docs.css",
  "templates/copy-code.tsx",
  "README.md",
])
  assert.ok(files.includes(`package/${file}`), `Missing packed export: ${file}`);
const pkg = await json(path.join(packageRoot, "package.json"));
assert.equal(pkg.private, true, "Publication decisions are pending");
assert.equal(pkg.license, undefined, "Do not choose the user's license");
const consumer = await mkdtemp(path.join(tmpdir(), "honox-docs-consumer-"));
assert.ok(!(await realpath(consumer)).startsWith(await realpath(root)));
console.log(`External consumer: ${consumer}`);
await copyFile(tarball, path.join(consumer, "docs.tgz"));
await copyFile(path.join(root, ".gitignore"), path.join(consumer, ".gitignore"));
for (const file of [
  "app",
  "build",
  "tests",
  "public",
  "vite.config.ts",
  "tsconfig.json",
  "cloudflare.config.ts",
  "wrangler.config.ts",
  "playwright.config.ts",
])
  await cp(path.join(example, file), path.join(consumer, file), { recursive: true });
await cp(path.join(root, "fixtures/consumer/usage.ts"), path.join(consumer, "usage.ts"));
await cp(path.join(root, "fixtures/consumer/smoke.mjs"), path.join(consumer, "smoke.mjs"));
const manifest = await json(path.join(example, "package.json"));
manifest.name = "honox-docs-external-consumer";
manifest.dependencies["@honox-docs-poc/docs"] = "file:./docs.tgz";
manifest.scripts = Object.fromEntries(
  Object.entries(manifest.scripts)
    .filter(([name]) => name !== "build:package" && name !== "evidence")
    .map(([name, value]) => [
      name,
      value.replace("pnpm build:package && ", "").replace("--port 5173", "--port 5177"),
    ]),
);
const versions = await json(path.join(example, "evidence/verification.json"));
for (const section of ["dependencies", "devDependencies"])
  for (const [name, value] of Object.entries(manifest[section]))
    if (name !== "@honox-docs-poc/docs" && value !== "catalog:")
      manifest[section][name] = versions.versions[name] ?? value;
await writeFile(path.join(consumer, "package.json"), JSON.stringify(manifest, null, 2) + "\n");
let workspace = await readFile(path.join(root, "pnpm-workspace.yaml"), "utf8");
workspace = workspace.replace(/^packages:\n(?:  - .*\n)+/, "");
assert.doesNotMatch(workspace, /^packages:/m);
await writeFile(path.join(consumer, "pnpm-workspace.yaml"), workspace);
await writeFile(path.join(consumer, ".npmrc"), "registry=https://registry.npmjs.org/\n");
for (const [file, from, to] of [
  ["playwright.config.ts", "5173", "5177"],
  ["playwright.config.ts", "8787", "8789"],
  ["wrangler.config.ts", "8787", "8789"],
]) {
  const target = path.join(consumer, file);
  await writeFile(target, (await readFile(target, "utf8")).replaceAll(from, to));
}
const tsconfig = await json(path.join(consumer, "tsconfig.json"));
tsconfig.include.push("usage.ts");
await writeFile(path.join(consumer, "tsconfig.json"), JSON.stringify(tsconfig, null, 2) + "\n");
await run("pnpm", ["install"], consumer);
await run("pnpm", ["install", "--frozen-lockfile"], consumer);
await run(process.execPath, ["smoke.mjs"], consumer);
const installedPackage = await realpath(path.join(consumer, "node_modules/@honox-docs-poc/docs"));
assert.ok(!installedPackage.startsWith(await realpath(packageRoot)));
await run("pnpm", ["fmt"], consumer);
await run("pnpm", ["verify"], consumer);
const unit = await json(path.join(consumer, "dist/evidence/unit-tests.json"));
const browser = await json(path.join(consumer, "dist/evidence/browser-tests.json"));
const cf = await json(path.join(consumer, "dist/evidence/cf-build.json"));
assert.equal(unit.numPassedTests, 5);
assert.equal(unit.numFailedTests, 0);
assert.equal(unit.success, true);
assert.equal(browser.stats.expected, 6);
assert.equal(browser.stats.unexpected, 0);
assert.equal(cf.passed, true);
const graphs = {};
for (const target of ["worker", "client"]) {
  const graph = await json(path.join(consumer, `dist/evidence/${target}-modules.json`));
  const leaked = graph.loaded.filter((id) =>
    /\.mdx|@mdx-js|remark-|\/docs\/dist\/build\.js/.test(id),
  );
  assert.deepEqual(leaked, [], `Consumer ${target} leaks docs/compiler/build entry`);
  graphs[target] = { loadedModules: graph.loaded.length, docsCompilerOrBuildModules: leaked };
}
await rm(consumer, { recursive: true, force: true });
await assert.rejects(access(consumer));
const evidence = {
  capturedAt: new Date().toISOString(),
  node: process.version,
  package: {
    name: pkg.name,
    version: pkg.version,
    private: pkg.private,
    license: "undecided",
    exports: pkg.exports,
  },
  tarball: {
    filename: packed[0],
    sha256: createHash("sha256")
      .update(await readFile(tarball))
      .digest("hex"),
    files,
  },
  externalConsumer: {
    outsideRepository: true,
    packageInstalledFromTarball: true,
    packageStaleOutputRemoved: true,
    workspaceOrSourceLinks: false,
    successfulDirectoryRemoved: true,
  },
  validation: {
    runtimeAndPrivateExports: "passed",
    types: "passed (including expected type errors)",
    templatesAndCss: "passed",
    staticChecks: "passed; deny-warnings",
    clientSSGWorker: "passed",
    buildTests: unit.numPassedTests,
    browserTests: browser.stats.expected,
    cfBuild: "passed",
    cfDryRun: "passed; no deployment",
  },
  graphs,
  npmPublish: "not executed",
  cloudflareDeployment: "not executed",
};
await mkdir(path.join(packageRoot, "evidence"), { recursive: true });
await writeFile(
  path.join(packageRoot, "evidence/consumer.json"),
  JSON.stringify(evidence, null, 2) + "\n",
);
console.log("Packed external consumer verification passed; temporary directory removed");
