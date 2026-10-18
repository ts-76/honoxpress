// Vite creates metadata for dev/SSG; the Worker target gets an empty catalog.
// No runtime compiler or route mounting API is involved.
import { docsCatalog as mdxCatalog } from "virtual:honoxpress/catalog";
import { pages } from "virtual:honoxpress/markdown-fixture";
import { createDocsCatalogFromPages } from "honoxpress";
import docsSite from "./docs.config";

export const docsCatalog = createDocsCatalogFromPages({
  locales: Object.keys(docsSite.localeLabels),
  defaultLocale: docsSite.defaultLocale,
  pages: [...mdxCatalog.pages, ...pages],
});
