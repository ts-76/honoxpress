import type { Child } from "hono/jsx";
import type { DocsPage, LocaleLink } from "honoxpress";
import { DocsNavigation, LanguageLinks, TableOfContents } from "./docs-ui";

export interface DocsLayoutLabels {
  readonly nav: string;
  readonly toc: string;
  readonly skip: string;
}

/** Site-specific labels and links for the consumer-owned documentation layout. */
export interface DocsSiteConfig {
  readonly name: string;
  readonly homeHref?: string;
  readonly repositoryHref?: string;
  readonly stylesheetHref?: string;
  readonly localeLabels: Readonly<Record<string, string>>;
  readonly labels?: Readonly<Record<string, Partial<DocsLayoutLabels>>>;
  readonly footer?: string;
}

export interface DocsLayoutProps {
  readonly children: Child;
  readonly current?: DocsPage;
  readonly pages: readonly DocsPage[];
  readonly translations: readonly LocaleLink[];
  readonly locale: string;
  readonly clientSrc?: string;
  readonly config: DocsSiteConfig;
}

const defaultLabels: Readonly<Record<string, DocsLayoutLabels>> = {
  en: { nav: "Documentation", toc: "On this page", skip: "Skip to content" },
  ja: { nav: "ドキュメント", toc: "このページの内容", skip: "本文へ移動" },
};

/**
 * A complete, editable Hono JSX document shell. Copy this file and docs-ui.tsx
 * into app/components, then pass the consumer's catalog data and site config.
 */
export function DocsLayout({
  children,
  current,
  pages,
  translations,
  locale,
  clientSrc,
  config,
}: DocsLayoutProps) {
  const homeHref = config.homeHref ?? "/";
  const stylesheetHref = config.stylesheetHref ?? "/style.css";
  const labels = {
    ...defaultLabels[locale],
    ...config.labels?.[locale],
  };
  const navLabel = labels.nav ?? "Documentation";
  const tocLabel = labels.toc ?? "On this page";
  const skipLabel = labels.skip ?? "Skip to content";
  const isDocsPage = current !== undefined;

  return (
    <html lang={locale}>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{current ? `${current.title} · ${config.name}` : config.name}</title>
        {current?.description && <meta name="description" content={current.description} />}
        <link rel="stylesheet" href={stylesheetHref} />
        {isDocsPage && clientSrc && <script type="module" src={clientSrc} />}
      </head>
      <body>
        <a class="skip-link" href="#main-content">
          {skipLabel}
        </a>
        <header class="site-header">
          <div class="header-inner">
            <a class="brand" href={homeHref}>
              <span class="brand-mark" aria-hidden="true">
                {config.name.slice(0, 1).toUpperCase()}
              </span>
              {config.name}
            </a>
            <span class="header-label">{navLabel}</span>
            <div class="header-right">
              {config.repositoryHref && (
                <a class="repo-link" href={config.repositoryHref}>
                  GitHub <span aria-hidden="true">↗</span>
                </a>
              )}
              <LanguageLinks links={translations} locale={locale} labels={config.localeLabels} />
              {current && (
                <details class="mobile-nav">
                  <summary>{locale === "ja" ? "メニュー" : "Menu"}</summary>
                  <DocsNavigation pages={pages} pathname={current.href} label={navLabel} />
                </details>
              )}
            </div>
          </div>
        </header>
        {current ? (
          <div class="docs-layout">
            <aside class="docs-sidebar">
              <DocsNavigation pages={pages} pathname={current.href} label={navLabel} />
            </aside>
            <main id="main-content" class="docs-main" tabIndex={-1}>
              <nav class="breadcrumbs" aria-label={navLabel}>
                <a href={homeHref}>{navLabel}</a>
                <span aria-hidden="true">/</span>
                <span>{current.title}</span>
              </nav>
              <details class="mobile-toc">
                <summary>{tocLabel}</summary>
                <TableOfContents headings={current.headings} label={tocLabel} />
              </details>
              <article class="prose">{children}</article>
              {config.footer && <footer class="page-footer">{config.footer}</footer>}
            </main>
            <aside class="toc-rail">
              <TableOfContents headings={current.headings} label={tocLabel} />
            </aside>
          </div>
        ) : (
          <main id="main-content" class="home-main prose" tabIndex={-1}>
            {children}
            {config.footer && <footer class="page-footer">{config.footer}</footer>}
          </main>
        )}
      </body>
    </html>
  );
}
