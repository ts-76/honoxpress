import { test, expect } from "@playwright/test";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";

test("MDX save updates body, title, nav and TOC, then rehydrates the island", async ({ page }) => {
  test.fail(
    true,
    "Published honoxpress@0.1.1 does not reload SSR MDX on save; see the separate core fix PR.",
  );
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
    try {
      await page.goto(`${prefix}/docs/getting-started`);
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
    } finally {
      await writeFile(file, original);
    }
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
  try {
    await page.goto("/ja/docs/getting-started");
    await expect(page.locator("html")).toHaveAttribute("data-islands-ready", "true");
    await writeFile(
      file,
      "---\ntitle: 追加したガイド\ndescription: HMR追加確認\n---\n\n# 追加したガイド\n\n## 追加した節\n\n追加本文。\n",
    );
    await expect(
      page.locator(".docs-sidebar").getByRole("link", { name: "追加したガイド", exact: true }),
    ).toBeVisible();
    await expect.poll(async () => (await request.get("/ja/docs/追加ページ")).status()).toBe(200);
    await page
      .locator(".docs-sidebar")
      .getByRole("link", { name: "追加したガイド", exact: true })
      .click();
    await expect.poll(() => decodeURI(new URL(page.url()).pathname)).toBe("/ja/docs/追加ページ");
    await expect(page.getByRole("heading", { name: "追加したガイド", exact: true })).toBeVisible();
    await page.goto("/ja/docs/getting-started");
    await unlink(file);
    await expect(
      page.locator(".docs-sidebar").getByRole("link", { name: "追加したガイド", exact: true }),
    ).toHaveCount(0);
    await expect.poll(async () => (await request.get("/ja/docs/追加ページ")).status()).toBe(404);
    await page.goto("/docs/getting-started");
    await expect(page.locator("html")).toHaveAttribute("data-islands-ready", "true");
    await page.getByRole("button", { name: "Increment", exact: true }).click();
    await expect(page.getByTestId("count")).toHaveText("1");
  } finally {
    await unlink(file).catch(() => {});
  }
});

test("published version: manual reload shows changed Unicode MDX body, title, nav and TOC", async ({
  page,
  request,
}) => {
  const { root } = JSON.parse(await readFile("dist/evidence/hmr-root.json", "utf8")) as {
    root: string;
  };
  const file = join(root, "app/routes/ja/docs/スライドを書く.mdx");
  const original = await readFile(file, "utf8");
  try {
    await page.goto("/ja/docs/スライドを書く");
    await writeFile(
      file,
      original
        .replaceAll("MDXでスライドを書く", "更新されたガイド")
        .replace("## デッキとスライド", "## 更新された見出し") + "\n日本語HMR本文。\n",
    );
    // This reload is the documented workaround, separate from the failing HMR test.
    await expect
      .poll(async () => (await request.get("/ja/docs/スライドを書く")).text())
      .toContain("日本語HMR本文。");
    await page.reload();
    await expect(page.getByText("日本語HMR本文。", { exact: true })).toBeVisible();
    await expect(page).toHaveTitle("更新されたガイド · honoxpress");
    await expect(page.locator(".docs-sidebar a[aria-current=page]")).toHaveText("更新されたガイド");
    await expect(
      page.locator(".toc-rail").getByRole("link", { name: "更新された見出し", exact: true }),
    ).toHaveAttribute("href", "#更新された見出し");
  } finally {
    await writeFile(file, original);
  }
});
