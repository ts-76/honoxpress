# honoxpress

Documentation metadata, build helpers, and editable UI templates for Hono JSX and MDX.

Use HonoX's file-based routes to build navigation, tables of contents, and language links. Your application owns its routes, renderer, islands, and CSS, so you can adapt the documentation to your existing app.

[Integration guide](https://github.com/ts-76/honoxpress/blob/main/docs/api.md) · [Example app](https://github.com/ts-76/honoxpress/tree/main/examples/poc) · [Releases](https://github.com/ts-76/honoxpress/releases) · [Issues](https://github.com/ts-76/honoxpress/issues) · [MIT](https://github.com/ts-76/honoxpress/blob/main/LICENSE)

## Install

```sh
pnpm add honoxpress hono
```

The package is ESM. Node.js engines are `^22.20.0 || ^24.12.0 || >=26.0.0`; the Hono peer dependency is `^4.13.12`. HonoX, Vite Plus, MDX, and SSG adapters are application dependencies. See the [compatibility guide](https://github.com/ts-76/honoxpress/blob/main/docs/compatibility.md) for tested versions.

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
| `resolveClientScript(manifest, entry)`                | Resolve a client script URL from its production build manifest; fail on missing or unsafe assets |
| `DocsEntry`, `DocsPage`, `DocsOptions`, `DocsCatalog` | Types for catalog inputs, pages, options, and queries                                            |
| `Heading`, `LocaleLink`, `ClientManifest`             | Types for headings, optional translation links, and client manifests                             |

The runtime entry contains no Node API or MDX compiler.

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

| Export                             | Purpose                                                                  |
| ---------------------------------- | ------------------------------------------------------------------------ |
| `docsMetadataPlugin(options)`      | Discover MDX frontmatter/TOC and expose `virtual:honoxpress/catalog`     |
| `remarkDocsHeadings`               | Generate heading anchors and a named `toc` export during MDX compilation |
| `docsOnlyPlugin(options, report?)` | Filter Hono SSG requests to documentation routes before execution        |
| `DocsBuildOptions`, `SSGReport`    | Types for plugin options and accepted/skipped route reporting            |

Register the metadata plugin before HonoX. Register `remarkDocsHeadings` after the frontmatter plugins in `@mdx-js/rollup`. The `worker` option is a required boolean:

```ts
docsMetadataPlugin({
  locales: ["en", "ja"],
  defaultLocale: "en",
  worker: mode === "worker",
});
```

Development and SSG discover route metadata. Worker mode returns an empty catalog without reading or importing MDX. **HonoX's default eager router still imports MDX bodies:** to exclude them from the Worker, use `honox/server/base` with literal globs selecting only dynamic routes and layouts. The SSG filter does not remove Worker imports.

Build client → docs SSG → Worker, preserving the client manifest until rendering completes. `docsOnlyPlugin({ locales, defaultLocale }, report)` goes before Hono SSG's `defaultPlugin()` and skips non-documentation and colon/wildcard routes before making requests. Clear stale output at the start of the pipeline and preserve earlier outputs during subsequent stages.

Heading anchors use static Markdown text, Unicode normalization, lowercase letters, and hyphens for whitespace, with suffixes for collisions. MDX expressions are not evaluated for heading text; expression-only headings fail. This is a package-specific algorithm, not a guarantee of GitHub slug compatibility.

For the tested HonoX 0.1.61 / Vite Plus 1.0.0 setup, also copy the example's [watch adapter](https://github.com/ts-76/honoxpress/blob/main/examples/poc/build/honox-watch.ts) to register an absolute `app` directory for route additions/removals. The [integration guide](https://github.com/ts-76/honoxpress/blob/main/docs/api.md) connects these pieces, including the virtual module declaration, renderer, manifest handling, and Worker entry.

## Copy and customize the UI

Templates are exported as files through `honoxpress/templates/*`. Resolve them with `import.meta.resolve`, then copy them into your application:

| Template         | Destination                     |
| ---------------- | ------------------------------- |
| `docs-ui.tsx`    | `app/components/docs-ui.tsx`    |
| `copy-code.tsx`  | **`app/islands/copy-code.tsx`** |
| `demo-frame.tsx` | `app/components/demo-frame.tsx` |
| `docs.css`       | Your public stylesheet          |

The [copy example](https://github.com/ts-76/honoxpress/blob/main/docs/api.md#copy-and-customize-the-ui) uses Node's file APIs. Importing the island directly from the package does not register a consumer HonoX island route.

The UI includes responsive navigation and TOC disclosures, landmarks, a skip link, visible keyboard focus, copy success/failure feedback, system fonts, color-scheme tokens, and reduced-motion styles. Edit links, wording, components, and styles in your own files. Keep the bundled MIT copyright and permission notice in distributed copies. Template updates are manual: review and merge changes into your owned files.

## Scope and compatibility

honoxpress is a 0.x library for trusted local MDX. It supplies metadata, build helpers, and templates; applications configure routing, rendering, and deployment. It does not include search, drafts, a CMS, a project generator, or a React runtime. Navigation uses ordinary document loads, so island state resets between pages.

Repository CI validates Node.js 22.23.3, 24.12.0, and 24.21.0, including installation of a packed tarball in an independent application. Node.js 26, other operating systems/browsers, and production Cloudflare deployment are unverified. Browser checks cover representative UI behavior rather than a complete accessibility certification. Pin your package version and review the [changelog](https://github.com/ts-76/honoxpress/blob/main/CHANGELOG.md) when upgrading.

Report bugs with package/toolchain versions, reproduction steps, the affected URL, and the failing dev/SSG/Worker stage in [GitHub Issues](https://github.com/ts-76/honoxpress/issues). Development and verification instructions are in [CONTRIBUTING](https://github.com/ts-76/honoxpress/blob/main/CONTRIBUTING.md).

## License and acknowledgements

MIT © 2026 ts-76. The distribution includes `LICENSE`.

Thank you to [Cloudflare Nimbus](https://github.com/cloudflare/nimbus) for its reading width, typography, spacing, and navigation hierarchy, and [Fumapress](https://github.com/fuma-nama/fumapress) for its current-page accent, code actions, and mobile TOC. The templates' JSX, CSS, and icons were independently written; no upstream code or assets were copied.
