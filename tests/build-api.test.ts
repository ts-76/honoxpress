import { test, expect } from "vite-plus/test";
import { docsOnlyPlugin, remarkDocsHeadings } from "@honox-docs-poc/docs/build";
import { resolveClientScript } from "@honox-docs-poc/docs";

test("docs hook excludes dynamic routes before execution and supports caller locale prefixes", () => {
  const report = { accepted: [] as string[], skipped: [] as string[] };
  const plugin = docsOnlyPlugin({ locales: ["en", "fr"], defaultLocale: "en" }, report);
  for (const path of [
    "/",
    "/demo/:name",
    "/docs/:slug",
    "/ja/docs/a",
    "/docs-other/a",
    "/fr/docs/*",
  ])
    expect(plugin.beforeRequestHook?.(new Request(`https://local.test${path}`))).toBe(false);
  for (const path of ["/docs", "/docs/nested/page", "/fr/docs/nested/page"])
    expect(plugin.beforeRequestHook?.(new Request(`https://local.test${path}`))).toBeInstanceOf(
      Request,
    );
  expect(report.accepted).toEqual(["/docs", "/docs/nested/page", "/fr/docs/nested/page"]);
});
test("TOC anchors preserve Unicode and avoid collisions with repeated and suffixed headings", () => {
  const heading = (value: string) => ({
    type: "heading",
    depth: 2,
    children: [{ type: "text", value }],
  });
  const root = {
    type: "root",
    children: [heading("Hello"), heading("Hello"), heading("Hello-1"), heading("日本語の見出し")],
  };
  remarkDocsHeadings()(root);
  expect(
    root.children
      .slice(0, 4)
      .map((node) => (node as { data?: { hProperties: { id: string } } }).data?.hProperties.id),
  ).toEqual(["hello", "hello-1", "hello-1-1", "日本語の見出し"]);
  expect(root.children.at(-1)?.type).toBe("mdxjsEsm");
});
test("expression-only headings fail instead of inventing misleading TOC text", () => {
  expect(() =>
    remarkDocsHeadings()({ type: "root", children: [{ type: "heading", depth: 2, children: [] }] }),
  ).toThrow("static text");
});
test("client manifest helper rejects missing or unsafe assets", () => {
  expect(
    resolveClientScript({ "app/client.ts": { file: "static/client-test.js" } }, "app/client.ts"),
  ).toBe("/static/client-test.js");
  for (const file of ["/absolute.js", "../escape.js", "https://remote/script.js", "static/a.css"])
    expect(() => resolveClientScript({ entry: { file } }, "entry")).toThrow();
  expect(() => resolveClientScript(undefined, "entry")).toThrow("Build client before SSG");
});
