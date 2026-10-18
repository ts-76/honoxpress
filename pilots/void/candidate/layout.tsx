import { useEffect, type Child } from "hono/jsx";
import { Link, useRouter } from "void-plugin-hono-jsx/pages";
import { createDocsCatalogFromPages } from "honoxpress";
import { DocsFrame, type DocsLinkProps } from "@components/docs-layout";
import { syncThemeSwitches } from "@components/theme-switch";
import { SsrStyles } from "../integration/style-host";
import { copy, type Locale } from "../integration/site";
import "../.generated/shared/docs.css";
import "../integration/pilot.css";

const catalog = createDocsCatalogFromPages({
  locales: ["en", "ja"], defaultLocale: "en",
  pages: (["en", "ja"] as const).flatMap((locale) => [
    { locale, slug: "components", href: `/${locale}`, title: copy[locale].overview, route: "pages/[locale]/index.tsx", headings: [
      { depth: 2, id: "cards", text: copy[locale].cards },
      { depth: 2, id: "workflow", text: copy[locale].steps },
      { depth: 2, id: "code", text: copy[locale].code },
    ] },
    { locale, slug: "reference", href: `/${locale}/reference`, title: copy[locale].reference, order: 1, headings: [
      { depth: 2, id: "files", text: copy[locale].files },
      { depth: 2, id: "properties", text: copy[locale].properties },
    ] },
  ]),
});

function RouterLink(props: DocsLinkProps) {
  const testId = props.lang ? `lang-${props.lang}`
    : props.href.endsWith("/reference") ? "reference-link" : "overview-link";
  return <Link {...props} data-testid={testId} />;
}

export default function Layout({ children }: { children: Child }) {
  const path = useRouter().path.split("?")[0];
  const locale: Locale = path.startsWith("/ja") ? "ja" : "en";
  useEffect(() => {
    syncThemeSwitches();
    document.querySelectorAll<HTMLDetailsElement>(".mobile-nav[open]").forEach(menu => { menu.open = false; });
  }, [path]);
  return <>
    <SsrStyles />
    <DocsFrame current={catalog.page(path)} pages={catalog.navigation(locale)} translations={catalog.translations(path)}
      locale={locale} link={RouterLink} config={{ name: "honoxpress", defaultLocale: "en", localeLabels: { en: "EN", ja: "JA" }, homeHref: `/${locale}` }}>
      {children}
    </DocsFrame>
  </>;
}
