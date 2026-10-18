import type { Child } from "hono/jsx";
import { Style } from "hono/css";
import type { DocsPage, LocaleLink, DocsSiteConfig, DocsLayoutLabels } from "honoxpress";
export type { DocsSiteConfig, DocsLayoutLabels } from "honoxpress";
import { ThemeScript, ThemeSwitch } from "./theme-switch";
import { DocsNavigation, LanguageLinks, TableOfContents, NativeDocsLink } from "./docs-ui";
import type { DocsLinkComponent } from "./docs-ui";
export type { DocsLinkProps, DocsLinkComponent } from "./docs-ui";

export interface DocsLayoutProps {
  readonly children: Child;
  readonly current?: DocsPage;
  readonly pages: readonly DocsPage[];
  readonly translations: readonly LocaleLink[];
  readonly locale: string;
  readonly clientSrc?: string;
  /** Page links only; fragments and external repository links stay native. */
  readonly link?: DocsLinkComponent;
  /** Request-specific CSP nonce for the early theme initializer. */
  readonly nonce?: string;
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
export function DocsLayout(props: DocsLayoutProps) {
  const { current, locale, clientSrc, nonce, config } = props;
  const stylesheetHref = config.stylesheetHref ?? "/style.css";
  return (
    <html lang={locale}>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{current ? `${current.title} · ${config.name}` : config.name}</title>
        {current?.description && <meta name="description" content={current.description} />}
        {config.themeSwitch !== false && <ThemeScript nonce={nonce} />}
        <Style nonce={nonce} />
        <link rel="stylesheet" href={stylesheetHref} />
        {current && clientSrc && <script type="module" src={clientSrc} />}
      </head>
      <body>
        <DocsFrame {...props} />
      </body>
    </html>
  );
}

export type DocsFrameProps = Omit<DocsLayoutProps, "nonce" | "clientSrc">;

/** Body-only frame for frameworks that own the document and head. */
export function DocsFrame({
  children,
  current,
  pages,
  translations,
  locale,
  config,
  link: Link = NativeDocsLink,
}: DocsFrameProps) {
  const homeHref = config.homeHref ?? "/";
  const labels = { ...defaultLabels[locale], ...config.labels?.[locale] };
  const navLabel = labels.nav ?? "Documentation";
  const tocLabel = labels.toc ?? "On this page";
  const skipLabel = labels.skip ?? "Skip to content";
  return (
    <>
      <a class="skip-link" href="#main-content">
        {skipLabel}
      </a>
      <header class="site-header">
        <div class="header-inner">
          <Link class="brand" href={homeHref}>
            <span class="brand-mark" aria-hidden="true">
              {config.name.slice(0, 1).toUpperCase()}
            </span>
            {config.name}
          </Link>
          <span class="header-label">{navLabel}</span>
          <div class="header-right">
            {config.repositoryHref && (
              <a class="repo-link" href={config.repositoryHref}>
                GitHub <span aria-hidden="true">↗</span>
              </a>
            )}
            {config.themeSwitch !== false && (
              <div class={current ? "theme-desktop" : "theme-desktop theme-home"}>
                <ThemeSwitch locale={locale} />
              </div>
            )}
            <LanguageLinks
              links={translations}
              locale={locale}
              labels={config.localeLabels}
              link={Link}
            />
            {current && (
              <details class="mobile-nav">
                <summary>{locale === "ja" ? "メニュー" : "Menu"}</summary>
                <div class="mobile-nav-content">
                  <DocsNavigation
                    pages={pages}
                    pathname={current.href}
                    label={navLabel}
                    link={Link}
                  />
                  {config.themeSwitch !== false && (
                    <div class="mobile-theme">
                      <span>{locale === "ja" ? "テーマ" : "Theme"}</span>
                      <ThemeSwitch locale={locale} />
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      </header>
      {current ? (
        <div class="docs-layout">
          <aside class="docs-sidebar">
            <DocsNavigation pages={pages} pathname={current.href} label={navLabel} link={Link} />
          </aside>
          <main id="main-content" class="docs-main" tabIndex={-1}>
            <nav class="breadcrumbs" aria-label={navLabel}>
              <Link href={homeHref}>{navLabel}</Link>
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
    </>
  );
}
