export interface DocsLayoutLabels {
  readonly nav: string;
  readonly toc: string;
  readonly skip: string;
}

/** One source for the documentation site's presentation and language settings. */
export interface DocsSiteConfig {
  readonly name: string;
  readonly defaultLocale: string;
  readonly localeLabels: Readonly<Record<string, string>>;
  readonly homeHref?: string;
  /** Default-language documentation entry, without a locale prefix. */
  readonly docsHref?: string;
  readonly repositoryHref?: string;
  readonly stylesheetHref?: string;
  readonly labels?: Readonly<Record<string, Partial<DocsLayoutLabels>>>;
  readonly footer?: string;
  /** Enable the Light / Dark / System control (default true). */
  readonly themeSwitch?: boolean;
}

/** Validate language settings when the shared config is loaded by Vite or Hono. */
export function defineDocsConfig(config: DocsSiteConfig): DocsSiteConfig {
  const locales = Object.keys(config.localeLabels);
  if (
    !locales.length ||
    locales.some((locale) => !/^[a-z][a-z0-9-]*$/.test(locale)) ||
    !locales.includes(config.defaultLocale)
  )
    throw new Error("docs.config.ts: use valid localeLabels codes and an included defaultLocale");
  if (
    Object.values(config.localeLabels).some((label) => typeof label !== "string" || !label.trim())
  )
    throw new Error("docs.config.ts: localeLabels must contain non-empty display labels");
  return config;
}

/** Match whole locale path segments; unprefixed routes use the site's default. */
export function resolveDocsLocale(
  pathname: string,
  config: Pick<DocsSiteConfig, "defaultLocale" | "localeLabels">,
): string {
  return (
    Object.keys(config.localeLabels).find(
      (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
    ) ?? config.defaultLocale
  );
}
