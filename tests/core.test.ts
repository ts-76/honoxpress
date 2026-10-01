import { test, expect } from "vite-plus/test";
import { createDocsCatalog } from "@honox-docs-poc/docs";

const options = {
  locales: ["en", "ja"],
  defaultLocale: "en",
  entries: [
    { route: "docs/guide/install.mdx", title: "Install", order: 2 },
    { route: "ja/docs/guide/install.mdx", title: "導入" },
    { route: "docs/index.mdx", title: "Overview", order: 1 },
    { route: "docs/only-en.mdx", title: "English only", order: 3 },
  ],
};
test("route identities, nested URLs, nav order and translations require no frontmatter id", () => {
  const docs = createDocsCatalog(options);
  expect(docs.navigation("en").map((page) => page.href)).toEqual([
    "/docs",
    "/docs/guide/install",
    "/docs/only-en",
  ]);
  expect(docs.page("/docs/guide/install/")?.slug).toBe("guide/install");
  expect(docs.translations("/docs/guide/install")).toEqual([
    { locale: "en", href: "/docs/guide/install" },
    { locale: "ja", href: "/ja/docs/guide/install" },
  ]);
});
test("missing translation or unknown page never invents a link", () => {
  const docs = createDocsCatalog(options);
  expect(docs.translations("/docs/only-en")[1]).toEqual({ locale: "ja" });
  expect(docs.translations("/missing")).toEqual([]);
  expect(docs.navigation("fr")).toEqual([]);
});
test("colliding index routes and duplicate URLs fail early", () => {
  expect(() =>
    createDocsCatalog({
      ...options,
      entries: [
        { route: "docs/guide.mdx", title: "A" },
        { route: "docs/guide/index.mdx", title: "B" },
      ],
    }),
  ).toThrow("Duplicate docs URL");
});
test("invalid metadata, locale codes and route traversal fail", () => {
  for (const route of [
    "docs/../escape.mdx",
    "docs/a/:name.mdx",
    "fr/docs/a.mdx",
    "en/docs/a.mdx",
    "docs/a.tsx",
    "/docs/a.mdx",
  ])
    expect(() => createDocsCatalog({ ...options, entries: [{ route, title: "A" }] })).toThrow();
  expect(() =>
    createDocsCatalog({ ...options, entries: [{ route: "docs/a.mdx", title: " " }] }),
  ).toThrow();
  expect(() =>
    createDocsCatalog({ ...options, entries: [{ route: "docs/a.mdx", title: "A", order: NaN }] }),
  ).toThrow();
  expect(() => createDocsCatalog({ ...options, locales: ["en", "en"] })).toThrow();
  expect(() => createDocsCatalog({ ...options, defaultLocale: "fr" })).toThrow();
});
test("results cannot be mutated and input mutation cannot alter the catalog", () => {
  const input = { route: "docs/a.mdx", title: "Before" };
  const docs = createDocsCatalog({ ...options, entries: [input] });
  input.title = "After";
  expect(docs.pages[0].title).toBe("Before");
  expect(Object.isFrozen(docs.pages)).toBe(true);
  expect(Object.isFrozen(docs.pages[0])).toBe(true);
});
test("duplicate heading anchors fail rather than producing ambiguous TOC links", () => {
  expect(() =>
    createDocsCatalog({
      ...options,
      entries: [
        {
          route: "docs/a.mdx",
          title: "A",
          headings: [
            { depth: 2, text: "One", id: "same" },
            { depth: 2, text: "Two", id: "same" },
          ],
        },
      ],
    }),
  ).toThrow("duplicate heading");
});
