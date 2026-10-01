import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test, expect } from "vite-plus/test";
import { docsMetadataPlugin, docsOnlyPlugin, remarkDocsHeadings } from "honoxpress/build";
import { resolveClientScript } from "honoxpress";

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

test("metadata discovery follows HonoX exclusions and Worker never discovers files", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "honoxpress-discovery-"));
  try {
    const routes = [
      "docs/visible.mdx",
      "docs/_partial.mdx",
      "docs/-hidden.mdx",
      "docs/$loader.mdx",
      "docs/-partials/example.mdx",
      "docs/.hidden/example.mdx",
      "docs/_group/visible.mdx",
    ];
    for (const route of routes) {
      const file = path.join(root, "app/routes", route);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, "uncompiled fixture");
    }
    const load = async (worker: boolean) => {
      const plugin = docsMetadataPlugin({ locales: ["en"], defaultLocale: "en", worker });
      const resolved = plugin.configResolved as (config: { root: string }) => void;
      resolved({ root });
      const hook = plugin.load as (
        this: { addWatchFile(file: string): void },
        id: string,
      ) => Promise<string>;
      return hook.call(
        {
          addWatchFile() {
            if (worker) throw new Error("Worker touched routes");
          },
        },
        "\0virtual:honoxpress/catalog",
      );
    };
    const source = await load(false);
    expect(source).toContain("docs/visible.mdx");
    expect(source).toContain("docs/_group/visible.mdx");
    for (const route of routes.slice(1, 6)) expect(source).not.toContain(route);
    expect(await load(true)).not.toContain(".mdx");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
