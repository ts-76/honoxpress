import { resolveClientScript } from "honoxpress";
import { jsxRenderer } from "hono/jsx-renderer";
import { docsCatalog } from "../docs-catalog";
import { DocsLayout } from "../components/docs-layout";
import docsSite from "../docs.config";

const manifests = import.meta.glob<{ default: Record<string, { file: string }> }>(
  "/dist/public/.vite/manifest.json",
  { eager: true },
);
const manifest = Object.values(manifests)[0]?.default;

export default jsxRenderer(({ children }, c) => {
  const pathname = new URL(c.req.url).pathname;
  const locale = pathname.startsWith("/ja/") ? "ja" : "en";
  const current = docsCatalog.page(pathname);
  const production = import.meta.env.PROD || import.meta.env.MODE === "ssg";
  const clientSrc = current
    ? production
      ? resolveClientScript(manifest, "app/client.ts")
      : "/app/client.ts"
    : undefined;
  return (
    <DocsLayout
      config={docsSite}
      current={current}
      pages={docsCatalog.navigation(locale)}
      translations={
        current
          ? docsCatalog.translations(pathname)
          : [
              { locale: "en", href: "/docs/getting-started" },
              { locale: "ja", href: "/ja/docs/getting-started" },
            ]
      }
      locale={locale}
      clientSrc={clientSrc}
    >
      {children}
    </DocsLayout>
  );
});
