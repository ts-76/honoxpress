import type { DocsSiteConfig } from "honoxpress/templates/docs-layout.tsx";

/** Copy to app/docs.config.ts and adjust these values for your site. */
const docsSite = {
  name: "Your project",
  homeHref: "/",
  repositoryHref: "https://github.com/your-org/your-project",
  stylesheetHref: "/style.css",
  localeLabels: {
    en: "English",
    ja: "日本語",
  },
  labels: {
    en: {
      nav: "Documentation",
      toc: "On this page",
      skip: "Skip to content",
    },
    ja: {
      nav: "ドキュメント",
      toc: "このページの内容",
      skip: "本文へ移動",
    },
  },
  footer: "Documentation maintained by your team.",
} satisfies DocsSiteConfig;

export default docsSite;
