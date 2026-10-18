import { useEffect, type Child } from "hono/jsx";
import { Link, useRouter } from "void-plugin-hono-jsx/pages";
import { ThemeSwitch } from "@components/theme-switch";
import { SsrStyles } from "../integration/style-host";
import { copy, type Locale } from "../integration/site";
import "../.generated/shared/docs.css";
import "../integration/pilot.css";

export default function Layout({ children }: { children: Child }) {
  const path = useRouter().path.split("?")[0];
  const locale: Locale = path.startsWith("/ja") ? "ja" : "en";
  const reference = path.endsWith("/reference");
  const t = copy[locale];
  useEffect(() => {
    if (!__HX_BASELINE__) document.dispatchEvent(new Event("hx-pilot:render"));
    document.querySelectorAll<HTMLDetailsElement>(".mobile-nav[open]").forEach((menu) => {
      menu.open = false;
    });
  }, [path]);
  const nav = (
    <nav class="docs-nav" aria-label={t.nav}>
      <p class="nav-caption">{t.nav}</p>
      <ul>
        <li>
          <Link
            data-testid="overview-link"
            href={`/${locale}`}
            aria-current={!reference ? "page" : undefined}
          >
            {t.overview}
          </Link>
        </li>
        <li>
          <Link
            data-testid="reference-link"
            href={`/${locale}/reference`}
            aria-current={reference ? "page" : undefined}
          >
            {t.reference}
          </Link>
        </li>
      </ul>
    </nav>
  );
  return (
    <>
      <SsrStyles />
      <a class="skip-link" href="#main-content">
        {t.skip}
      </a>
      <header class="site-header">
        <div class="header-inner">
          <Link class="brand" href={`/${locale}`}>
            <span class="brand-mark" aria-hidden="true">
              H
            </span>
            honoxpress
          </Link>
          <span class="header-label">Void TSX pilot</span>
          <div class="header-right">
            <div class="theme-desktop">
              <ThemeSwitch locale={locale} />
            </div>
            <nav class="language-links" aria-label={locale === "ja" ? "言語" : "Languages"}>
              {(["en", "ja"] as const).map((language) => (
                <Link
                  data-testid={`lang-${language}`}
                  href={`/${language}${reference ? "/reference" : ""}`}
                  lang={language}
                  hrefLang={language}
                  aria-label={language === "en" ? "English" : "日本語"}
                  aria-current={language === locale ? "page" : undefined}
                >
                  {language.toUpperCase()}
                </Link>
              ))}
            </nav>
            <details class="mobile-nav">
              <summary>{t.menu}</summary>
              <div class="mobile-nav-content">
                {nav}
                <div class="mobile-theme">
                  <span>{t.theme}</span>
                  <ThemeSwitch locale={locale} />
                </div>
              </div>
            </details>
          </div>
        </div>
      </header>
      <div class="docs-layout pilot-layout">
        <aside class="docs-sidebar">{nav}</aside>
        <main id="main-content" class="docs-main" tabIndex={-1}>
          <nav class="breadcrumbs" aria-label={t.nav}>
            <Link href={`/${locale}`}>{t.nav}</Link>
            <span aria-hidden="true">/</span>
            <span>{reference ? t.reference : t.overview}</span>
          </nav>
          <article class="prose">{children}</article>
        </main>
      </div>
    </>
  );
}
