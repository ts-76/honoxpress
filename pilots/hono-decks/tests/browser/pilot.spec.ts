import { test, expect } from "@playwright/test";

test("real guides: translations, nav/TOC, islands, Unicode URLs and repeat navigation", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (/\.(js|css)(?:\?|$)/.test(r.url()) && r.status() >= 400)
      errors.push(`${r.status()} ${r.url()}`);
  });
  await page.goto("/");
  await page.getByRole("link", { name: "Get started", exact: true }).click();
  await expect(page).toHaveTitle("Get started · honoxpress");
  await expect(page.locator("html")).toHaveAttribute("data-islands-ready", "true");
  await expect(page.locator(".docs-sidebar a[aria-current=page]")).toHaveText("Get started");
  await page
    .locator(".toc-rail")
    .getByRole("link", { name: "Interactive counter", exact: true })
    .click();
  await expect(page).toHaveURL(/#interactive-counter$/);
  await expect(page.locator("#interactive-counter")).toBeInViewport();
  await page.getByRole("button", { name: "Increment", exact: true }).click({ clickCount: 3 });
  await expect(page.getByTestId("count")).toHaveText("3");
  await expect(
    page.frameLocator('iframe[src="/demo/clock"]').getByTestId("demo-time"),
  ).toBeVisible();
  await expect(
    page
      .frameLocator('iframe[src="/demo/welcome/embed"]')
      .frameLocator("iframe")
      .getByRole("heading", { name: "Welcome", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath("english.png"), fullPage: true });
  await page.getByRole("link", { name: "日本語を読む", exact: true }).click();
  await expect(page).toHaveTitle("導入 · honoxpress");
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(page.locator("html")).toHaveAttribute("data-islands-ready", "true");
  await page.getByRole("button", { name: "増やす", exact: true }).click();
  await expect(page.getByTestId("count")).toHaveText("1");
  await page.getByRole("link", { name: "スライドの書き方", exact: true }).click();
  expect(decodeURI(new URL(page.url()).pathname)).toBe("/ja/docs/スライドを書く");
  await expect(
    page.getByRole("heading", { name: "MDXでスライドを書く", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".docs-sidebar a[aria-current=page]")).toHaveText(
    "MDXでスライドを書く",
  );
  await page
    .locator(".toc-rail")
    .getByRole("link", { name: "デッキとスライド", exact: true })
    .click();
  await expect(page.locator("#デッキとスライド")).toBeInViewport();
  await page.getByRole("link", { name: "導入へ戻る", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-islands-ready", "true");
  await page.screenshot({ path: info.outputPath("japanese.png"), fullPage: true });
  await page.getByRole("link", { name: "Read in English", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-islands-ready", "true");
  await expect(page.getByTestId("count")).toHaveText("0");
  await page.getByRole("button", { name: "Increment", exact: true }).click();
  await expect(page.getByTestId("count")).toHaveText("1");
  expect(errors).toEqual([]);
});

test("HTTP: exact Unicode routes, assets, real 404 and per-request demo", async ({
  request,
}, info) => {
  for (const route of [
    "/docs/getting-started",
    "/ja/docs/getting-started",
    "/docs/スライドを書く",
    "/ja/docs/スライドを書く",
  ]) {
    const response = await request.get(route);
    expect(response.status(), route).toBe(200);
    const html = await response.text();
    expect(html).toContain("DOCS_BODY_");
    if (route.endsWith("getting-started")) {
      const script = html.match(/<script[^>]+src="([^"]+)"/);
      expect(script).toBeTruthy();
      expect((await request.get(script![1])).status()).toBe(200);
      if (info.project.name === "production-local")
        expect(script![1]).toMatch(/^\/static\/client-[\w-]+\.js$/);
    }
    if (info.project.name === "production-local") {
      const redirect = await request.get(`${route}/`, { maxRedirects: 0 });
      expect(redirect.status()).toBe(307);
      expect(decodeURI(redirect.headers().location)).toBe(route);
    }
  }
  expect((await request.get("/style.css")).headers()["content-type"]).toContain("text/css");
  for (const route of [
    "/missing",
    "/docs/missing",
    "/ja/docs/不存在",
    "/demo/missing",
    "/static/missing.js",
  ]) {
    expect((await request.get(route)).status(), route).toBe(404);
  }
  const a = await request.get("/demo/clock");
  const b = await request.get("/demo/clock");
  expect(a.status()).toBe(200);
  expect(a.headers()["cache-control"]).toBe("no-store");
  expect(a.headers()["x-demo-request"]).toBeTruthy();
  expect(a.headers()["x-demo-request"]).not.toBe(b.headers()["x-demo-request"]);
  expect((await request.get("/demo/status")).headers()["content-type"]).toContain(
    "application/json",
  );
  const deck = await request.get("/demo/welcome/embed");
  expect(deck.status()).toBe(200);
  expect(deck.headers()["content-security-policy"]).toContain("frame-ancestors 'self'");
  if (info.project.name === "production-local") {
    for (const route of [
      "/.vite/manifest.json",
      "/app/routes/docs/getting-started.mdx",
      "/worker/index.js",
    ]) {
      expect((await request.get(route)).status(), route).toBe(404);
    }
  }
});

test("actual compiled deck: viewer advances to slide two", async ({ page }) => {
  await page.goto("/demo/welcome");
  const slides = page.frameLocator("iframe");
  await expect(slides.getByRole("heading", { name: "Welcome", exact: true })).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(slides.getByRole("heading", { name: "Next slide", exact: true })).toBeVisible();
});
