import { createDocsCatalogFromPages } from "./catalog.js";
import type { DocsPageInput } from "./catalog.js";
import type { DocsSiteConfig } from "./site-config.js";

/** The public metadata exports of a Void Hono Markdown module. */
export interface VoidDocsModule {
  readonly frontmatter: Omit<DocsPageInput, "headings" | "route">;
  readonly headings: readonly {
    readonly depth: number;
    readonly text: string;
    readonly slug: string;
  }[];
}

/** Preserve explicit route identity; convert only Void's heading slug to an id. */
export function createVoidDocsCatalog(
  modules: Readonly<Record<string, VoidDocsModule>>,
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
