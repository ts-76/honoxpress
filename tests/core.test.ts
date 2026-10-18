import { test, expect } from "vite-plus/test";
import {
  createDocsCatalog,
  createDocsCatalogFromPages,
  defineDocsConfig,
  resolveDocsLocale,
} from "honoxpress";

test("explicit catalogs accept framework paths, root pages and translated Unicode keys", () => {
  const heading = { depth: 2, text: "Install", id: "install" };
  const input = {
    locale: "en",
    slug: "日本語",
    href: "/en/start",
    title: " Start ",
    route: "pages/en/index.tsx",
    headings: [heading],
  };
  const docs = createDocsCatalogFromPages({
    locales: ["en", "ja"],
    defaultLocale: "en",
    pages: [
      input,
      { locale: "ja", slug: "日本語", href: "/ja/日本語", title: "導入" },
      { locale: "en", slug: "", href: "/", title: "Home", order: -1 },
    ],
  });
  expect(docs.page("/")?.title).toBe("Home");
  expect(docs.page("/en/start/")?.title).toBe("Start");
  expect(docs.page("/ja/日本語")?.href).toBe("/ja/" + encodeURIComponent("日本語"));
  expect(docs.translations("/en/start")).toEqual([
    { locale: "en", href: "/en/start" },
    { locale: "ja", href: "/ja/" + encodeURIComponent("日本語") },
  ]);
  expect(docs.translations("/")[1]).toEqual({ locale: "ja" });
  input.title = "Mutated";
  heading.text = "Mutated";
  expect(docs.page("/en/start")?.headings[0].text).toBe("Install");
  expect(Object.isFrozen(docs.pages)).toBe(true);
});

test("explicit catalogs reject unsafe URLs, encodings and ambiguous translation identities", () => {
  const page = { locale: "en", slug: "start", href: "/start", title: "Start" };
  const make = (pages = [page]) =>
    createDocsCatalogFromPages({ locales: ["en", "ja"], defaultLocale: "en", pages });
  for (const href of [
    "//example.com",
    "https://example.com",
    "/../a",
    "/a/",
    "/a//b",
    "/a?x=1",
    "/a#b",
    "/%2f",
    "/%5c",
    "/%252F",
    "/%2e%2e",
    "/%",
    "/a\\b",
  ])
    expect(() => make([{ ...page, href }])).toThrow();
  expect(() => make([page, { ...page, href: "/another" }])).toThrow("translation identity");
  expect(() => make([page, { ...page, locale: "ja" }])).toThrow("Duplicate docs URL");
  expect(() => make([{ ...page, locale: "fr" }])).toThrow("locale");
  expect(() => make([{ ...page, slug: "../bad" }])).toThrow();
  expect(() => make([{ ...page, title: " " }])).toThrow("metadata");
});

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
test("site configuration rejects inconsistent language settings before building pages", () => {
  const config = {
    name: "My docs",
    defaultLocale: "ja",
    localeLabels: { en: "English", ja: "日本語" },
  };
  expect(defineDocsConfig(config)).toBe(config);
  const invalidLabels: Record<string, string>[] = [{}, { "../ja": "日本語" }, { ja: " " }];
  for (const localeLabels of invalidLabels)
    expect(() => defineDocsConfig({ ...config, localeLabels })).toThrow("docs.config.ts");
  expect(() => defineDocsConfig({ ...config, defaultLocale: "fr" })).toThrow("defaultLocale");
});

test("Japanese default and additional languages share route identities and locale resolution", () => {
  const config = defineDocsConfig({
    name: "My docs",
    defaultLocale: "ja",
    localeLabels: { en: "English", ja: "日本語", fr: "Français" },
  });
  const docs = createDocsCatalog({
    locales: Object.keys(config.localeLabels),
    defaultLocale: config.defaultLocale,
    entries: [
      { route: "docs/start.mdx", title: "はじめに" },
      { route: "en/docs/start.mdx", title: "Start" },
      { route: "fr/docs/start.mdx", title: "Démarrer" },
    ],
  });
  expect(docs.page("/docs/start")?.locale).toBe("ja");
  expect(docs.translations("/docs/start")).toEqual([
    { locale: "en", href: "/en/docs/start" },
    { locale: "ja", href: "/docs/start" },
    { locale: "fr", href: "/fr/docs/start" },
  ]);
  for (const pathname of ["/", "/docs/start", "/missing", "/english/docs/start", "/fr-other"])
    expect(resolveDocsLocale(pathname, config)).toBe("ja");
  expect(resolveDocsLocale("/en", config)).toBe("en");
  expect(resolveDocsLocale("/en/docs/start", config)).toBe("en");
  expect(resolveDocsLocale("/fr/missing", config)).toBe("fr");
});
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

test("Unicode lookups accept encoded or decoded paths without interpreting malformed or escaped paths", () => {
  const docs = createDocsCatalog({
    ...options,
    entries: [
      { route: "docs/日本語.mdx", title: "Unicode" },
      { route: "ja/docs/日本語.mdx", title: "日本語" },
    ],
  });
  const href = "/docs/" + encodeURIComponent("日本語");
  for (const pathname of [href, href.toLowerCase(), "/docs/日本語", "/docs/日本語/"])
    expect(docs.page(pathname)?.href).toBe(href);
  expect(docs.translations("/docs/日本語")[1]?.href).toBe("/ja" + href);
  for (const pathname of [
    "/docs/%",
    "/docs/%E6",
    "/docs/guide%2Finstall",
    href.replaceAll("%", "%25"),
  ])
    expect(docs.page(pathname)).toBeUndefined();
});
test("catalog rejects HonoX excluded MDX routes while allowing underscore directories", () => {
  for (const route of [
    "docs/_partial.mdx",
    "docs/-hidden.mdx",
    "docs/$loader.mdx",
    "docs/-partials/a.mdx",
    "docs/.hidden/a.mdx",
  ])
    expect(() =>
      createDocsCatalog({ ...options, entries: [{ route, title: "Hidden" }] }),
    ).toThrow();
  expect(
    createDocsCatalog({
      ...options,
      entries: [{ route: "docs/_group/visible.mdx", title: "Visible" }],
    }).pages,
  ).toHaveLength(1);
});
