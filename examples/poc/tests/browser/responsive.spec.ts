import { test, expect, type Page } from "@playwright/test";

async function visit(page: Page, locale: string, width: number, colorScheme: "light" | "dark") {
  await page.setViewportSize({ width, height: 844 });
  await page.emulateMedia({ colorScheme });
  await page.goto(`${locale === "ja" ? "/ja" : ""}/docs/components`);
  await expect(page.locator('[data-hono-hydrated="true"]')).toHaveCount(locale === "ja" ? 4 : 6);
}

for (const scenario of ["theme", "navigation", "code header", "API separators"] as const) {
  test(`responsive ${scenario} remains readable in both languages and themes`, async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(60_000);
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    for (const locale of ["en", "ja"]) {
      for (const width of [1280, 390, 320]) {
        for (const colorScheme of ["light", "dark"] as const) {
          await visit(page, locale, width, colorScheme);
          if (scenario === "theme" || scenario === "navigation") {
            if (width <= 760) await page.locator(".mobile-nav > summary").click();
          }
          if (scenario === "theme") {
            const control = page.locator(
              width <= 760 ? ".mobile-theme .hx-theme-switch" : ".theme-desktop .hx-theme-switch",
            );
            const select = control.locator("select");
            const chevron = control.locator("svg");
            await expect(chevron).toHaveAttribute("aria-hidden", "true");
            await expect(select).toBeEnabled();
            for (const choice of ["light", "dark", "system"]) {
              await select.selectOption(choice);
              await expect(page.locator("html")).toHaveAttribute(
                "data-theme",
                choice === "system" ? colorScheme : choice,
              );
              const fits = await control.evaluate((element) => {
                const select = element.querySelector("select")!;
                const arrow = element.querySelector("svg")!.getBoundingClientRect();
                const box = select.getBoundingClientRect();
                const style = getComputedStyle(element.querySelector("[data-hx-theme-switch]")!);
                const canvas = document.createElement("canvas").getContext("2d")!;
                canvas.font = style.font;
                const textEnd =
                  box.left +
                  parseFloat(style.paddingLeft) +
                  canvas.measureText(select.selectedOptions[0].text).width;
                return (
                  textEnd < arrow.left &&
                  arrow.right <= box.right &&
                  box.left >= 0 &&
                  box.right <= innerWidth
                );
              });
              expect(fits).toBe(true);
            }
            await select.focus();
            await expect(select).toBeFocused();
            await expect(select).toHaveCSS("outline-style", "solid");
            if (colorScheme === "light") {
              await control.screenshot({
                path: testInfo.outputPath(`theme-${locale}-${width}.png`),
              });
            }
          } else if (scenario === "navigation") {
            const navigation = page.locator(
              width <= 760 ? ".mobile-nav .docs-nav" : ".docs-sidebar .docs-nav",
            );
            const link = navigation.locator("a").first();
            const measurements = await link.evaluate(
              (element, label) => {
                // A real long label, near a line-break boundary, exercises both states
                // in the same navigation slot without changing the catalog or route.
                element.textContent = label;
                const measure = () => ({
                  height: element.getBoundingClientRect().height,
                  width: element.getBoundingClientRect().width,
                  weight: getComputedStyle(element).fontWeight,
                });
                element.removeAttribute("aria-current");
                const ordinary = measure();
                element.setAttribute("aria-current", "page");
                return { ordinary, selected: measure() };
              },
              locale === "ja"
                ? "ルートとドキュメントの表示領域を選択する"
                : "Document policy and security",
            );
            expect(measurements.selected).toEqual(measurements.ordinary);
            if (colorScheme === "light") {
              await navigation.screenshot({
                path: testInfo.outputPath(`navigation-${locale}-${width}.png`),
              });
            }
          } else if (scenario === "code header") {
            const code = page.locator(".code-block").filter({
              has: page.locator(".code-filename", { hasText: "generated-site-navigation.ts" }),
            });
            const geometry = await code.evaluate((element) => {
              const toolbar = element.querySelector(".code-toolbar")!.getBoundingClientRect();
              const filename = element.querySelector(".code-filename")!.getBoundingClientRect();
              const button = element.querySelector("button")!;
              const action = button.getBoundingClientRect();
              const label = button.querySelector(".code-copy-label")!;
              const lines = new Range();
              lines.selectNodeContents(label);
              return {
                filenameFits: filename.left >= toolbar.left && filename.right <= action.left,
                actionFits: action.right <= toolbar.right,
                labelLines: lines.getClientRects().length,
                pageFits: document.documentElement.scrollWidth <= innerWidth,
              };
            });
            expect(geometry).toEqual({
              filenameFits: true,
              actionFits: true,
              labelLines: 1,
              pageFits: true,
            });
            await code.getByRole("button").click();
            await expect(code.getByRole("status")).toHaveText("Copied");
            if (colorScheme === "light") {
              await code.screenshot({ path: testInfo.outputPath(`code-${locale}-${width}.png`) });
            }
          } else {
            const references = page.locator(".hx-api-reference");
            await expect(references).toHaveCount(2);
            await expect(references.first()).toHaveCSS("border-top-width", "1px");
            await expect(references.first()).toHaveCSS("border-bottom-width", "1px");
            await expect(references.nth(1)).toHaveCSS("border-top-width", "0px");
            await expect(references.nth(1)).toHaveCSS("border-bottom-width", "1px");
            if (colorScheme === "light") {
              await references
                .nth(1)
                .screenshot({ path: testInfo.outputPath(`api-${locale}-${width}.png`) });
            }
          }
        }
      }
    }
  });
}
