import { defineDocsConfig } from "honoxpress";

/** Copy to app/docs.config.ts and adjust these values for your site. */
const docsSite = defineDocsConfig({
  name: "Your project",
  defaultLocale: "en",
  homeHref: "/",
  docsHref: "/docs/getting-started",
  repositoryHref: "https://github.com/your-org/your-project",
  stylesheetHref: "/style.css",
  themeSwitch: true,
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
});

export default docsSite;
