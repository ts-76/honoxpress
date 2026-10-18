import { test, expect } from "@playwright/test";
import { themeInitializer } from "../../app/components/theme-switch";

test("repeated theme bootstrap resynchronizes replaced controls without duplicate listeners", async ({
  page,
}) => {
  await page.goto("/docs/components");
  const select = page.locator(".theme-desktop select");
  await expect(select).toBeEnabled();
  await select.selectOption("dark");
  await page.evaluate(() => {
    const previous = document.querySelector(
      ".theme-desktop select",
    ) as unknown as HTMLSelectElement;
    const replacement = previous.cloneNode(true) as HTMLSelectElement;
    replacement.disabled = true;
    replacement.value = "light";
    previous.replaceWith(replacement);
    const original = localStorage.setItem.bind(localStorage);
    (window as unknown as { themeWrites: number }).themeWrites = 0;
    Storage.prototype.setItem = function (key, value) {
      if (key === "honoxpress-theme") (window as unknown as { themeWrites: number }).themeWrites++;
      return original(key, value);
    };
  });
  await page.addScriptTag({ content: themeInitializer });
  await page.addScriptTag({ content: themeInitializer });
  await expect(select).toBeEnabled();
  await expect(select).toHaveValue("dark");
  await select.selectOption("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(
    await page.evaluate(() => (window as unknown as { themeWrites: number }).themeWrites),
  ).toBe(1);
});

test("static styles survive SSR/SSG, locales, narrow screens and app overrides", async ({
  page,
}) => {
  for (const locale of ["en", "ja"]) {
    for (const width of [1280, 390, 320]) {
      for (const colorScheme of ["light", "dark"] as const) {
        await page.setViewportSize({ width, height: 844 });
        await page.emulateMedia({ colorScheme });
        await page.goto(`${locale === "ja" ? "/ja" : ""}/docs/components`);
        const css = await page.locator("head style#hono-css").textContent();
        expect(css).toContain(".hx-callout{");
        expect(css).toContain(".hx-file-tree{");
        expect(css).toContain(".hx-type-table{");
        expect(css).toContain(".hx-figure{");
        expect(css).toContain(".hx-definition-list{");
        expect(css).toContain(".hx-api-reference{");
        expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
          false,
        );
        expect(
          await page.evaluate(() => {
            const style = document.querySelector("head style#hono-css")!;
            return Boolean(
              style.compareDocumentPosition(document.querySelector('link[rel="stylesheet"]')!) &
              Node.DOCUMENT_POSITION_FOLLOWING,
            );
          }),
        ).toBe(true);
        await page.addStyleTag({
          content:
            ":root,:root[data-theme]{--docs-panel-padding:28px;--docs-radius:12px}.hx-card{border-radius:15px}.hx-card-title{font-size:21px}",
        });
        await expect(page.locator(".hx-card").first()).toHaveCSS("padding", "28px");
        await expect(page.locator(".hx-card").first()).toHaveCSS("border-radius", "15px");
        await expect(page.locator(".hx-card-title").first()).toHaveCSS("font-size", "21px");
        const folder = page.locator(".hx-folder").first();
        await folder.locator("summary").first().click();
        await expect(folder).not.toHaveAttribute("open");
        await folder.locator("summary").first().click();
        await expect(folder).toHaveAttribute("open");
      }
    }
  }
  await page.goto("/docs/getting-started");
  const css = await page.locator("head style#hono-css").textContent();
  expect(css).not.toContain(".hx-type-table");
  expect(css).not.toContain(".hx-file-tree");
});

test("component styles retain their hierarchy and share the docs theme across sizes", async ({
  page,
}, testInfo) => {
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    for (const width of [1280, 800, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/docs/components");
      await expect(page.locator('[data-hono-hydrated="true"]')).toHaveCount(6);
      await expect(page.getByRole("tab", { name: "pnpm", exact: true })).toHaveAttribute(
        "aria-selected",
        "true",
      );
      // SSR already marks the selected tab. Panel semantics are assigned by the
      // client effect, after the hydrated island replaces the server buttons.
      await expect(page.locator(".hx-tabs").first().getByRole("tabpanel")).toHaveText(
        "pnpm add honoxpress",
      );
      const styles = await page.evaluate(() => {
        const style = (selector: string, pseudo?: string) =>
          getComputedStyle(document.querySelector(selector)!, pseudo);
        return {
          headings: [".hx-card-title", ".hx-step-title"].map((selector) => ({
            size: style(selector).fontSize,
            top: style(selector).marginTop,
            bottom: style(selector).marginBottom,
          })),
          calloutGap: style(".hx-callout-title").marginBottom,
          radii: [
            ".hx-callout",
            ".hx-card",
            ".hx-accordion-item",
            ".code-block",
            ".demo-frame",
          ].map((selector) => style(selector).borderRadius),
          borders: [".hx-card", ".hx-accordion-item", ".code-block", ".demo-frame"].map(
            (selector) => style(selector).borderTopColor,
          ),
          backgrounds: [".hx-card", ".hx-accordion-item"].map(
            (selector) => style(selector).backgroundColor,
          ),
          canvas: style("body").backgroundColor,
          header: style(".site-header").backgroundColor,
          codeSurfaces: [".prose > pre", ".code-block"].map(
            (selector) => style(selector).backgroundColor,
          ),
          panelPadding: style(".hx-card").padding,
          blockGap: style(".hx-cards").marginTop,
          sectionGap: style(".prose > h2").marginTop,
          typeRoles: [".prose > p", ".prose > h2", ".hx-tab"].map(
            (selector) => style(selector).fontSize,
          ),
          codeSizes: [".prose > pre", ".code-block pre"].map(
            (selector) => style(selector).fontSize,
          ),
          codePadding: [".prose > pre", ".code-block pre"].map(
            (selector) => style(selector).padding,
          ),
          selectedColor: style('.hx-tab[aria-selected="true"]').borderBottomColor,
          stepColor: style(".hx-step", "::before").color,
          columns: style(".hx-cards").gridTemplateColumns.split(" ").length,
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      const accent = colorScheme === "light" ? "rgb(163, 66, 34)" : "rgb(255, 173, 140)";
      expect(styles.headings).toEqual([
        { size: "18px", top: "0px", bottom: "8px" },
        { size: "18px", top: "0px", bottom: "8px" },
      ]);
      expect(styles.calloutGap).toBe("8px");
      expect(new Set(styles.radii)).toEqual(new Set(["8px"]));
      expect(new Set(styles.borders).size).toBe(1);
      expect(new Set(styles.backgrounds).size).toBe(1);
      expect(styles.backgrounds[0]).not.toBe(styles.canvas);
      expect(styles.canvas).toBe(
        colorScheme === "light" ? "rgb(249, 250, 251)" : "rgb(24, 27, 31)",
      );
      expect(styles.header).toBe(styles.backgrounds[0]);
      expect(styles.codeSurfaces).toEqual(
        Array(2).fill(colorScheme === "light" ? "rgb(250, 251, 253)" : "rgb(39, 42, 48)"),
      );
      expect(styles.typeRoles).toEqual(["18px", "24px", "14px"]);
      expect(styles.blockGap).toBe("20px");
      expect(styles.sectionGap).toBe(width <= 760 ? "32px" : "40px");
      const panelPadding = width <= 760 ? "16px" : "20px";
      expect(styles.panelPadding).toBe(panelPadding);
      expect(styles.codeSizes).toEqual(["14px", "14px"]);
      expect(styles.codePadding).toEqual([`12px ${panelPadding}`, `12px ${panelPadding}`]);
      expect(styles.selectedColor).toBe(accent);
      expect(styles.stepColor).toBe(accent);
      expect(styles.columns).toBe(width <= 760 ? 1 : 2);
      expect(styles.overflow).toBe(false);
      await expect(page.locator(".code-block .hx-syntax-function").first()).toHaveText("pnpm");
      await expect(
        page.locator(".prose > pre code.language-ts .hx-syntax-keyword").first(),
      ).toBeVisible();
      await expect(page.locator(".code-block code").first()).toHaveText("pnpm add honoxpress");
      await expect(page.locator(".hx-callout-info")).toHaveCSS(
        "border-top-color",
        colorScheme === "light" ? "rgb(28, 91, 195)" : "rgb(149, 186, 255)",
      );

      const tab = page.getByRole("tab", { name: "pnpm", exact: true });
      await tab.press("ArrowRight");
      const selected = page.getByRole("tab", { name: "npm", exact: true });
      await expect(selected).toBeFocused();
      await expect(selected).toHaveCSS("outline-color", accent);
      await expect(selected).toHaveCSS("outline-width", "2px");
      await expect(selected).toHaveCSS("outline-offset", "-4px");
      await expect(page.locator(".hx-tabs").first().getByRole("tabpanel")).toHaveText(
        "npm install honoxpress",
      );
      if (width === 1280) {
        await page
          .locator(".hx-tabs")
          .first()
          .screenshot({
            path: testInfo.outputPath(`tabs-focus-${colorScheme}.png`),
          });
        await selected.hover();
        await expect(selected).toHaveCSS(
          "background-color",
          colorScheme === "light" ? "rgb(250, 251, 253)" : "rgb(39, 42, 48)",
        );
        await page.mouse.down();
        await expect(selected).toHaveCSS(
          "background-color",
          colorScheme === "light" ? "rgb(251, 237, 231)" : "rgb(54, 40, 33)",
        );
        await page.mouse.up();
      }
      await page.locator(".hx-figure img").scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          page
            .locator(".hx-figure img")
            .evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
        )
        .toBe(true);
      await page.locator(".hx-figure img").evaluate((image: HTMLImageElement) => image.decode());
      await page.getByRole("heading", { name: "Components", exact: true }).click();
      if (width !== 800) {
        await page.screenshot({
          path: testInfo.outputPath(`components-${width}-${colorScheme}.png`),
          fullPage: true,
        });
        await page.locator(".hx-cards").screenshot({
          path: testInfo.outputPath(`cards-${width}-${colorScheme}.png`),
        });
        await page.locator(".prose > pre:has(code.language-ts)").screenshot({
          path: testInfo.outputPath(`syntax-${width}-${colorScheme}.png`),
        });
      }
    }
  }

  // A site-level customization must reach navigation and interactive components alike.
  await page.addStyleTag({
    content:
      ":root, :root[data-theme] { --docs-accent: #94612f; --docs-radius: 12px; --docs-panel-padding: 28px; --docs-title-size: 19px; --docs-title-gap: 10px; }",
  });
  await expect(page.locator('.docs-nav a[aria-current="page"]').first()).toHaveCSS(
    "color",
    "rgb(148, 97, 47)",
  );
  await expect(page.locator('.hx-tab[aria-selected="true"]').first()).toHaveCSS(
    "border-bottom-color",
    "rgb(148, 97, 47)",
  );
  await expect(page.locator(".hx-card").first()).toHaveCSS("border-radius", "12px");
  await expect(page.locator(".code-block").first()).toHaveCSS("border-radius", "12px");
  await expect(page.locator(".hx-card").first()).toHaveCSS("padding", "28px");
  await expect(page.locator(".code-block pre").first()).toHaveCSS("padding", "12px 28px");
  await expect(page.locator(".hx-card-title").first()).toHaveCSS("font-size", "19px");
  await expect(page.locator(".hx-step-title").first()).toHaveCSS("margin-bottom", "10px");
  await page.emulateMedia({ forcedColors: "active" });
  await expect(page.locator(".hx-card").first()).toHaveCSS("border-top-style", "solid");
  await expect(page.locator('.hx-tab[aria-selected="true"]').first()).toHaveCSS(
    "border-bottom-style",
    "solid",
  );
});

test("copy feedback remains readable during pending and failure states", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: () =>
          new Promise((_, reject) => {
            window.addEventListener("test-clipboard-denied", () => reject(new Error("Denied")), {
              once: true,
            });
          }),
      },
    });
  });
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme });
    await page.goto("/docs/components");
    await expect(page.locator('[data-hono-hydrated="true"]')).toHaveCount(6);
    const copy = page.getByRole("button", { name: "Copy example", exact: true });
    await copy.click();
    await expect(copy).toBeDisabled();
    await expect(copy).toHaveCSS("cursor", "wait");
    await page.evaluate(() => window.dispatchEvent(new Event("test-clipboard-denied")));
    await expect(copy).toBeEnabled();
    await expect(page.locator(".code-block").first().getByRole("status")).toHaveText(
      "Copy failed. Select and copy the code manually.",
    );
    await expect(page.locator(".copy-error")).toHaveCSS(
      "color",
      colorScheme === "light" ? "rgb(193, 27, 65)" : "rgb(255, 154, 171)",
    );
  }
});

test("registered components: hydration, isolated keyboard tabs, disclosures and clipboard", async ({
  page,
  context,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/docs/components");
  await expect(page.locator('[data-hono-hydrated="true"]')).toHaveCount(6);
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
  await expect(page.locator(".code-block").first().getByRole("status")).toHaveText(
    "Copied example",
  );
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
  await expect(page.locator('[data-hono-hydrated="true"]')).toHaveCount(4);
  await expect(page.getByRole("tab", { name: "npm", exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("authoring components support code switching, responsive tables, figures, and native folders", async ({
  page,
  context,
}, testInfo) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/docs/components");
      await expect(page.locator('[data-hono-hydrated="true"]')).toHaveCount(6);
      const tree = page.getByRole("group", { name: "Documentation project" });
      const folder = tree.locator("summary").filter({ hasText: /^routes$/ });
      await folder.focus();
      await expect(folder).toHaveCSS("outline-width", "2px");
      await folder.press("Enter");
      await expect(tree.getByRole("link", { name: "components.mdx" })).toBeVisible();
      await folder.press("Space");
      await expect(tree.getByRole("link", { name: "components.mdx" })).toBeHidden();
      await expect(tree.locator(".hx-file-highlighted")).toHaveText("mdx-components.ts");
      const table = page.getByRole("table", { name: "Figure properties" });
      await expect(table.getByRole("rowheader", { name: "src Required" })).toBeVisible();
      await expect(table.getByRole("row")).toHaveCount(6);
      const codePadding = await page.evaluate(() =>
        [".hx-type-table code", ".hx-type-table + p code"].map(
          (selector) => getComputedStyle(document.querySelector(selector)!).padding,
        ),
      );
      expect(codePadding[0]).toBe(codePadding[1]);
      expect(Number.parseFloat(codePadding[0])).toBeGreaterThan(0);
      const group = page.locator(".hx-code-group");
      await expect(group.getByRole("tabpanel")).toContainText("app.ts");
      await expect(group.locator(".hx-syntax-keyword").first()).toBeVisible();
      await group.getByRole("tab", { name: "TypeScript", exact: true }).focus();
      await page.keyboard.press("End");
      await expect(group.getByRole("tab", { name: "JavaScript", exact: true })).toBeFocused();
      await expect(group.getByRole("tabpanel")).toContainText("app.js");
      const copy = group.getByRole("button", { name: "Copy JavaScript", exact: true });
      const copyBounds = await copy.boundingBox();
      const tabBounds = await group.getByRole("tablist").boundingBox();
      expect(copyBounds!.height).toBeGreaterThanOrEqual(44);
      expect(copyBounds!.width).toBeGreaterThanOrEqual(44);
      expect(copyBounds!.y).toBeCloseTo(tabBounds!.y, 0);
      expect(copyBounds!.x).toBeGreaterThanOrEqual(tabBounds!.x + tabBounds!.width - 52);
      await copy.click();
      await expect(copy).toHaveAttribute("title", "Copied");
      expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
        'c.text("Hello")',
      );
      await expect(page.locator(".hx-tabs").first().getByRole("tabpanel")).toHaveText(
        "pnpm add honoxpress",
      );
      const image = page.locator(".hx-figure img");
      await image.scrollIntoViewIfNeeded();
      await expect(image).toHaveAttribute("width", "720");
      await expect(image).toHaveAttribute("height", "240");
      expect(
        await image.evaluate(
          (element: HTMLImageElement) => element.complete && element.naturalWidth > 0,
        ),
      ).toBe(true);
      const dimensions = await image.boundingBox();
      expect(dimensions!.width / dimensions!.height).toBeCloseTo(3, 1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
        false,
      );
      for (const [name, selector] of [
        ["file-tree", ".hx-file-tree"],
        ["type-table", ".hx-type-table"],
        ["code-group", ".hx-code-group"],
        ["figure", ".hx-figure"],
        ["definition-list", ".hx-definition-list"],
        ["api-reference", ".hx-api-reference"],
      ]) {
        await page
          .locator(selector)
          .first()
          .screenshot({ path: testInfo.outputPath(`${name}-${width}-${colorScheme}.png`) });
      }
    }
  }
  await page.emulateMedia({ forcedColors: "active" });
  await page.keyboard.press("Tab");
  await page.locator(".hx-folder-summary").first().focus();
  await expect(page.locator(".hx-folder-summary").first()).toHaveCSS("outline-style", "solid");
});

test("native file disclosures and all code examples remain usable without JavaScript", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage();
    await page.goto("/docs/components");
    const tree = page.getByRole("group", { name: "Documentation project" });
    await tree
      .locator("summary")
      .filter({ hasText: /^routes$/ })
      .click();
    await expect(tree.getByRole("link", { name: "components.mdx" })).toBeVisible();
    await expect(page.locator(".hx-code-group .code-block")).toHaveCount(2);
    await expect(page.locator(".hx-code-group .code-block").nth(0)).toBeVisible();
    await expect(page.locator(".hx-code-group .code-block").nth(1)).toBeVisible();
    await expect(page.getByRole("table", { name: "Figure properties" })).toBeVisible();
    await expect(page.locator(".hx-definition-list dt")).toHaveCount(3);
    await expect(page.getByRole("article", { name: "DemoFrame", exact: true })).toBeVisible();
    await expect(page.locator(".theme-desktop select")).toBeDisabled();
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(24, 27, 31)");
  } finally {
    await context.close();
  }
});

test("theme choice persists before rendering, follows the OS, syncs tabs, and works with restricted storage", async ({
  page,
  context,
  browser,
  baseURL,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      if (document.body) {
        document.documentElement.dataset.firstBodyTheme = document.documentElement.dataset.theme;
        observer.disconnect();
      }
    });
    observer.observe(document, { childList: true, subtree: true });
  });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/docs/components");
  const propertyColumnRatio = await page
    .locator(".hx-type-table table")
    .first()
    .evaluate(
      (table) =>
        table.querySelector("th")!.getBoundingClientRect().width /
        table.getBoundingClientRect().width,
    );
  expect(propertyColumnRatio).toBeCloseTo(0.32, 2);
  const desktop = page.locator(".theme-desktop select");
  await expect(desktop).toHaveValue("system");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await desktop.selectOption("light");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(249, 250, 251)");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-first-body-theme", "light");
  await expect(desktop).toHaveValue("light");
  await page.goto("/docs/getting-started");
  await expect(desktop).toHaveValue("light");
  const other = await context.newPage();
  try {
    await other.goto("/docs/components");
    await other.locator(".theme-desktop select").selectOption("dark");
    await expect(desktop).toHaveValue("dark");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  } finally {
    await other.close();
  }
  await desktop.selectOption("system");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/docs/components");
  await page.locator(".mobile-nav > summary").click();
  const mobile = page.locator(".mobile-theme select");
  await expect(mobile).toBeVisible();
  await mobile.focus();
  await expect(mobile).toHaveCSS("outline-width", "2px");
  await mobile.selectOption("light");
  await expect(desktop).toHaveValue("light");
  await page
    .locator(".mobile-nav-content")
    .screenshot({ path: testInfo.outputPath("theme-mobile-menu.png") });
  await page.locator(".mobile-nav > summary").click();
  const frame = page.locator("iframe");
  await expect(frame).toHaveAttribute("allow", "fullscreen");
  const bounds = await frame.boundingBox();
  expect(bounds!.width / bounds!.height).toBeCloseTo(16 / 9, 1);
  await expect(page.getByRole("link", { name: "Open live demo" })).toHaveAttribute(
    "href",
    "/demo/clock?view=full",
  );
  await expect(page.locator(".hx-definition-list dt")).toHaveCount(3);
  const reference = page.getByRole("article", { name: "DemoFrame", exact: true });
  const propertyName = reference.locator("tbody th code").first();
  // A normal-sized API identifier should fit without splitting inside a word.
  expect((await propertyName.boundingBox())!.height).toBeLessThan(30);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await reference.getByRole("button", { name: "Copy demo example", exact: true }).click();
  await expect(reference.getByRole("status")).toHaveText("Copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "/demo/product/embed",
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.goto("/ja/docs/components");
  await page.locator(".mobile-nav > summary").click();
  await expect(page.getByRole("combobox", { name: "テーマ" })).toBeVisible();
  await page.goto("/");
  await expect(page.locator(".theme-home select")).toBeVisible();
  expect(errors).toEqual([]);

  const restricted = await browser.newContext({ baseURL, colorScheme: "dark" });
  try {
    await restricted.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get: () => {
          throw new Error("Storage unavailable");
        },
      });
    });
    const isolated = await restricted.newPage();
    await isolated.goto("/docs/components");
    await expect(isolated.locator("html")).toHaveAttribute("data-theme", "dark");
    await isolated.locator(".theme-desktop select").selectOption("light");
    await expect(isolated.locator("body")).toHaveCSS("background-color", "rgb(249, 250, 251)");
  } finally {
    await restricted.close();
  }
});
