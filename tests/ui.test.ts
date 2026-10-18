import renderer from "../examples/poc/app/routes/_renderer";
import { Hono } from "hono";
import { test, expect, vi } from "vite-plus/test";
import { LanguageLinks } from "../packages/docs/templates/docs-ui";
import { DocsFrame, DocsLayout } from "../packages/docs/templates/docs-layout";
import { createDocsCatalogFromPages } from "honoxpress";
import { jsx } from "hono/jsx/jsx-runtime";

test("body-only frame adapts page links while keeping fragments and external links native", async () => {
  const catalog = createDocsCatalogFromPages({
    locales: ["en", "ja"],
    defaultLocale: "en",
    pages: [
      {
        locale: "en",
        slug: "guide",
        href: "/en/guide",
        title: "Guide",
        headings: [{ depth: 2, text: "Read", id: "read" }],
      },
      { locale: "ja", slug: "guide", href: "/ja/guide", title: "ガイド" },
    ],
  });
  const props = {
    children: "Content",
    current: catalog.page("/en/guide"),
    pages: catalog.navigation("en"),
    translations: catalog.translations("/en/guide"),
    locale: "en",
    config: {
      name: "Docs",
      defaultLocale: "en",
      localeLabels: { en: "EN", ja: "JA" },
      repositoryHref: "https://example.com/repo",
    },
  };
  const link = (props: import("../packages/docs/templates/docs-ui").DocsLinkProps) =>
    jsx("a", { ...props, "data-router": "true" });
  const app = new Hono()
    .get("/frame", (c) => c.html(jsx(DocsFrame, { ...props, link }).toString()))
    .get("/native", (c) => c.html(jsx(DocsFrame, props).toString()))
    .get("/document", (c) => c.html(jsx(DocsLayout, props).toString()));
  const frame = await (await app.request("/frame")).text();
  expect(frame).not.toMatch(/<(html|head|body|style|script)(\s|>)/);
  expect(frame).toContain('href="/ja/guide"');
  expect((frame.match(/data-router="true"/g) ?? []).length).toBe(6);
  expect(frame).toContain('<a href="#read">');
  expect(frame).toContain('<a class="repo-link" href="https://example.com/repo">');
  const document = await (await app.request("/document")).text();
  expect(document.match(/<body>([\s\S]*)<\/body>/)?.[1]).toBe(
    await (await app.request("/native")).text(),
  );
  expect(document).toContain('<html lang="en">');
  expect(document).not.toContain("data-router=");
});

test("missing translations render unavailable text and no fabricated link", async () => {
  const app = new Hono().get("/", (c) =>
    c.html(
      LanguageLinks({
        links: [{ locale: "en", href: "/docs/only-en" }, { locale: "ja" }],
        locale: "en",
        labels: { en: "English", ja: "日本語" },
      }),
    ),
  );
  const html = await (await app.request("http://local.test/")).text();
  expect(html).toContain('aria-disabled="true"');
  expect(html).toContain('title="Translation unavailable"');
  expect(html).not.toContain('href="/ja/');
  expect(html).toContain('aria-current="page"');
});

vi.mock("../examples/poc/app/docs-catalog", async () => {
  const { createDocsCatalog } = await import("honoxpress");
  return {
    docsCatalog: createDocsCatalog({
      locales: ["en", "ja"],
      defaultLocale: "en",
      entries: [
        {
          route: "docs/日本語.mdx",
          title: "Unicode",
          headings: [{ depth: 2, text: "Section", id: "section" }],
        },
        {
          route: "ja/docs/日本語.mdx",
          title: "日本語",
          headings: [{ depth: 2, text: "Section", id: "section" }],
        },
      ],
    }),
  };
});
test("actual renderer keeps Unicode docs layout, active navigation, translation and Island script", async () => {
  const app = new Hono()
    .use("*", renderer)
    .get("/docs/日本語", (c) =>
      c.render("Island content", { frontmatter: { title: "Unicode", description: "Fixture" } }),
    );
  const href = "/docs/" + encodeURIComponent("日本語");
  const response = await app.request(href);
  expect(response.status).toBe(200);
  const html = await response.text();
  expect(html).toContain('class="docs-layout"');
  expect(html).toContain(`href="${href}" aria-current="page"`);
  expect(html).toContain(`href="/ja${href}"`);
  expect(html).toContain('href="#section"');
  expect(html).toContain('type="module" src="/app/client.ts"');
  expect(html.indexOf("honoxpress-theme")).toBeLessThan(html.indexOf('rel="stylesheet"'));
  expect(html).toContain("data-hx-theme-switch");
});
