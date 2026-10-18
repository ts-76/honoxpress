export { createDocsCatalog, createDocsCatalogFromPages } from "./catalog.js";
export { componentClass } from "./component-class.js";
export type {
  DocsEntry,
  DocsPage,
  DocsOptions,
  DocsCatalog,
  Heading,
  LocaleLink,
  DocsPageInput,
  ExplicitDocsOptions,
} from "./catalog.js";

export { resolveClientScript } from "./client.js";
export type { ClientManifest } from "./client.js";
export { defineDocsConfig, resolveDocsLocale } from "./site-config.js";
export type { DocsSiteConfig, DocsLayoutLabels } from "./site-config.js";
