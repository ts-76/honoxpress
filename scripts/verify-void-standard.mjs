import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile, readdir, lstat, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createServer } from "node:net";
import { createServer as createHttpServer } from "node:http";

const root = resolve(import.meta.dirname, "..");
const stack = process.env.HX_VOID_STACK ?? "vite";
assert.ok(["vite", "vp"].includes(stack), "HX_VOID_STACK must be vite or vp");
const artifacts = join(root, "artifacts/void-standard", stack);
await mkdir(artifacts, { recursive: true });
// The release path always installs the public registry version.
const pluginVersion = "0.3.0";
const directory = await mkdtemp(join(tmpdir(), "honoxpress-void-standard-"));
const project = join(directory, "site");
const bootstrap = join(directory, "bootstrap");
await mkdir(project);
await mkdir(bootstrap);
let step = 0;
function run(command, args, cwd = project) {
  console.log(`Void acceptance: ${command} ${args.join(" ")}`);
  try {
    return execFileSync(command, args, {
      cwd,
      env: process.env,
      encoding: "utf8",
      timeout: 300000,
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch (error) {
    throw new Error(`${command} failed: ${error.stdout ?? ""}\n${error.stderr ?? ""}`);
  }
}
async function command(command, args, cwd = project) {
  const child = spawn(command, args, { cwd, env: process.env, detached: true });
  let output = "";
  child.stdout.on("data", (data) => {
    output += data;
  });
  child.stderr.on("data", (data) => {
    output += data;
  });
  const timeout = setTimeout(() => {
    if (child.pid) process.kill(-child.pid, "SIGTERM");
  }, 300000);
  const code = await new Promise((done, reject) => {
    child.once("error", reject);
    child.once("exit", done);
  }).finally(() => clearTimeout(timeout));
  await writeFile(join(artifacts, `${++step}-${command}.log`), output);
  assert.equal(code, 0, output.slice(-12000));
}
async function port() {
  const server = createServer();
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const value = server.address().port;
  await new Promise((done) => server.close(done));
  return value;
}
async function until(test, fail = () => {}) {
  const end = Date.now() + 60000;
  while (Date.now() < end) {
    fail();
    try {
      if (await test()) return;
    } catch {}
    await new Promise((done) => setTimeout(done, 150));
  }
  throw new Error("Timed out waiting for server update");
}
async function withServer(script, verify) {
  const value = await port();
  const origin = `http://127.0.0.1:${value}`;
  const child = spawn("npm", ["run", script, "--", "--port", String(value), "--strictPort"], {
    cwd: project,
    env: process.env,
    detached: true,
  });
  let log = "";
  child.stdout.on("data", (data) => {
    log += data;
  });
  child.stderr.on("data", (data) => {
    log += data;
  });
  try {
    await until(
      async () => (await fetch(origin + "/docs/en/guide")).status === 200,
      () => {
        if (child.exitCode !== null)
          throw new Error(`${script} exited with ${child.exitCode}: ${log}`);
      },
    );
    await verify(origin);
  } finally {
    if (child.exitCode === null && child.pid !== undefined) {
      const exited = new Promise((done) => child.once("exit", done));
      process.kill(-child.pid, "SIGTERM");
      await exited;
    }
    await writeFile(join(artifacts, `${script}.log`), log);
  }
}
const result = {
  dependency: `void-plugin-hono-jsx@${pluginVersion} (public npm registry)`,
  project,
  stack,
  checks: [],
};
let browser;
try {
  const packed = JSON.parse(
    run(
      "npm",
      [
        "pack",
        join(root, "packages/docs"),
        "--ignore-scripts",
        "--json",
        "--pack-destination",
        artifacts,
      ],
      root,
    ),
  );
  const tarball = join(artifacts, packed[0].filename);
  run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", tarball], bootstrap);
  run(process.execPath, [
    join(bootstrap, "node_modules/honoxpress/bin/honoxpress.mjs"),
    "init",
    "--framework",
    "void",
    "--starter",
    "--cwd",
    project,
  ]);
  const manifestFile = join(project, "package.json");
  const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
  manifest.dependencies.honoxpress = `file:${tarball}`;
  manifest.dependencies["void-plugin-hono-jsx"] = pluginVersion;
  manifest.devDependencies.playwright = "1.64.0";
  if (stack === "vp") {
    manifest.devDependencies["vite-plus"] = "1.3.0";
    manifest.devDependencies.vite = "npm:@voidzero-dev/vite-plus-core@1.3.0";
    manifest.overrides = { vite: "$vite" };
    for (const name of ["dev", "build", "preview"])
      manifest.scripts[name] = manifest.scripts[name].replace(
        /^vite/,
        name === "dev" ? "vp dev" : "vp",
      );
  }

  await writeFile(manifestFile, JSON.stringify(manifest, null, 2) + "\n");
  await command("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"]);
  await command("npm", ["ci", "--ignore-scripts", "--no-audit", "--no-fund"]);
  for (const name of ["honoxpress", "void-plugin-hono-jsx"])
    assert.equal((await lstat(join(project, "node_modules", name))).isSymbolicLink(), false);
  assert.equal(
    await readFile(
      join(project, "node_modules/honoxpress/void/integration/app/void-layout.tsx"),
      "utf8",
    ),
    await readFile(join(root, "packages/docs/void/integration/app/void-layout.tsx"), "utf8"),
  );
  const installedPlugin = JSON.parse(
    await readFile(join(project, "node_modules/void-plugin-hono-jsx/package.json"), "utf8"),
  );
  assert.equal(installedPlugin.version, pluginVersion);
  const lock = JSON.parse(await readFile(join(project, "package-lock.json"), "utf8"));
  const lockedPlugin = lock.packages["node_modules/void-plugin-hono-jsx"];
  assert.equal(lockedPlugin.version, pluginVersion);
  assert.equal(
    lockedPlugin.resolved,
    `https://registry.npmjs.org/void-plugin-hono-jsx/-/void-plugin-hono-jsx-${pluginVersion}.tgz`,
  );
  assert.match(lockedPlugin.integrity, /^sha512-/);
  result.checks.push("packed CLI, public registry adapter, frozen reinstall, no source links");
  const vitePath = join(project, "vite.config.ts");
  const viteSource = (await readFile(vitePath, "utf8")).replace(
    'from "vite"',
    stack === "vp" ? 'from "vite-plus"' : 'from "vite"',
  );
  await writeFile(
    vitePath,
    'import { writeFileSync } from "node:fs";\n' +
      viteSource.replace(
        "plugins: [",
        `plugins: [{ name: "honoxpress-graph-check", generateBundle() { writeFileSync(${JSON.stringify(directory)} + "/graph-" + this.environment.name + ".json", JSON.stringify([...this.getModuleIds()])); } },`,
      ),
  );
  await writeFile(
    join(project, "public/style.css"),
    (await readFile(join(project, "public/style.css"), "utf8")) +
      "\n.hx-callout { border-radius: 19px; }\n",
  );
  const { chromium } = await import(join(project, "node_modules/playwright/index.mjs"));
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {}),
  });
  async function check(origin, mode) {
    const context = await browser.newContext({
      permissions: ["clipboard-read", "clipboard-write"],
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const noJsContext = await browser.newContext({ javaScriptEnabled: false });
    const noJs = await noJsContext.newPage();
    try {
      for (const locale of ["en", "ja"])
        for (const width of [1280, 390, 320])
          for (const theme of ["light", "dark"]) {
            await noJs.setViewportSize({ width, height: 900 });
            await noJs.emulateMedia({ colorScheme: theme });
            assert.equal((await noJs.goto(`${origin}/docs/${locale}/guide`)).status(), 200);
            assert.equal(await noJs.locator(".hx-callout").count(), 1);
            assert.equal(
              await noJs
                .locator(".hx-callout")
                .evaluate((node) => getComputedStyle(node).borderRadius),
              "19px",
            );
            assert.equal(
              await noJs.locator(".hx-cards").evaluate((node) => getComputedStyle(node).display),
              "grid",
            );
            assert.equal(await noJs.locator(".hx-type-table tbody tr").count(), 1);
            assert.equal(await noJs.locator("html").getAttribute("lang"), locale);
            assert.equal(await noJs.locator("head > style#hono-css").count(), 1);
            assert.equal(
              await noJs
                .locator(
                  'script[src],script:not([type="application/json"]),link[rel="modulepreload"]',
                )
                .count(),
              0,
            );
            assert.equal(
              await noJs.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
              true,
            );
            for (const id of await noJs
              .locator(".toc-rail nav a")
              .evaluateAll((links) => links.map((link) => decodeURIComponent(link.hash.slice(1)))))
              assert.equal(await noJs.locator(`[id="${id}"]`).count(), 1);
            await page.setViewportSize({ width, height: 900 });
            await page.emulateMedia({ colorScheme: theme });
            const scripts = [];
            const listener = (request) => {
              if (request.resourceType() === "script") scripts.push(request.url());
            };
            page.on("request", listener);
            await page.goto(`${origin}/docs/${locale}/guide`);
            page.off("request", listener);
            assert.deepEqual(scripts, []);
            await page.goto(`${origin}/docs/${locale}/examples`);
            await page.locator('[data-hono-island="mounted"]').waitFor();
            await page.locator('[data-hx-tabs-ready="true"]').waitFor();
            assert.equal(await page.locator("[data-hono-island]").count(), 1);
            const tabs = page.getByRole("tab");
            await tabs.first().focus();
            await page.keyboard.press("ArrowRight");
            await page.waitForFunction(
              () =>
                document.querySelectorAll('[role="tab"]')[1]?.getAttribute("aria-selected") ===
                "true",
            );
            const panel = page.locator('[role="tabpanel"]:visible');
            assert.match(await panel.textContent(), /const message =/);
            await panel.getByRole("button").click();
            assert.equal(
              await page.evaluate(() => navigator.clipboard.readText()),
              'const message = "Hello";',
            );
            if (!(await page.locator(".theme-desktop [data-hx-theme-switch]").isVisible()))
              await page.locator(".mobile-nav > summary").click();
            const select = page.locator("[data-hx-theme-switch]:visible").first();
            for (const choice of ["light", "dark", "system"]) {
              await select.selectOption(choice);
              assert.equal(
                await page.locator("html").getAttribute("data-theme"),
                choice === "system" ? theme : choice,
              );
            }
            await page.emulateMedia({ colorScheme: theme === "dark" ? "light" : "dark" });
            await page.waitForFunction(
              (expected) => document.documentElement.dataset.theme === expected,
              theme === "dark" ? "light" : "dark",
            );
            await page.locator(".mobile-nav").evaluate((node) => {
              node.open = false;
            });
            const other = locale === "en" ? "ja" : "en";
            await page.evaluate(() => {
              window.hxDocument = true;
            });
            await page.locator(`.language-links a[lang="${other}"]`).click();
            await page.waitForURL(`**/docs/${other}/examples`);
            assert.equal(await page.evaluate(() => window.hxDocument), undefined);
            await page.goBack();
            await page.waitForURL(`**/docs/${locale}/examples`);
            await page.goForward();
            await page.waitForURL(`**/docs/${other}/examples`);
          }
      if (mode === "dev") {
        await page.goto(origin + "/docs/en/guide");
        const file = join(project, "pages/docs/en/guide.md");
        const original = await readFile(file, "utf8");
        try {
          await writeFile(
            file,
            original
              .replace("title: Guide", "title: Updated guide")
              .replace("## Preparation", "## Updated heading"),
          );
          await until(async () => {
            const html = await (await fetch(origin + "/docs/en/guide")).text();
            return html.includes("Updated guide") && html.includes('href="#updated-heading"');
          });
          const added = join(project, "pages/docs/en/added.md");
          await writeFile(
            added,
            original
              .replace("title: Guide", "title: Added page")
              .replace("slug: guide", "slug: added")
              .replace("href: /docs/en/guide", "href: /docs/en/added"),
          );
          try {
            await until(async () =>
              (await (await fetch(origin + "/docs/en/guide")).text()).includes(
                'href="/docs/en/added"',
              ),
            );
          } finally {
            await rm(added);
          }
          await until(
            async () =>
              !(await (await fetch(origin + "/docs/en/guide")).text()).includes(
                'href="/docs/en/added"',
              ),
          );
          const wrapper = join(project, "app/markdown/Properties.tsx");
          const before = await readFile(wrapper, "utf8");
          try {
            await writeFile(wrapper, before.replace("Page title", "Edited property"));
            await until(async () =>
              (await (await fetch(origin + "/docs/en/guide")).text()).includes("Edited property"),
            );
          } finally {
            await writeFile(wrapper, before);
          }
        } finally {
          await writeFile(file, original);
        }
        result.checks.push("dev metadata/heading update, route add/delete, component edit");
      }
      assert.deepEqual(errors, []);
      result.checks.push(
        `${mode}: EN/JA × 1280/390/320 × light/dark, no-JS static, one island, keyboard/copy, theme, translations/history`,
      );
      await page.screenshot({ path: join(artifacts, `${mode}-mobile.png`), fullPage: true });
    } finally {
      await context.close();
      await noJsContext.close();
    }
  }
  await withServer("dev", (origin) => check(origin, "dev"));
  await command("npm", ["run", "typecheck"]);
  await command("npm", ["run", "build"]);
  await withServer("preview", (origin) => check(origin, "preview"));
  for (const graph of (await readdir(directory)).filter((file) => /^graph-.*\.json$/.test(file))) {
    const ids = JSON.parse(await readFile(join(directory, graph), "utf8"));
    assert.ok(ids.length > 0);
    assert.deepEqual(
      ids.filter((id) =>
        /(?:markdown-exit|markdown-it-container|honoxpress\/dist\/build\.js|hono-markdown\.js|\/shiki\/)/.test(
          id,
        ),
      ),
      [],
      graph,
    );
  }
  assert.ok((await readdir(directory)).some((file) => file === "graph-client.json"));
  assert.ok((await readdir(directory)).some((file) => file === "graph-void_worker.json"));
  for (const file of await readdir(join(project, "dist/client/assets"))) {
    if (file.endsWith(".js"))
      assert.doesNotMatch(
        await readFile(join(project, "dist/client/assets", file), "utf8"),
        /Static content works with HTML and CSS|Page title/,
        `Static-only page content retained in ${file}`,
      );
  }
  result.checks.push(
    "application CSS overrides; client/server module graphs exclude Markdown and HonoX compilers",
  );
  const docsSettings = join(project, "app/docs.config.ts");
  const originalSettings = await readFile(docsSettings, "utf8");
  await writeFile(
    docsSettings,
    originalSettings
      .replace('name: "Your project"', 'name: "Custom docs"')
      .replace('defaultLocale: "en"', 'defaultLocale: "ja"')
      .replace("themeSwitch: true", "themeSwitch: false")
      .replace('"/style.css"', '"/custom.css"'),
  );
  await writeFile(join(project, "public/custom.css"), '@import "./style.css";\n');
  await withServer("dev", async (origin) => {
    const html = await (await fetch(origin + "/docs/ja/examples")).text();
    assert.match(html, /Custom docs/);
    assert.match(html, /href="\/custom.css"/);
    assert.doesNotMatch(html, /data-hx-theme-switch/);
    const home = await (await fetch(origin)).text();
    assert.match(home, /href="\/docs\/ja\/guide"/);
    assert.doesNotMatch(home, /href="\/docs\/en\/guide"/);
    assert.equal((await fetch(origin + "/missing-page")).status, 404);
  });
  await writeFile(docsSettings, originalSettings);
  result.checks.push(
    "shared site name/default locale/stylesheet/theme controls and missing-route 404",
  );

  const configPath = join(project, "void.config.ts");
  const config = await readFile(configPath, "utf8");
  await writeFile(configPath, config.replace("defineConfig({", 'defineConfig({ output: "static",'));
  await command("npm", ["run", "build"]);
  const files = await readdir(join(project, "dist/client"), { recursive: true });
  assert.ok(
    files.some((file) => /docs\/en\/guide(?:\/index)?\.html$/.test(file)),
    files.join("\n"),
  );
  const output = join(project, "dist/client");
  const server = createHttpServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    if (pathname.includes("..")) {
      response.writeHead(404).end();
      return;
    }
    const file = join(output, pathname + (pathname.split("/").at(-1).includes(".") ? "" : ".html"));
    try {
      const bytes = await readFile(file);
      response
        .writeHead(200, {
          "Content-Type":
            (file.endsWith(".html")
              ? "text/html"
              : file.endsWith(".css")
                ? "text/css"
                : file.endsWith(".js")
                  ? "text/javascript"
                  : "application/json") + "; charset=utf-8",
        })
        .end(bytes);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  try {
    await check(`http://127.0.0.1:${server.address().port}`, "static");
  } finally {
    await new Promise((done) => server.close(done));
  }
  result.checks.push("production server build, typecheck, static HTML served without a Worker");
  await browser.close();
  browser = undefined;
  await rm(directory, { recursive: true, force: true });
  result.temporaryFixtureRemoved = true;
} catch (error) {
  result.error = error.stack;
  throw error;
} finally {
  if (browser) await browser.close();
  await writeFile(join(artifacts, "result.json"), JSON.stringify(result, null, 2) + "\n");
}
console.log(JSON.stringify(result, null, 2));
