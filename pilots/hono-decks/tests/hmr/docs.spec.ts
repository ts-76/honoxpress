import { test, expect } from "@playwright/test";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { gotoConnected, routeStatus } from "./ready";

test("MDX save updates body, title, nav and TOC, then rehydrates the island", async ({ page }) => {
  const { root } = JSON.parse(await readFile("dist/evidence/hmr-root.json", "utf8")) as {
    root: string;
  };
  for (const locale of ["en", "ja"]) {
    const prefix = locale === "ja" ? "/ja" : "";
    const file = join(root, `app/routes${prefix}/docs/getting-started.mdx`);
    const original = await readFile(file, "utf8");
    const title = locale === "ja" ? "更新されたガイド" : "Updated guide";
    const heading = locale === "ja" ? "更新された見出し" : "Updated heading";
    const button = locale === "ja" ? "増やす" : "Increment";
    // The disposable app is removed by teardown. Restoring here would emit
    // another reload while the next locale is navigating.
    await gotoConnected(page, `${prefix}/docs/getting-started`);
    await expect(page.locator("html")).toHaveAttribute("data-islands-ready", "true");
    await page.getByRole("button", { name: button, exact: true }).click();
    await expect(page.getByTestId("count")).toHaveText("1");
    await writeFile(
      file,
      original.replace(/^title:.*$/m, `title: ${title}`).replace(/^# .*$/m, `# ${title}`) +
        `\n## ${heading}\n\nHMR ${locale} body revision.\n`,
    );
    // Deliberately no page.reload/goto: Vite must notify the open browser.
    await expect(page.getByText(`HMR ${locale} body revision.`, { exact: true })).toBeVisible();
    await expect(page).toHaveTitle(`${title} · honoxpress`);
    await expect(page.locator(".docs-sidebar a[aria-current=page]")).toHaveText(title);
    await expect(
      page.locator(".toc-rail").getByRole("link", { name: heading, exact: true }),
    ).toHaveAttribute("href", `#${heading.toLowerCase().replaceAll(" ", "-")}`);
    await expect(page.locator("html")).toHaveAttribute("data-islands-ready", "true");
    await expect(page.getByTestId("count")).toHaveText("0");
    await page.getByRole("button", { name: button, exact: true }).click();
    await expect(page.getByTestId("count")).toHaveText("1");
  }
});

test("Japanese MDX add/unlink refreshes navigation, routing and real 404", async ({
  page,
  request,
}) => {
  const { root } = JSON.parse(await readFile("dist/evidence/hmr-root.json", "utf8")) as {
    root: string;
  };
  const file = join(root, "app/routes/ja/docs/追加ページ.mdx");
  let automaticReloads = 0;
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame() && new URL(frame.url()).pathname === "/ja/docs/getting-started")
      automaticReloads++;
  });
  try {
    await gotoConnected(page, "/ja/docs/getting-started");
    await expect(page.locator("html")).toHaveAttribute("data-islands-ready", "true");
    automaticReloads = 0;
    await writeFile(
      file,
      "---\ntitle: 追加したガイド\ndescription: HMR追加確認\n---\n\n# 追加したガイド\n\n## 追加した節\n\n追加本文。\n",
    );
    await expect(
      page.locator(".docs-sidebar").getByRole("link", { name: "追加したガイド", exact: true }),
    ).toBeVisible();
    // HonoX restarts on route addition; wait until the new route is serving.
    await expect.poll(() => routeStatus(request, "/ja/docs/追加ページ")).toBe(200);
    await page
      .locator(".docs-sidebar")
      .getByRole("link", { name: "追加したガイド", exact: true })
      .click();
    await expect.poll(() => decodeURI(new URL(page.url()).pathname)).toBe("/ja/docs/追加ページ");
    await expect(page.getByRole("heading", { name: "追加したガイド", exact: true })).toBeVisible();
    expect(automaticReloads).toBe(1);
    await gotoConnected(page, "/ja/docs/getting-started");
    automaticReloads = 0;
    await unlink(file);
    await expect(
      page.locator(".docs-sidebar").getByRole("link", { name: "追加したガイド", exact: true }),
    ).toHaveCount(0);
    await expect.poll(() => routeStatus(request, "/ja/docs/追加ページ")).toBe(404);
    await gotoConnected(page, "/docs/getting-started");
    expect(automaticReloads).toBe(1);
    await expect(page.locator("html")).toHaveAttribute("data-islands-ready", "true");
    await page.getByRole("button", { name: "Increment", exact: true }).click();
    await expect(page.getByTestId("count")).toHaveText("1");
  } finally {
    await unlink(file).catch(() => {});
  }
});

test("Unicode MDX save automatically updates body, title, nav and TOC", async ({ page }) => {
  const { root } = JSON.parse(await readFile("dist/evidence/hmr-root.json", "utf8")) as {
    root: string;
  };
  const file = join(root, "app/routes/ja/docs/スライドを書く.mdx");
  const original = await readFile(file, "utf8");
  await gotoConnected(page, "/ja/docs/スライドを書く");
  await writeFile(
    file,
    original
      .replaceAll("MDXでスライドを書く", "更新されたガイド")
      .replace("## デッキとスライド", "## 更新された見出し") + "\n日本語HMR本文。\n",
  );
  // No manual reload or request polling: the open browser must update itself.
  await expect(page.getByText("日本語HMR本文。", { exact: true })).toBeVisible();
  await expect(page).toHaveTitle("更新されたガイド · honoxpress");
  await expect(page.locator(".docs-sidebar a[aria-current=page]")).toHaveText("更新されたガイド");
  await expect(
    page.locator(".toc-rail").getByRole("link", { name: "更新された見出し", exact: true }),
  ).toHaveAttribute("href", "#更新された見出し");
});
