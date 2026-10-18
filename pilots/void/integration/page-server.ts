import { defineHandler, defineHead } from "void";
import { copy, type Locale } from "./site";

export function pageServer(section: "overview" | "reference") {
  const loader = defineHandler((c) => {
    const locale = c.req.param("locale");
    if (locale !== "en" && locale !== "ja") return c.notFound();
    return { locale, section };
  });
  const head = defineHead<{ locale: Locale }>((_c, { locale }) => ({
    title: `${copy[locale][section]} · honoxpress`,
    meta: [{ name: "description", content: copy[locale].description }],
    htmlAttrs: { lang: locale },
  }));
  return { loader, head };
}
