import renderer from "../examples/poc/app/routes/_renderer";
import { Hono } from "hono";
import { test, expect, vi } from "vite-plus/test";
import { LanguageLinks } from "../packages/docs/templates/docs-ui";

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
});
