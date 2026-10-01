import { resolveClientScript } from "@honox-docs-poc/docs";
import { jsxRenderer } from "hono/jsx-renderer";
import { docsCatalog } from "../docs-catalog";
import { DocsNavigation, TableOfContents, LanguageLinks } from "../components/docs-ui";

const manifests = import.meta.glob<{ default: Record<string, { file: string }> }>(
  "/dist/public/.vite/manifest.json",
  { eager: true },
);
const manifest = Object.values(manifests)[0]?.default;

export default jsxRenderer(({ children, frontmatter }, c) => {
  const ja = c.req.path.startsWith("/ja/");
  const locale = ja ? "ja" : "en";
  const current = docsCatalog.page(c.req.path);
  const docs = Boolean(current);
  const navLabel = ja ? "ドキュメント" : "Documentation";
  const tocLabel = ja ? "このページの内容" : "On this page";
  const pages = docsCatalog.navigation(locale);
  const translations = current
    ? docsCatalog.translations(c.req.path)
    : [
        { locale: "en", href: "/docs/getting-started" },
        { locale: "ja", href: "/ja/docs/getting-started" },
      ];
  const production = import.meta.env.PROD || import.meta.env.MODE === "ssg";
  const clientSrc = docs
    ? production
      ? resolveClientScript(manifest, "app/client.ts")
      : "/app/client.ts"
    : undefined;
  const footer = (
    <footer class="page-footer">
      HonoX Docs <span aria-hidden="true"> / </span>{" "}
      {ja ? "自分で育てるドキュメント" : "Documentation you own"}
      <small>
        {ja ? "UIの参考・謝辞: " : "UI inspiration & thanks: "}
        <a href="https://nimbus-docs.com/philosophy/">Nimbus</a> &amp;{" "}
        <a href="https://press.fumadocs.dev/docs">Fumapress</a>
      </small>
    </footer>
  );
  return (
    <html lang={locale}>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>
          {frontmatter?.title ? `${frontmatter.title} · HonoX Docs PoC` : "HonoX Docs PoC"}
        </title>
        {frontmatter && <meta name="description" content={frontmatter.description} />}
        <link rel="stylesheet" href="/style.css" />
        {docs && <script type="module" src={clientSrc} />}
      </head>
      <body>
        <a class="skip-link" href="#main-content">
          {ja ? "本文へ移動" : "Skip to content"}
        </a>
        <header class="site-header">
          <div class="header-inner">
            <a class="brand" href="/">
              <span class="brand-mark" aria-hidden="true">
                H
              </span>
              HonoX Docs
            </a>
            <span class="header-label">{navLabel}</span>
            <div class="header-right">
              <a class="repo-link" href="https://github.com/ts-76/honox-docs-poc">
                GitHub <span aria-hidden="true">↗</span>
              </a>
              <LanguageLinks
                links={translations}
                locale={locale}
                labels={{ en: "EN", ja: "日本語" }}
              />
              {docs && (
                <details class="mobile-nav">
                  <summary>{ja ? "メニュー" : "Menu"}</summary>
                  <DocsNavigation pages={pages} pathname={c.req.path} label={navLabel} />
                </details>
              )}
            </div>
          </div>
        </header>
        {current ? (
          <div class="docs-layout">
            <aside class="docs-sidebar">
              <DocsNavigation pages={pages} pathname={c.req.path} label={navLabel} />
              <p class="sidebar-note">
                {ja
                  ? "Hono JSXとMDXで書く、軽やかなドキュメント。"
                  : "A small foundation for thoughtful documentation."}
              </p>
            </aside>
            <main id="main-content" class="docs-main" tabIndex={-1}>
              <nav class="breadcrumbs" aria-label="Breadcrumb">
                <a href="/">{navLabel}</a>
                <span aria-hidden="true">/</span>
                <span>{current.title}</span>
              </nav>
              <details class="mobile-toc">
                <summary>{tocLabel}</summary>
                <TableOfContents headings={current.headings} label={tocLabel} />
              </details>
              <article class="prose">{children}</article>
              {footer}
            </main>
            <aside class="toc-rail">
              <TableOfContents headings={current.headings} label={tocLabel} />
            </aside>
          </div>
        ) : (
          <main id="main-content" class="home-main prose" tabIndex={-1}>
            {children}
            {footer}
          </main>
        )}
      </body>
    </html>
  );
});
