import type { Child } from "hono/jsx";
import { HonoStyles } from "void-plugin-hono-jsx/pages";
import { useFrontmatter, useMarkdownProps } from "void-plugin-hono-jsx/markdown";
import { DocsFrame } from "./components/docs-layout";
import { ThemeScript } from "./components/theme-switch";
import { catalog } from "./docs-catalog";
import docsConfig from "./docs.config";

export default function VoidDocsLayout({ children }: { children: Child }) {
  const page = useFrontmatter<{ locale: string; href: string; interactive?: boolean }>();
  const { nonce } = useMarkdownProps<{ nonce?: string }>();
  // Static pages keep the system palette and need no theme JavaScript.
  const themeSwitch = docsConfig.themeSwitch !== false && page.interactive === true;
  return (
    <>
      <HonoStyles nonce={nonce} />
      {themeSwitch && <ThemeScript nonce={nonce} />}
      <DocsFrame
        current={catalog.page(page.href)}
        pages={catalog.navigation(page.locale)}
        translations={catalog.translations(page.href)}
        locale={page.locale}
        config={{ ...docsConfig, themeSwitch }}
      >
        {children}
      </DocsFrame>
    </>
  );
}
