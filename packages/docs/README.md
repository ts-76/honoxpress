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

## Build-only entry

`@honox-docs-poc/docs/build` exports `docsMetadataPlugin`, `remarkDocsHeadings`, and `docsOnlyPlugin`. Import them only in Vite/build configuration. The runtime entry exports no Node API or MDX compiler. The package does not own the build pipeline, router, renderer or server.

Use `docsMetadataPlugin({locales: ["en", "ja"], defaultLocale: "en", worker: mode === "worker"})` before HonoX and register `remarkDocsHeadings` after the frontmatter plugins in `@mdx-js/rollup`. Dev/SSG discover local standard MDX routes and expose their frontmatter/TOC through `virtual:honox-docs/catalog`. Worker mode returns an empty catalog without reading or importing docs. **A Worker using HonoX's default eager router will still import MDX:** consumers must supply literal dynamic route globs via `honox/server/base`, as in the example.

The remark plugin adds deterministic Unicode heading anchors and a `toc` named export, avoids duplicate/suffixed collisions, and does not evaluate MDX expressions for heading text. Expression-only headings fail; the slug algorithm is this package's small documented algorithm, not GitHub-slugger compatibility.

Pass `docsOnlyPlugin({locales, defaultLocale}, report)` before `defaultPlugin()` to Hono SSG. It rejects `/demo/*` and colon/wildcard discovery before request execution. Client→SSG→Worker remains an explicit consumer pipeline. `resolveClientScript(manifest, "app/client.ts")` fails on missing/unsafe assets; use the ordinary dev client URL during development. Consumers copy CSS/assets and remove public build metadata after all stages. See `examples/poc/vite.config.ts` and its `_renderer.tsx` for the full integration.
