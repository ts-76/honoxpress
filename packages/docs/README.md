# Local package evaluation

`@honox-docs-poc/docs` / `0.0.0` is a temporary local evaluation identity.
This package remains private. The final npm name, license, public repository,
and release policy require a user decision. No license grant is implied.

The runtime entry is a pure metadata API. Consumers own standard HonoX
`app/routes`, `_renderer.tsx`, islands and CSS. No router, mounting API, CLI,
runtime MDX compiler, search or draft feature is introduced.

```ts
import { createDocsCatalog } from "@honox-docs-poc/docs";
const docs = createDocsCatalog({
  locales: ["en", "ja"],
  defaultLocale: "en",
  entries: [{ route: "docs/getting-started.mdx", title: "Getting started" }],
});
docs.page("/docs/getting-started");
docs.navigation("en");
docs.translations("/docs/getting-started");
```

Identity comes from the route path; frontmatter `id` is neither required nor
used. Nested paths and `index.mdx` map to standard document URLs. Translations
share a relative slug. Missing translations return a locale with no `href`;
callers can show unavailable text instead of a broken link. Invalid paths,
duplicate URLs, invalid metadata and duplicate heading anchors fail early.
Navigation sorts by optional numeric `order`, then URL. All metadata results
are immutable. Titles remain plain text and rendering must escape them.

Compatibility currently follows the repository's tested HonoX/Vite Plus setup.
Build entry, UI examples and packed external consumer verification follow in
the dependent Issues; this first boundary does not promise an npm release.
