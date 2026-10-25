import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";

// Local candidate check: never reports these tarballs as published registry releases.
for (const key of ["HONO_MARKDOWN_PACKAGE", "VOID_HONO_PACKAGE", "HONO_DECKS_PACKAGE"])
  assert.ok(process.env[key], `Set ${key} to a built tarball`);
const root = await mkdtemp(join(tmpdir(), "hono-markdown-coexist-"));
const app = join(root, "app");
await mkdir(app);
const repo = resolve(import.meta.dirname, "..");
const run = (command, args, cwd = app) => {
  try {
    return execFileSync(command, args, {
      cwd,
      encoding: "utf8",
      timeout: 300000,
      maxBuffer: 32 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    console.error(error.stdout, error.stderr);
    throw error;
  }
};
const packed = JSON.parse(
  run(
    "npm",
    ["pack", "--ignore-scripts", "--json", "--pack-destination", root],
    join(repo, "packages/docs"),
  ),
);
const hx = join(root, packed[0].filename);
run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", hx], root);
run(process.execPath, [
  join(root, "node_modules/honoxpress/bin/honoxpress.mjs"),
  "init",
  "--framework",
  "void",
  "--starter",
]);
const pkgPath = join(app, "package.json");
const pkg = JSON.parse(await readFile(pkgPath, "utf8"));
pkg.dependencies.honoxpress = `file:${hx}`;
pkg.dependencies["void-plugin-hono-jsx"] = `file:${resolve(process.env.VOID_HONO_PACKAGE)}`;
pkg.dependencies["@ts-76/hono-markdown"] = `file:${resolve(process.env.HONO_MARKDOWN_PACKAGE)}`;
pkg.dependencies["hono-decks"] = `file:${resolve(process.env.HONO_DECKS_PACKAGE)}`;
pkg.devDependencies.playwright = "1.64.0";
await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
console.log(`Coexist app: ${app}`);
run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"]);
const before = await readFile(pkgPath, "utf8");
for (const name of ["markdown-exit", "markdown-it-container"]) {
  const manifest = JSON.parse(before);
  assert.equal(
    manifest.dependencies?.[name] ?? manifest.devDependencies?.[name],
    undefined,
    "init must not add parser dependencies",
  );
}
const originalVite = await readFile(join(app, "vite.config.ts"), "utf8");
run(process.execPath, [
  join(app, "node_modules/hono-decks/dist/bin.js"),
  "init",
  "--framework",
  "void",
  "--install",
]);
assert.equal(await readFile(pkgPath, "utf8"), before);
assert.ok(
  (await readFile(join(app, "vite.config.ts"), "utf8")).includes(
    originalVite.slice(0, originalVite.indexOf("export default")),
  ),
);
await mkdir(join(app, "decks/legacy"), { recursive: true });
await writeFile(
  join(app, "decks/legacy/deck.mdx"),
  "# Legacy MDX coexistence\n\nMDX still renders beside docs.\n",
);
const configPath = join(app, "hono-decks.config.ts");
const legacyConfig = await readFile(configPath, "utf8");
// Exercise the new serializable bridge; other acceptance checks cover markdown: "void".
await writeFile(
  configPath,
  legacyConfig.replace(
    'markdown: "void"',
    'markdown: { adapter: "hono-decks/adapters/hono-markdown" }',
  ),
);
const req = createRequire(pkgPath);
const { chromium } = req("playwright");
const browser = await chromium.launch({ headless: true });
const evidence = {
  root,
  localCandidates: true,
  scriptsPreserved: true,
  legacyConfig: true,
  adapterConfig: true,
  modes: [],
};
async function verify(mode, port) {
  const server = spawn("npm", ["run", mode, "--", "--port", String(port), "--strictPort"], {
    cwd: app,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  server.stdout.on("data", (data) => {
    log += data;
  });
  server.stderr.on("data", (data) => {
    log += data;
  });
  const origin = `http://127.0.0.1:${port}`;
  const page = await browser.newPage({ permissions: ["clipboard-read", "clipboard-write"] });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    let ready = false;
    for (let i = 0; i < 240; i++) {
      if (server.exitCode !== null) throw new Error(log);
      try {
        if ((await fetch(origin + "/docs/en/guide")).ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((done) => setTimeout(done, 250));
    }
    assert.ok(ready, log);
    for (const path of [
      "/docs/en/guide",
      "/docs/ja/guide",
      "/docs/en/examples",
      "/slides",
      "/slides/welcome/render",
      "/slides/legacy/render",
    ])
      assert.equal((await fetch(origin + path)).status, 200, path);
    await page.goto(origin + "/docs/en/guide");
    assert.equal(await page.locator(".hx-callout").count(), 1);
    const frontmatterTitle = await page.locator(".hx-type-table").textContent();
    assert.match(frontmatterTitle, /Page title/);
    assert.match(await page.locator("h1").textContent(), /Guide/);
    await page.goto(origin + "/docs/en/examples");
    await page.locator('[data-hono-island="mounted"]').waitFor();
    await page.locator('[data-hx-tabs-ready="true"]').waitFor();
    await page.getByRole("tab").first().focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForFunction(
      () => document.querySelectorAll('[role="tab"]')[1]?.getAttribute("aria-selected") === "true",
    );
    await page.locator('[role="tabpanel"]:visible').getByRole("button").click();
    assert.equal(
      await page.evaluate(() => navigator.clipboard.readText()),
      'const message = "Hello";',
    );
    await page.locator("[data-hx-theme-switch]:visible").first().selectOption("dark");
    assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
    await page.goto(origin + "/slides/welcome/render");
    await page.keyboard.press("ArrowRight");
    const counter = page.getByRole("button", { name: "Count: 0", exact: true });
    await counter.waitFor();
    await counter.click();
    await page.getByRole("button", { name: "Count: 1", exact: true }).waitFor();
    await page.goto(origin + "/slides/legacy/render");
    assert.match(await page.textContent("body"), /Legacy MDX coexistence/);
    await page.goto(origin + "/docs/ja/examples");
    await page.locator('[data-hx-tabs-ready="true"]').waitFor();
    assert.equal(await page.locator("html").getAttribute("lang"), "ja");
    assert.deepEqual(errors, []);
    assert.equal(await readdir(join(app, "src/generated")).catch(() => null), null);
    await page.screenshot({ path: join(root, mode + "-coexist.png"), fullPage: true });
    evidence.modes.push({
      mode,
      docsMetadata: true,
      docsIsland: true,
      keyboardAndCopy: true,
      theme: true,
      markdownDeckIsland: true,
      legacyMdx: true,
      noBrowserErrors: true,
      noGeneratedFiles: true,
    });
  } finally {
    await writeFile(join(root, mode + ".log"), log);
    await page.close();
    if (server.pid) process.kill(-server.pid, "SIGTERM");
  }
}
try {
  // Cold build precedes dev: the user never runs compile.
  console.log(run("npm", ["run", "typecheck"]));
  console.log(run("npm", ["run", "build"]));
  await verify("dev", 5491);
  await verify("preview", 5492);
} finally {
  await browser.close();
}
await writeFile(join(root, "evidence.json"), JSON.stringify(evidence, null, 2) + "\n");
console.log(JSON.stringify(evidence, null, 2));
