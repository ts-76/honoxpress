import { test, expect } from "@playwright/test";

test("Markdown components preserve SSR styles, one explicit island, themes and translations", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const locale of ["en", "ja"]) {
    const path = `${locale === "ja" ? "/ja" : ""}/docs/markdown`;
    for (const width of [1280, 390, 320]) {
      for (const scheme of ["light", "dark"] as const) {
        await page.setViewportSize({ width, height: 844 });
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto(path);
        await expect(page.locator("html")).toHaveAttribute("lang", locale);
        await expect(page.locator('[data-hono-hydrated="true"]')).toHaveCount(1);
        const css = await page.locator("head style#hono-css").textContent();
        for (const selector of [".hx-callout{", ".hx-card{", ".hx-step{", ".hx-type-table{"])
          expect(css).toContain(selector);
        expect(css).not.toContain(".hx-file-tree{");
        await expect(page.locator(".hx-card")).toHaveCount(2);
        await expect(page.locator(".hx-step")).toHaveCount(2);
        await expect(page.locator(".hx-callout strong")).toBeVisible();
        await expect(page.locator(".hx-type-table")).toBeVisible();
        const group = page.locator(".hx-code-group");
        await expect(group.locator("[data-hx-tabs]")).toHaveAttribute("data-hx-tabs-ready", "true");
        await expect(group.getByRole("tabpanel")).toContainText("page.tsx");
        await group.getByRole("tab", { name: "TypeScript", exact: true }).focus();
        await page.keyboard.press("End");
        await expect(group.getByRole("tab", { name: "JavaScript", exact: true })).toBeFocused();
        await expect(group.getByRole("tabpanel")).toContainText("page.jsx");
        if (width < 768) await page.locator(".mobile-nav > summary").click();
        const theme = page.locator(width < 768 ? ".mobile-theme select" : ".theme-desktop select");
        await theme.selectOption("system");
        await expect(page.locator("html")).toHaveAttribute("data-theme", scheme);
        await theme.selectOption(scheme === "light" ? "dark" : "light");
        await expect(page.locator("html")).toHaveAttribute(
          "data-theme",
          scheme === "light" ? "dark" : "light",
        );
        await theme.selectOption(scheme);
        if (width < 768) await page.locator(".mobile-nav > summary").click();
        expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
          false,
        );
        await page.addStyleTag({
          content: ".hx-card{border-radius:13px}:root,:root[data-theme]{--docs-panel-padding:22px}",
        });
        await expect(page.locator(".hx-card").first()).toHaveCSS("border-radius", "13px");
        await expect(page.locator(".hx-card").first()).toHaveCSS("padding", "22px");
        await page.evaluate(() => {
          (document.activeElement as HTMLElement)?.blur();
          window.scrollTo(0, 0);
        });
        await page.screenshot({
          path: testInfo.outputPath(`markdown-${locale}-${width}-${scheme}.png`),
          fullPage: true,
        });
      }
    }
  }
  await page.setViewportSize({ width: 1280, height: 844 });
  await page.locator(".theme-desktop select").selectOption("dark");
  await page.locator('.header-right a[lang="en"]').click();
  await expect(page).toHaveURL(/\/docs\/markdown$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".theme-desktop select")).toHaveValue("dark");
  await page.locator('.header-right a[lang="ja"]').click();
  await expect(page).toHaveURL(/\/ja\/docs\/markdown$/);
  await page.goBack();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.locator(".hx-code-group").getByRole("tab", { name: "JavaScript", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("Markdown content, wrappers and native disclosures work without JavaScript", async ({
  browser,
  baseURL,
}, testInfo) => {
  for (const locale of ["en", "ja"]) {
    for (const width of [1280, 390, 320]) {
      for (const scheme of ["light", "dark"] as const) {
        const context = await browser.newContext({
          baseURL,
          javaScriptEnabled: false,
          viewport: { width, height: 844 },
          colorScheme: scheme,
        });
        try {
          const page = await context.newPage();
          await page.goto(`${locale === "ja" ? "/ja" : ""}/docs/markdown`);
          await expect(page.locator(".hx-callout")).toBeVisible();
          await expect(page.locator(".hx-card")).toHaveCount(2);
          await expect(page.locator(".hx-step")).toHaveCount(2);
          await expect(page.locator(".hx-type-table")).toBeVisible();
          await expect(page.locator(".hx-code-group .code-block")).toHaveCount(2);
          for (const block of await page.locator(".hx-code-group .code-block").all())
            await expect(block).toBeVisible();
          await page.locator(".hx-accordion-summary").click();
          await expect(page.locator(".hx-accordion-content")).toBeVisible();
          await expect(page.locator(".hx-callout")).toHaveCSS("border-top-width", "1px");
          expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
            false,
          );
          if (width === 320)
            await page.screenshot({
              path: testInfo.outputPath(`markdown-nojs-${locale}-${scheme}.png`),
              fullPage: true,
            });
        } finally {
          await context.close();
        }
      }
    }
  }
});
