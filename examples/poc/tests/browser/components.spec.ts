import { test, expect } from "@playwright/test";

test("registered components: hydration, isolated keyboard tabs, disclosures and clipboard", async ({
  page,
  context,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/docs/components");
  await expect(page.locator('[data-hono-hydrated="true"]')).toHaveCount(3);
  await expect(page.locator(".hx-callout")).toHaveCount(5);
  await expect(page.locator(".hx-card")).toHaveCount(2);
  await expect(page.locator(".hx-step")).toHaveCount(3);
  await expect(
    page.getByText("A custom component is registered once", { exact: false }),
  ).toBeVisible();

  const first = page.locator(".hx-tabs").nth(0);
  const second = page.locator(".hx-tabs").nth(1);
  await expect(first.getByRole("tabpanel")).toHaveText("pnpm add honoxpress");
  await expect(second.getByRole("tabpanel")).toHaveText("Source content");
  await first.getByRole("tab", { name: "pnpm", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(first.getByRole("tab", { name: "npm", exact: true })).toBeFocused();
  await expect(first.getByRole("tabpanel")).toHaveText("npm install honoxpress");
  await expect(second.getByRole("tabpanel")).toHaveText("Source content");
  await page.keyboard.press("Home");
  await expect(first.getByRole("tabpanel")).toHaveText("pnpm add honoxpress");
  await page.keyboard.press("End");
  await expect(first.getByRole("tabpanel")).toHaveText("npm install honoxpress");
  await second.getByRole("tab", { name: "Preview", exact: true }).click();
  await expect(second.getByRole("tabpanel")).toHaveText("Preview content");
  const relations = await page.locator(".hx-tabs").evaluateAll((roots) =>
    roots.every((root) =>
      Array.from(root.querySelectorAll('[role="tab"]')).every((tab) => {
        const panel = document.getElementById(tab.getAttribute("aria-controls") ?? "");
        return panel?.getAttribute("aria-labelledby") === tab.id && root.contains(panel);
      }),
    ),
  );
  expect(relations).toBe(true);
  const ids = await page
    .locator("[id]")
    .evaluateAll((elements) => elements.map((element) => element.id));
  expect(new Set(ids).size).toBe(ids.length);

  await page.getByText("Who owns the components?", { exact: true }).click();
  await expect(
    page.getByText("Your application owns the copied source.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Copy example", exact: true }).click();
  await expect(page.locator(".code-block").getByRole("status")).toHaveText("Copied example");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("pnpm add honoxpress");
  await expect(page.frameLocator("iframe").getByTestId("demo-time")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({
    path: testInfo.outputPath("components-mobile-dark.png"),
    fullPage: true,
  });
  await page.goto("/ja/docs/components");
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(page.locator('[data-hono-hydrated="true"]')).toHaveCount(3);
  await expect(page.getByRole("tab", { name: "npm", exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
