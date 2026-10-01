export interface Heading {
  readonly depth: number;
  readonly text: string;
  readonly id: string;
}
export interface DocsEntry {
  /** Path relative to app/routes. Identity comes from this path, never frontmatter id. */
  readonly route: string;
  readonly title: string;
  readonly description?: string;
  readonly order?: number;
  readonly headings?: readonly Heading[];
}
export interface DocsPage extends DocsEntry {
  readonly locale: string;
  readonly slug: string;
  readonly href: string;
  readonly headings: readonly Heading[];
}
export interface LocaleLink {
  readonly locale: string;
  /** Absent when that translation does not exist. Never synthesize a broken link. */
  readonly href?: string;
}
export interface DocsOptions {
  readonly locales: readonly string[];
  readonly defaultLocale: string;
  readonly entries: readonly DocsEntry[];
}
export interface DocsCatalog {
  readonly pages: readonly DocsPage[];
  page(pathname: string): DocsPage | undefined;
  navigation(locale: string): readonly DocsPage[];
  translations(pathname: string): readonly LocaleLink[];
}

export function createDocsCatalog(options: DocsOptions): DocsCatalog {
  const locales = [...options.locales];
  if (
    !locales.length ||
    new Set(locales).size !== locales.length ||
    locales.some((locale) => !/^[a-z][a-z0-9-]*$/.test(locale)) ||
    !locales.includes(options.defaultLocale)
  )
    throw new Error("Use unique locale codes and an included defaultLocale");
  const seen = new Set<string>();
  const pages = options.entries
    .map((entry): DocsPage => {
      const parts = entry.route.split("/");
      const unprefixed = parts[0] === "docs";
      const locale = unprefixed ? options.defaultLocale : parts.shift();
      if (
        !locale ||
        !locales.includes(locale) ||
        (!unprefixed && locale === options.defaultLocale) ||
        parts.shift() !== "docs"
      )
        throw new Error(`Unsupported docs route: ${entry.route}`);
      const last = parts.pop();
      if (!last?.endsWith(".mdx")) throw new Error(`Expected an MDX route: ${entry.route}`);
      parts.push(last.slice(0, -4));
      if (parts.some((part) => !/^[\p{L}\p{N}_-]+(?:\.[\p{L}\p{N}_-]+)*$/u.test(part)))
        throw new Error(`Unsafe route segment: ${entry.route}`);
      if (parts.at(-1) === "index") parts.pop();
      const slug = parts.map(encodeURIComponent).join("/");
      const href = `${locale === options.defaultLocale ? "" : `/${locale}`}/docs${slug ? `/${slug}` : ""}`;
      if (seen.has(href)) throw new Error(`Duplicate docs URL: ${href}`);
      seen.add(href);
      if (
        typeof entry.title !== "string" ||
        !entry.title.trim() ||
        (entry.description !== undefined && typeof entry.description !== "string") ||
        (entry.order !== undefined && !Number.isFinite(entry.order))
      )
        throw new Error(`Invalid metadata: ${entry.route}`);
      const ids = new Set<string>();
      const headings = (entry.headings ?? []).map((heading) => {
        if (
          !Number.isInteger(heading.depth) ||
          heading.depth < 1 ||
          heading.depth > 6 ||
          !heading.text.trim() ||
          !heading.id ||
          ids.has(heading.id)
        )
          throw new Error(`Invalid or duplicate heading: ${entry.route}`);
        ids.add(heading.id);
        return Object.freeze({ ...heading });
      });
      return Object.freeze({
        ...entry,
        title: entry.title.trim(),
        locale,
        slug,
        href,
        headings: Object.freeze(headings),
      });
    })
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.href.localeCompare(b.href));
  const immutable = Object.freeze(pages);
  const normalize = (pathname: string) => pathname.replace(/\/$/, "");
  const page = (pathname: string) =>
    immutable.find((candidate) => candidate.href === normalize(pathname));
  return Object.freeze({
    pages: immutable,
    page,
    navigation: (locale: string) =>
      Object.freeze(immutable.filter((item) => item.locale === locale)),
    translations: (pathname: string) => {
      const current = page(pathname);
      if (!current) return Object.freeze([]);
      return Object.freeze(
        locales.map((locale) => {
          const counterpart = immutable.find(
            (item) => item.locale === locale && item.slug === current.slug,
          );
          return Object.freeze({ locale, ...(counterpart ? { href: counterpart.href } : {}) });
        }),
      );
    },
  });
}
