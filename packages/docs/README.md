# honoxpress

Documentation metadata, build helpers, and an editable Hono JSX component system for HonoX/MDX and Void/Hono Markdown.

Use HonoX's file-based routes to build navigation, tables of contents, and language links. Your application owns its routes, renderer, islands, and CSS, so you can adapt the documentation to your existing app.

[Component system](https://github.com/ts-76/honoxpress/blob/main/docs/components.md) · [Integration guide](https://github.com/ts-76/honoxpress/blob/main/docs/api.md) · [Example app](https://github.com/ts-76/honoxpress/tree/main/examples/poc) · [Releases](https://github.com/ts-76/honoxpress/releases) · [Issues](https://github.com/ts-76/honoxpress/issues) · [MIT](https://github.com/ts-76/honoxpress/blob/main/LICENSE)

## Void support (since 0.5.0)

The Void starter adds `honoxpress init --framework void --starter`, editable
Markdown wrappers, a docs frame, and a metadata bridge at `honoxpress/void`.
It supports `void-plugin-hono-jsx >=0.3.0 <0.7.0`; new Void starters use `^0.6.0`.

Create an empty target directory and initialize it with `pnpm dlx honoxpress@latest init --framework void --starter --cwd /path/to/new-docs`. Install dependencies in the generated directory.
See the [Void guide](https://github.com/ts-76/honoxpress/blob/main/docs/void.md) for setup and supported behavior.

## Install

```sh
pnpm add honoxpress hono
```

The package is ESM. Node.js engines are `^22.20.0 || ^24.12.0 || >=26.0.0`; the Hono peer dependency is `^4.13.12`. HonoX, Vite Plus, MDX, and SSG adapters are application dependencies. See the [compatibility guide](https://github.com/ts-76/honoxpress/blob/main/docs/compatibility.md) for tested versions.

The package includes the component installer, runnable starter,
syntax-highlighting helpers, component-local static CSS, framework integration
primitives and the parser-neutral Markdown component renderer. See the
[component guide](https://github.com/ts-76/honoxpress/blob/main/docs/components.md#start-a-new-site)
for setup and the [framework guide](https://github.com/ts-76/honoxpress/blob/main/docs/framework-integration.md)
for the new integration boundaries.

## Runtime API

```ts
import { createDocsCatalog } from "honoxpress";

const docs = createDocsCatalog({
  locales: ["en", "ja"],
  defaultLocale: "en",
  entries: [
    { route: "docs/getting-started.mdx", title: "Getting started", order: 1 },
    { route: "ja/docs/getting-started.mdx", title: "はじめに", order: 1 },
  ],
});

docs.page("/docs/getting-started")?.title; // "Getting started"
docs.navigation("ja").map((page) => page.href); // ["/ja/docs/getting-started"]
docs.translations("/docs/getting-started");
// [{ locale: "en", href: "/docs/getting-started" },
//  { locale: "ja", href: "/ja/docs/getting-started" }]
```

This example supplies metadata directly. For an MDX application, `docsMetadataPlugin` generates the catalog from route exports; use that catalog instead of maintaining a second list by hand.

| Export                                                | Purpose                                                                                          |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `createDocsCatalog(options)`                          | Validate metadata and build an immutable page catalog                                            |
| `createDocsCatalogFromPages(options)` (since 0.4.0)   | Build a catalog from explicit locale/slug/href metadata, without HonoX file paths                |
| `componentClass` (since 0.4.0)                        | Compose stable classes while preserving Hono SSR callbacks and DOM CSS registration              |
| `defineDocsConfig(config)`                            | Validate the app-owned site's default language and language labels                               |
| `resolveDocsLocale(pathname, config)`                 | Resolve a full locale path segment, falling back to the configured default                       |
| `DocsSiteConfig`, `DocsLayoutLabels`                  | Shared types for site identity, links, languages, layout labels, and theme controls              |
| `resolveClientScript(manifest, entry)`                | Resolve a client script URL from its production build manifest; fail on missing or unsafe assets |
| `DocsEntry`, `DocsPage`, `DocsOptions`, `DocsCatalog` | Types for catalog inputs, pages, options, and queries                                            |
| `Heading`, `LocaleLink`, `ClientManifest`             | Types for headings, optional translation links, and client manifests                             |

The runtime entry contains no Node API or MDX compiler.

The `honoxpress/markdown` subpath (since 0.4.0) exports `createDocsMarkdownRenderer`
and its component/attribute/content/options types. Host parsers pass a component
name, literal string/boolean attributes and already parsed Hono JSX children;
the app's registry selects a static wrapper or an explicit host island adapter.
The subpath imports no parser or client runtime. Complex data stays in local TSX
wrappers. See [Markdown-first authoring](https://github.com/ts-76/honoxpress/blob/main/docs/markdown.md)
for the `.md` example and customization-preserving adoption. The
[Void guide](https://github.com/ts-76/honoxpress/blob/main/docs/void.md) covers the standard starter. Existing HonoX/MDX setup remains supported.

Since 0.4.0, the copied templates also expose a body-only `DocsFrame`, a router-link
adapter and idempotent theme initialization/synchronization. Existing HonoX APIs
remain supported. See the [framework integration guide](https://github.com/ts-76/honoxpress/blob/main/docs/framework-integration.md)
for API boundaries, host-renderer requirements and manual template upgrade steps.

The generated starter reads site settings from `app/docs.config.ts` for Vite, docs SSG, rendering, home links, and 404 pages. Use `defineDocsConfig({ name, defaultLocale, localeLabels, ... })` there; `localeLabels` keys are the supported languages. The default language has unprefixed `/docs/*` URLs, while other languages use `/<locale>/docs/*`. `docsHref` selects the default-language entry page. Changing the default requires placing authored content in the corresponding directories, but no separate build/renderer language constants need editing. See the [configuration guide](https://github.com/ts-76/honoxpress/blob/main/docs/components.md#layout-and-site-configuration).

## Routes and frontmatter

Place trusted local MDX in standard HonoX `app/routes`. With `defaultLocale: "en"`:

| Route relative to `app/routes` | URL                        |
| ------------------------------ | -------------------------- |
| `docs/index.mdx`               | `/docs`                    |
| `docs/getting-started.mdx`     | `/docs/getting-started`    |
| `ja/docs/getting-started.mdx`  | `/ja/docs/getting-started` |

```mdx
---
title: Getting started
description: Install the package and create your first page.
order: 1
---

# Getting started

## Installation

Write your documentation here.
```

`title` is required; `description` and numeric `order` are optional. Identity comes from the route path, not a frontmatter `id`. Navigation sorts by `order` (default `0`), then URL. Translations share the same relative slug; an unavailable translation has no `href`.

Nested paths and Unicode filenames are supported. In a renderer, use `new URL(c.req.url).pathname` for catalog lookups and the resolved page's `href` for current-page navigation. Malformed or double-encoded paths do not create a page. Discovery follows HonoX exclusions: `_`, `-`, and `$` filenames and `-`/dot directories are excluded; underscore directories remain valid. Invalid metadata, duplicate URLs, and duplicate supplied heading anchors fail early. Titles are plain text and must be escaped when rendered.

## Build integration

Import build helpers from `honoxpress/build` in your Vite/build configuration.

| Export                                                   | Purpose                                                                                |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `docsMetadataPlugin(options)`                            | Discover MDX frontmatter/TOC and expose `virtual:honoxpress/catalog`                   |
| `remarkDocsHeadings`                                     | Generate heading anchors and a named `toc` export during MDX compilation               |
| `remarkDocsCode`                                         | Highlight language-labelled fences and static CodeBlock samples during MDX compilation |
| `highlightDocsCode(code, language)`                      | Prepare serializable syntax tokens on the build/server side                            |
| `remarkDocsComponents(options)`                          | Validate MDX component tags against the application's shared registry                  |
| `docsOnlyPlugin(options, report?)`                       | Filter Hono SSG requests to documentation routes before execution                      |
| `DocsBuildOptions`, `DocsComponentsOptions`, `SSGReport` | Types for plugin options and route/component reporting                                 |

Register the metadata plugin before HonoX. Register `remarkDocsHeadings` after the frontmatter plugins in `@mdx-js/rollup`. The `worker` option is a required boolean:

```ts
docsMetadataPlugin({
  locales: Object.keys(docsSite.localeLabels),
  defaultLocale: docsSite.defaultLocale,
  worker: mode === "worker",
});
```

Here `docsSite` is the default export of your `app/docs.config.ts`; use the same values in `docsOnlyPlugin` and your renderer.

Development and SSG discover route metadata. Worker mode returns an empty catalog without reading or importing MDX. **HonoX's default eager router still imports MDX bodies:** to exclude them from the Worker, use `honox/server/base` with literal globs selecting only dynamic routes and layouts. The SSG filter does not remove Worker imports.

Build client → docs SSG → Worker, preserving the client manifest until rendering completes. `docsOnlyPlugin({ locales, defaultLocale }, report)` goes before Hono SSG's `defaultPlugin()` and skips non-documentation and colon/wildcard routes before making requests. Clear stale output at the start of the pipeline and preserve earlier outputs during subsequent stages.

Heading anchors use static Markdown text, Unicode normalization, lowercase letters, and hyphens for whitespace, with suffixes for collisions. MDX expressions are not evaluated for heading text; expression-only headings fail. This is a package-specific algorithm, not a guarantee of GitHub slug compatibility.

For the tested HonoX 0.1.61 / Vite Plus 1.0.0 setup, also copy the example's [watch adapter](https://github.com/ts-76/honoxpress/blob/main/examples/poc/build/honox-watch.ts) to register an absolute `app` directory for route additions/removals. The [integration guide](https://github.com/ts-76/honoxpress/blob/main/docs/api.md) connects these pieces, including the virtual module declaration, renderer, manifest handling, and Worker entry.

## Components and starter

The [component system guide](https://github.com/ts-76/honoxpress/blob/main/docs/components.md) documents the shared MDX registry, all built-in component props, the site layout and configuration, CLI commands, and the runnable HonoX starter. In MDX, register components once and use tags such as `<Callout>`, `<Cards>`, `<Tabs>`, `<CodeBlock>`, `<FileTree>`, `<TypeTable>`, `<CodeGroup>`, `<Figure>`, `<DefinitionList>`, `<APIReference>`, and `<ThemeSwitch>` without per-page imports.

Installed JSX, island, and CSS files belong to the application and can be edited directly. For existing installations, follow the [template upgrade guide](https://github.com/ts-76/honoxpress/blob/main/docs/upgrading-owned-templates.md) to merge responsive fixes without overwriting your customizations. Keep interactive islands under `app/islands` so HonoX discovers and hydrates them. The default public `style.css` imports `components.css`, which imports `tokens.css`. The layout includes a persistent Light / Dark / System selector, and DemoFrame supports aspect ratios, fixed heights, separate embed/open URLs, and fullscreen permission. The shared tokens define reading typography, cool neutral surfaces based on #F9FAFB, and semantic spacing roles; retain both imports to use the standard styles. Nimbus and Fumapress informed the independently implemented layout hierarchy and component patterns; no upstream source or assets were copied. Preserve the MIT notice when distributing copied templates.

Static components carry their defaults in their TSX sources through `hono/css`.
The copied `DocsLayout` includes `<Style nonce={nonce} />` before the stylesheet;
add the same element once to a custom layout. Stable classes and shared tokens
remain available for customization. Public stylesheets still provide shell,
Markdown, and interactive styles. Updating application-owned templates requires
a manual merge; see the [static-style migration guide](https://github.com/ts-76/honoxpress/blob/main/docs/migrating-static-component-styles.md).

## Scope and compatibility

honoxpress is a 0.x library for trusted local MDX. It supplies metadata, build helpers, and editable templates; applications configure routing, rendering, and deployment. It does not include search, drafts, a CMS, hosting, or a React runtime. Navigation uses ordinary document loads, so island state resets between pages.

Repository CI validates Node.js 22.23.3, 24.12.0, and 24.21.0, including installation of a packed tarball in an independent application. Node.js 26, other operating systems/browsers, and production Cloudflare deployment are unverified. Browser checks cover representative UI behavior rather than a complete accessibility certification. Pin your package version and review the [changelog](https://github.com/ts-76/honoxpress/blob/main/CHANGELOG.md) when upgrading.

Report bugs with package/toolchain versions, reproduction steps, the affected URL, and the failing dev/SSG/Worker stage in [GitHub Issues](https://github.com/ts-76/honoxpress/issues). Compatibility and template migration follow the [maintenance policy](https://github.com/ts-76/honoxpress/blob/main/docs/maintenance.md). Development and verification instructions are in [CONTRIBUTING](https://github.com/ts-76/honoxpress/blob/main/CONTRIBUTING.md).

## License and acknowledgements

MIT © 2026 ts-76. The distribution includes `LICENSE`.

Thank you to [Cloudflare Nimbus](https://github.com/cloudflare/nimbus) for its reading width, typography, spacing, and navigation hierarchy, and [Fumapress](https://github.com/fuma-nama/fumapress) for its current-page accent, code actions, and mobile TOC. The templates' JSX, CSS, and icons were independently written; no upstream code or assets were copied.

## Host adapters

The parser-neutral catalog mapper is available as `honoxpress/adapters/hono-markdown`.
`honoxpress/adapters/void` and the existing `honoxpress/void` entry share the same
implementation. Framework presets select the CLI integration files; existing
HonoX/MDX APIs and application-owned components remain supported.
