import { resolveClientScript, resolveDocsLocale } from "honoxpress";
import { jsxRenderer } from "hono/jsx-renderer";
import docsSite from "../docs.config";
import { docsCatalog } from "../docs-catalog";
import { DocsLayout } from "../components/docs-layout";

const manifests = import.meta.glob<{ default: Record<string, { file: string }> }>(
  "/dist/public/.vite/manifest.json",
  { eager: true },
);
const manifest = Object.values(manifests)[0]?.default;

export default jsxRenderer(({ children }, c) => {
  const pathname = new URL(c.req.url).pathname;
  const current = docsCatalog.page(pathname);
  const locale = current?.locale ?? resolveDocsLocale(pathname, docsSite);
  const pages = docsCatalog.navigation(locale);
  const translations = docsCatalog.translations(
    current?.href ?? docsSite.docsHref ?? pages[0]?.href ?? pathname,
  );
  const clientSrc = current
    ? import.meta.env.PROD || import.meta.env.MODE === "ssg"
      ? resolveClientScript(manifest, "app/client.ts")
      : "/app/client.ts"
    : undefined;

  return (
    <DocsLayout
      config={docsSite}
      current={current}
      pages={pages}
      translations={translations}
      locale={locale}
      clientSrc={clientSrc}
    >
      {children}
    </DocsLayout>
  );
});
