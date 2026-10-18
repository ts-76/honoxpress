import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const out = new URL("../evidence/", import.meta.url);
await mkdir(out, { recursive: true });
const env = {
  ...process.env,
  HX_BASELINE: "0",
  PATH: `${process.execPath.slice(0, process.execPath.lastIndexOf("/"))}:${process.env.PATH}`,
  WRANGLER_SEND_METRICS: "false",
  CLOUDFLARE_CF_FETCH_ENABLED: "false",
  VOID_INSPECTOR_PORT: "false",
  WRANGLER_LOG_PATH: new URL("logs/", out).pathname,
};
const report = {
  node: process.version,
  platform: process.platform,
  time: new Date().toISOString(),
  baseline: {},
  ssr: [],
  matrix: [],
  errors: [],
};
let server;
let browser;
function launch(args, extra = {}) {
  const child = spawn(process.execPath, args, {
    env: { ...env, ...extra },
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  child.stdout.on("data", (b) => {
    log += b;
  });
  child.stderr.on("data", (b) => {
    log += b;
  });
  return { child, log: () => log };
}
async function stop() {
  if (!server) return;
  const { child } = server;
  if (child.exitCode === null) {
    if (process.platform === "win32") child.kill();
    else process.kill(-child.pid, "SIGTERM");
    await Promise.race([new Promise((resolve) => child.once("exit", resolve)), delay(3000)]);
  }
  await writeFile(new URL(`${server.name}.log`, out), server.log());
  server = undefined;
}
async function start(name, mode, port, extra = {}) {
  assert.equal(server, undefined, "Run one worker at a time (local SQLite state is shared).");
  server = {
    ...launch(
      [
        "node_modules/vite/bin/vite.js",
        ...(mode === "preview" ? ["preview"] : []),
        "--host",
        "127.0.0.1",
        "--port",
        String(port),
        "--strictPort",
      ],
      extra,
    ),
    name,
  };
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 120; i++) {
    if (server.child.exitCode !== null) throw new Error(server.log());
    try {
      if ((await fetch(`${base}/en`)).ok) return base;
    } catch {
      /* booting */
    }
    await delay(250);
  }
  throw new Error(`Server did not start: ${server.log()}`);
}
async function run(args) {
  const task = launch(args);
  const code = await new Promise((resolve) => task.child.once("exit", resolve));
  console.log(task.log().slice(-4000));
  assert.equal(code, 0, `Command failed: ${args.join(" ")}\n${task.log()}`);
}
async function mounted(page) {
  await page.locator('#app[data-hono-pages="mounted"]').waitFor();
}
async function theme(page, value) {
  const desktop = page.locator(".theme-desktop select");
  const mobile = !(await desktop.isVisible());
  if (mobile) await page.locator(".mobile-nav > summary").click();
  const select = mobile ? page.locator(".mobile-theme select") : desktop;
  await select.selectOption(value);
  if (mobile) await page.locator(".mobile-nav > summary").click();
  await page.waitForFunction(
    (value) =>
      [...document.querySelectorAll("[data-hx-theme-switch]")].every(
        (s) => !s.disabled && s.value === value,
      ),
    value,
  );
}
async function visit(page, id, href) {
  const desktop = page.locator(`.docs-sidebar [data-testid="${id}"]`);
  if (await desktop.isVisible()) await desktop.click();
  else {
    await page.locator(".mobile-nav > summary").click();
    await page.locator(`.mobile-nav [data-testid="${id}"]`).click();
  }
  await page.waitForURL((url) => url.pathname === href);
  await page.waitForFunction(() => document.querySelector("#app")?.dataset.navigation === "idle");
}
async function cssSnapshot(page) {
  return page.evaluate(() => {
    const callout = document.querySelector(".hx-callout");
    const tree = document.querySelector(".hx-file-tree");
    const table = document.querySelector(".hx-type-table");
    return {
      lang: document.documentElement.lang,
      title: document.title,
      theme: document.documentElement.dataset.theme,
      canvas: getComputedStyle(document.body).backgroundColor,
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      promiseClasses: document.querySelectorAll('[class*="[object Promise]"]').length,
      styleHosts: document.querySelectorAll("style#hono-css").length,
      styleParent: document.querySelector("style#hono-css")?.parentElement.tagName,
      cssRules: document.querySelector("style#hono-css")?.sheet.cssRules.length,
      callout: callout && {
        border: getComputedStyle(callout).borderWidth,
        radius: getComputedStyle(callout).borderRadius,
        color: getComputedStyle(callout).borderColor,
      },
      tree: tree && {
        border: getComputedStyle(tree).borderWidth,
        listStyle: getComputedStyle(tree.querySelector("ul")).listStyleType,
      },
      table: table && {
        border: getComputedStyle(table).borderWidth,
        codePadding: getComputedStyle(table.querySelector("code")).padding,
      },
      cards:
        document.querySelector(".hx-cards") &&
        getComputedStyle(document.querySelector(".hx-cards")).gridTemplateColumns,
      selects: [...document.querySelectorAll("[data-hx-theme-switch]")].map((s) => ({
        value: s.value,
        disabled: s.disabled,
      })),
    };
  });
}
async function capture(page, filename) {
  await page.evaluate(() => {
    document.activeElement?.blur();
    window.scrollTo(0, 0);
  });
  await page.waitForFunction(() => scrollY === 0);
  await page.screenshot({ path: new URL(filename, out).pathname, fullPage: true });
}
function good(snapshot, locale, color) {
  assert.equal(snapshot.lang, locale);
  assert.equal(snapshot.theme, color);
  assert.equal(snapshot.promiseClasses, 0);
  assert.equal(snapshot.styleHosts, 1);
  assert.equal(snapshot.styleParent, "HEAD");
  assert.ok(snapshot.cssRules > 0);
  assert.ok(snapshot.scrollWidth <= snapshot.width + 1, JSON.stringify(snapshot));
  assert.ok(snapshot.selects.every((s) => !s.disabled));
  if (snapshot.callout) {
    assert.equal(snapshot.callout.border, "1px");
    assert.equal(snapshot.callout.radius, "6px");
  }
  if (snapshot.tree) {
    assert.equal(snapshot.tree.border, "1px");
    assert.equal(snapshot.tree.listStyle, "none");
  }
  if (snapshot.table) {
    assert.equal(snapshot.table.border, "1px");
    assert.equal(snapshot.table.codePadding, "2px 5px");
  }
}
async function noJs(base, phase) {
  for (const locale of ["en", "ja"])
    for (const width of [1280, 390, 320])
      for (const section of ["", "/reference"]) {
        const context = await browser.newContext({
          javaScriptEnabled: false,
          viewport: { width, height: 900 },
        });
        const page = await context.newPage();
        const response = await page.goto(`${base}/${locale}${section}`);
        assert.equal(response.status(), 200);
        const html = await response.text();
        assert.equal((html.match(/<html(?:\s|>)/g) ?? []).length, 1);
        const state = await page.evaluate(() => {
          const selector =
            document.querySelector(".hx-callout") ?? document.querySelector(".hx-file-tree");
          return {
            heading: document.querySelector("h1")?.textContent,
            css: document.querySelector("style#hono-css")?.textContent.length,
            border: getComputedStyle(selector).borderWidth,
            radius: getComputedStyle(selector).borderRadius,
            styleParent: document.querySelector("style#hono-css")?.parentElement.tagName,
            lang: document.documentElement.lang,
            width: innerWidth,
            scrollWidth: document.documentElement.scrollWidth,
          };
        });
        assert.ok(state.css > 0, `Missing SSR CSS: ${base}/${locale}${section}`);
        assert.equal(state.border, "1px");
        assert.equal(state.styleParent, "HEAD");
        if (!section)
          assert.equal(
            state.radius,
            "6px",
            "Equal-specificity consumer override must work in SSR too.",
          );
        assert.equal(state.lang, locale);
        assert.ok(state.scrollWidth <= width + 1);
        if (!section) {
          const disclosure = page.locator(".hx-accordion-item");
          await disclosure.locator("summary").click();
          assert.equal(await disclosure.getAttribute("open"), "");
          // Accessible fallback: all samples remain visible without the tab script.
          assert.equal(await page.locator(".hx-tab-panel:visible").count(), 2);
        } else {
          const folder = page.locator(".hx-folder").first();
          await folder.locator(":scope > summary").click();
          assert.equal(await folder.getAttribute("open"), null);
        }
        report.ssr.push({ phase, locale, width, section: section || "/", ...state });
        await context.close();
      }
}
async function matrix(base, phase, widths) {
  for (const locale of ["en", "ja"])
    for (const width of widths)
      for (const color of ["light", "dark"]) {
        const context = await browser.newContext({
          viewport: { width, height: 900 },
          colorScheme: color,
          isMobile: width < 500,
          hasTouch: width < 500,
          permissions: ["clipboard-read", "clipboard-write"],
        });
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        page.on("console", (message) => {
          if (message.type() === "error") errors.push(message.text());
        });
        const documents = [];
        page.on("request", (request) => {
          if (request.isNavigationRequest() && request.frame() === page.mainFrame())
            documents.push(request.url());
        });
        await page.goto(`${base}/${locale}`);
        await mounted(page);
        await page.waitForFunction(() =>
          [...document.querySelectorAll("select")].every((s) => !s.disabled),
        );
        await theme(page, color);
        const overview = await cssSnapshot(page);
        good(overview, locale, color);
        assert.equal(overview.cards.split(" ").length, width <= 760 ? 1 : 2);
        await page.evaluate(() => {
          window.__pilotDocument = "preserved";
          document.querySelector("header").dataset.pilotMarker = "layout-preserved";
        });
        const tabs = page.locator('[role="tab"]');
        await tabs.first().focus();
        await page.keyboard.press("ArrowRight");
        assert.equal(await tabs.nth(1).getAttribute("aria-selected"), "true");
        await page.locator(".hx-tab-panel:visible .code-toolbar button").click();
        await page.waitForFunction(() =>
          /Copied|コピーしました/.test(
            document.querySelector('.hx-tab-panel:not([hidden]) [role="status"]')?.textContent ??
              "",
          ),
        );
        assert.match(
          await page.locator('.hx-tab-panel:visible [role="status"]').textContent(),
          /Copied|コピーしました/,
        );
        assert.equal(
          await page.evaluate(() => navigator.clipboard.readText()),
          "export default function Page() {\n  return <p>Hello from Void</p>;\n}",
        );
        await tabs.first().click();
        if (phase === "preview") await capture(page, `${locale}-${width}-${color}-components.png`);
        await visit(page, "reference-link", `/${locale}/reference`);
        await page.locator(".hx-type-table").waitFor();
        const reference = await cssSnapshot(page);
        good(reference, locale, color);
        assert.match(reference.title, locale === "ja" ? /API リファレンス/ : /API reference/);
        const rules = reference.cssRules;
        assert.equal(await page.evaluate(() => window.__pilotDocument), "preserved");
        assert.equal(
          await page.locator("header").getAttribute("data-pilot-marker"),
          "layout-preserved",
        );
        assert.equal(
          documents.length,
          1,
          "Component navigation must use Void Pages, not a new document.",
        );
        if (phase === "preview") await capture(page, `${locale}-${width}-${color}-reference.png`);
        const other = locale === "en" ? "ja" : "en";
        await page.locator(`[data-testid="lang-${other}"]`).click();
        await page.waitForURL((url) => url.pathname === `/${other}/reference`);
        await page.waitForFunction((locale) => document.documentElement.lang === locale, other);
        good(await cssSnapshot(page), other, color);
        await page.goBack();
        await page.waitForURL((url) => url.pathname === `/${locale}/reference`);
        await page.waitForFunction((locale) => document.documentElement.lang === locale, locale);
        await page.goForward();
        await page.waitForURL((url) => url.pathname === `/${other}/reference`);
        await page.waitForFunction((locale) => document.documentElement.lang === locale, other);
        await visit(page, "overview-link", `/${other}`);
        await page.locator('[data-hx-tabs-ready="true"]').waitFor();
        await visit(page, "reference-link", `/${other}/reference`);
        good(await cssSnapshot(page), other, color);
        assert.equal(
          (await cssSnapshot(page)).cssRules,
          rules,
          "Repeated navigation must not keep adding duplicate CSS rules.",
        );
        assert.equal(
          documents.length,
          1,
          "Language and history navigation must preserve the document.",
        );
        const spaAdditionalDocuments = documents.length - 1;
        await page.reload();
        await mounted(page);
        await page.waitForFunction(
          (color) =>
            document.documentElement.dataset.theme === color &&
            [...document.querySelectorAll("select")].every((s) => !s.disabled && s.value === color),
          color,
        );
        good(await cssSnapshot(page), other, color);
        await theme(page, "system");
        await page.emulateMedia({ colorScheme: color === "dark" ? "light" : "dark" });
        await page.waitForFunction(
          (color) => document.documentElement.dataset.theme === color,
          color === "dark" ? "light" : "dark",
        );
        assert.deepEqual(errors, [], `Browser errors: ${locale}/${width}/${color}`);
        report.matrix.push({
          phase,
          locale,
          width,
          color,
          overview,
          reference,
          spaAdditionalDocuments,
          browserErrors: errors,
        });
        console.log(`PASS ${phase} ${locale} ${width}px ${color}`);
        await context.close();
      }
}

try {
  await run(["scripts/sync-components.mjs"]);
  browser = await chromium.launch({ headless: true });
  const baseline = await start("baseline", "dev", 5196, { HX_BASELINE: "1" });
  const raw = await (await fetch(`${baseline}/en`)).text();
  const p = await browser.newPage();
  await p.goto(`${baseline}/en`);
  await mounted(p);
  report.baseline = await cssSnapshot(p);
  report.baseline.ssrCssBytes =
    raw.match(/<style id="hono-css">([\s\S]*?)<\/style>/)?.[1].length ?? 0;
  assert.ok(report.baseline.promiseClasses > 0);
  assert.ok(report.baseline.selects.every((s) => s.disabled));
  assert.equal(report.baseline.ssrCssBytes, 0);
  await p.screenshot({ path: new URL("baseline-en-desktop.png", out).pathname, fullPage: true });
  await p.close();
  await stop();
  console.log("Baseline reproduced: missing SSR CSS, Promise classes, disabled theme.");
  const dev = await start("dev", "dev", 5195);
  await noJs(dev, "dev");
  await matrix(dev, "dev", [1280, 390]);
  await run(["node_modules/typescript/bin/tsc", "--noEmit"]);
  await stop();
  await run(["node_modules/vite/bin/vite.js", "build"]);
  const preview = await start("preview", "preview", 4195);
  await noJs(preview, "preview");
  await matrix(preview, "preview", [1280, 390, 320]);
  const [pkg, hashes] = await Promise.all([
    readFile("package-lock.json", "utf8"),
    readFile(".generated/template-hashes.json", "utf8"),
  ]);
  report.dependencies = JSON.parse(pkg).packages[""];
  report.templateHashes = JSON.parse(hashes);
  report.status = "passed";
} catch (error) {
  report.status = "failed";
  report.errors.push(error.stack);
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  await stop();
  await writeFile(new URL("results.json", out), JSON.stringify(report, null, 2) + "\n");
}
