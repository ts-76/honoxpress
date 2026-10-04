import type { DocsSiteConfig } from "./components/docs-layout";

export default {
  name: "honoxpress",
  homeHref: "/",
  repositoryHref: "https://github.com/ts-76/honoxpress",
  stylesheetHref: "/style.css",
  localeLabels: { en: "EN", ja: "日本語" },
  footer: "honoxpress / Documentation you own",
} satisfies DocsSiteConfig;
