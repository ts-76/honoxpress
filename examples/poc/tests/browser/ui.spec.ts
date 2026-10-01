import { test, expect } from "@playwright/test";

test("owned UI: active nav, TOC, real clipboard, failure state, mobile, keyboard and dark mode", async ({
  page,
  context,
}, testInfo) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/docs/getting-started");
  await expect(page.locator("html")).toHaveAttribute("data-islands-ready", "true");
  await expect(
    page
      .getByRole("navigation", { name: "Documentation", exact: true })
      .getByRole("link", { name: "Getting started", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.getByRole("button", { name: "Copy code", exact: true }).click();
  await expect(page.locator(".code-block").getByRole("status")).toHaveText("Copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("pnpm install\npnpm dev");
  await page
    .getByRole("navigation", { name: "On this page", exact: true })
    .getByRole("link", { name: "Interactive counter", exact: true })
    .click();
  await expect(page).toHaveURL(/#interactive-counter$/);
  await expect(page.locator("#interactive-counter")).toBeInViewport();
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("Clipboard denied in fixture");
        },
      },
    }),
  );
  await page.getByRole("button", { name: "Copy code", exact: true }).click();
  await expect(page.locator(".code-block").getByRole("status")).toHaveText(
    "Copy failed. Select and copy the code manually.",
  );
  await expect(page.locator(".code-block").getByRole("status")).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/docs/getting-started");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  await page.locator("details.mobile-nav > summary").click();
  await expect(
    page
      .getByRole("navigation", { name: "Documentation", exact: true })
      .getByRole("link", { name: "Getting started", exact: true }),
  ).toBeVisible();
  await page.locator("details.mobile-nav > summary").click();
  await page.locator("details.mobile-toc > summary").click();
  await page
    .getByRole("navigation", { name: "On this page", exact: true })
    .getByRole("link", { name: "Run locally", exact: true })
    .click();
  await expect(page).toHaveURL(/#run-locally$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.evaluate(() => {
    (document.activeElement as HTMLElement)?.blur();
    window.scrollTo(0, 0);
  });
  await page.screenshot({ path: testInfo.outputPath("mobile.png"), fullPage: true });

  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  const contrast = await page.evaluate(() => {
    const channel = (x: number) => {
      const v = x / 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    const luminance = (color: string) => {
      const rgb = color.match(/\d+/g)!.slice(0, 3).map(Number).map(channel);
      return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
    };
    const text = luminance(getComputedStyle(document.querySelector(".prose > p")!).color);
    const background = luminance(getComputedStyle(document.body).backgroundColor);
    return (Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
  await page.evaluate(() => {
    (document.activeElement as HTMLElement)?.blur();
    window.scrollTo(0, 0);
  });
  await page.screenshot({ path: testInfo.outputPath("dark.png"), fullPage: true });
  await page
    .getByRole("navigation", { name: "Languages" })
    .getByRole("link", { name: "日本語", exact: true })
    .click();
  await expect(page).toHaveURL(/\/ja\/docs\/getting-started$/);
  await expect(page.locator("html")).toHaveAttribute("data-islands-ready", "true");
  await page.getByRole("button", { name: "コードをコピー", exact: true }).click();
  await expect(page.locator(".code-block").getByRole("status")).toHaveText("コピーしました");
});
