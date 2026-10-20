import { createDocsCatalogFromPages } from "../catalog.js";
import type { DocsPageInput } from "../catalog.js";
import type { DocsSiteConfig } from "../site-config.js";

/** The public metadata exports of a Hono Markdown module. */
export interface HonoMarkdownDocsModule {
  readonly frontmatter: Omit<DocsPageInput, "headings" | "route">;
  readonly headings: readonly {
    readonly depth: number;
    readonly text: string;
    readonly slug: string;
  }[];
}

/** Preserve explicit route identity; convert only the compiler heading slug to an id. */
export function createHonoMarkdownDocsCatalog(
  modules: Readonly<Record<string, HonoMarkdownDocsModule>>,
  config: Pick<DocsSiteConfig, "defaultLocale" | "localeLabels">,
) {
  return createDocsCatalogFromPages({
    locales: Object.keys(config.localeLabels),
    defaultLocale: config.defaultLocale,
    pages: Object.entries(modules).map(([route, { frontmatter, headings }]) => ({
      ...frontmatter,
      route,
      headings: headings.map(({ slug, depth, text }) => ({ id: slug, depth, text })),
    })),
  });
}
