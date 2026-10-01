import { createDocsCatalog } from "@honox-docs-poc/docs";

// Caller-owned metadata while the build-only MDX adapter is introduced in #2.
export const docsCatalog = createDocsCatalog({
  locales: ["en", "ja"],
  defaultLocale: "en",
  entries: [
    { route: "docs/getting-started.mdx", title: "Getting started" },
    { route: "ja/docs/getting-started.mdx", title: "はじめに" },
  ],
});
