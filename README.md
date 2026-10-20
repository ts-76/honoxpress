# honoxpress

Documentation metadata, build helpers, and an editable Hono JSX component system for HonoX/MDX and Void/Hono Markdown.

Use HonoX's file-based routes to build navigation, tables of contents, and language links. Your application owns its routes, renderer, islands, and CSS, so you can adapt the documentation to your existing app.

[npm](https://www.npmjs.com/package/honoxpress) · [Component system](docs/components.md) · [Integration guide](docs/api.md) · [Package API](packages/docs/README.md) · [Releases](https://github.com/ts-76/honoxpress/releases) · [MIT License](LICENSE)

![Example documentation page with navigation, a table of contents, language links, code copying, an island, and a live demo.](examples/poc/evidence/screenshots/english.png)

## Features

- **Markdown-first integration (0.4.0)** — A parser-neutral component boundary for static TSX wrappers and explicit host islands, with English/Japanese `.md` examples. Existing HonoX/MDX setup remains supported; Void integration uses its Hono Markdown adapter and the standard starter. See the [authoring guide](docs/markdown.md).

- **Page metadata** — Generate navigation from MDX frontmatter, including titles, descriptions, and display order.
- **Multilingual documentation** — Derive URLs and locales from file paths and connect translations with matching relative slugs. Unavailable translations have no link.
- **Tables of contents and anchors** — Generate a TOC from Markdown headings, with support for Unicode text and duplicate headings.
- **Static docs and dynamic demos** — Build documentation as static pages while keeping demos as dynamic Worker routes.
- **Shared MDX components** — Register reusable callouts, cards, steps, accordions, tabs, code blocks, and demo frames once for every MDX page.
- **Editable layout and starter** — Install consumer-owned navigation, TOC, language links, page layout, components, and styles. A runnable HonoX starter configures the client, docs SSG, and Worker build stages.

honoxpress fits existing HonoX applications and projects that keep their layouts in their own code. It does not include search, a CMS, or hosting.

## Void support (since 0.5.0)

The Void starter adds `honoxpress init --framework void --starter`, editable
Markdown wrappers, a docs frame, and a metadata bridge at `honoxpress/void`.
It uses `void-plugin-hono-jsx >=0.3.0 <0.6.0`.
See the [Void guide](docs/void.md) for setup and supported behavior.

## Install and try the API

```sh
pnpm add honoxpress hono
```

The package is ESM. Node.js engines are `^22.20.0 || ^24.12.0 || >=26.0.0`; the Hono peer dependency is `^4.13.12`. HonoX and MDX build dependencies belong to your application.

The package includes `honoxpress init`, `honoxpress add`, and a runnable starter. To create a new site with this release, run `pnpm dlx honoxpress@0.5.0 init --starter --cwd /path/to/new-docs`, then install dependencies in the generated directory. The [component guide](docs/components.md#start-a-new-site) also covers local tarball development.

`createDocsCatalog` turns page metadata into URLs, navigation, and translation links:

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

This example supplies metadata directly. In a HonoX application, the build plugin generates the catalog from MDX, so you do not need to maintain a second page list. See the [integration guide](docs/api.md) for plugin and renderer setup.

## Run the example

[examples/poc](examples/poc) is a HonoX application with English and Japanese MDX, islands, code copying, and a dynamic demo. Using Node.js 24.12.0 and pnpm 11.22.0:

```sh
git clone https://github.com/ts-76/honoxpress.git
cd honoxpress
pnpm install --frozen-lockfile
pnpm build:package
pnpm dev
```

Open [http://127.0.0.1:5173/docs/getting-started](http://127.0.0.1:5173/docs/getting-started) for English or `/ja/docs/getting-started` for Japanese. The example development server uses port 5173.

```sh
pnpm build
pnpm preview
```

The build runs **client → docs SSG → Worker**. Local production preview uses Cloudflare tooling; install it with `npm install --global cf@1.0.0-beta.6` before running `pnpm preview`. See the [compatibility guide](docs/compatibility.md) for dependency versions and environment requirements.

## Add MDX pages

The generated starter centralizes site name, default language, language labels, documentation entry, links, and theme controls in `app/docs.config.ts` using `defineDocsConfig`. Vite, the SSG filter, and the renderer read the same configuration. Set `defaultLocale: "ja"` for Japanese at unprefixed `/docs/*` URLs; English translations then live under `app/routes/en/docs`. Existing content must follow the selected language's file-path convention. See the [site configuration guide](docs/components.md#layout-and-site-configuration).

Place trusted local MDX under the standard `app/routes` directory. With `defaultLocale: "en"`:

| File                                     | URL                        |
| ---------------------------------------- | -------------------------- |
| `app/routes/docs/index.mdx`              | `/docs`                    |
| `app/routes/docs/getting-started.mdx`    | `/docs/getting-started`    |
| `app/routes/ja/docs/getting-started.mdx` | `/ja/docs/getting-started` |

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

`title` is required; `description` and numeric `order` are optional. The file path establishes page identity; frontmatter `id` is not used. Navigation sorts by `order` (default `0`), then URL.

## Customize the UI

Templates are exported as files through `honoxpress/templates/*`:

| Template              | Destination in your app                     |
| --------------------- | ------------------------------------------- |
| `docs-ui.tsx`         | `app/components/docs-ui.tsx`                |
| `copy-code.tsx`       | `app/islands/copy-code.tsx`                 |
| `file-tree.tsx`       | `app/components/file-tree.tsx`              |
| `type-table.tsx`      | `app/components/type-table.tsx`             |
| `code-group.tsx`      | `app/islands/code-group.tsx`                |
| `figure.tsx`          | `app/components/figure.tsx`                 |
| `theme-switch.tsx`    | `app/components/theme-switch.tsx`           |
| `definition-list.tsx` | `app/components/definition-list.tsx`        |
| `api-reference.tsx`   | `app/components/api-reference.tsx`          |
| `demo-frame.tsx`      | `app/components/demo-frame.tsx`             |
| `docs.css`            | Your public stylesheet                      |
| `tokens.css`          | Shared theme, typography, and spacing roles |

For the complete component list, props, MDX registry setup, CLI workflow, and starter, see the [component system guide](docs/components.md). The CLI installs Hono JSX components and islands into your app, then validates MDX tags using the same registry supplied to `providerImportSource`.

The layout and styles include responsive navigation and TOC disclosures, visible keyboard focus, a skip link, copy success/failure feedback, and a persistent Light / Dark / System theme selector. Installed components are app-owned; review changes manually and preserve the MIT notice when distributing copied files. See the [component system guide](docs/components.md) for installation, registry setup, props, and customization.

Static components define their styles alongside their JSX using `hono/css`;
`DocsLayout` emits only the static styles used by each page. Shared tokens, shell,
Markdown, and interactive styles remain in the public stylesheets. Existing sites
must [merge the copied sources and layout](docs/migrating-static-component-styles.md)
to adopt component-local styling; installing a dependency does not replace their
customizations.

## Build model and scope

`honoxpress` provides runtime metadata APIs. `honoxpress/build` provides build-time MDX discovery, heading transformation, syntax highlighting, and SSG filtering. Your HonoX application configures its router and renderer.

- MDX can execute JavaScript. Use trusted local files.
- `worker: true` stops metadata discovery from importing MDX. To also exclude MDX bodies from the Worker, use `honox/server/base` with explicit globs selecting dynamic routes. The SSG filter alone does not remove those imports.
- Navigation uses ordinary document loads. Island state resets when you leave a page.
- CI runs on Node.js 22.23.3, 24.12.0, and 24.21.0, validating the package, example, and installation of a packed tarball in an independent application. Node.js 26, other operating systems/browsers, and production Cloudflare deployment are outside that CI coverage.

honoxpress is a 0.x library. Pin your package version and review the [changelog](CHANGELOG.md) and [compatibility guide](docs/compatibility.md) before upgrading.

## Documentation and development

- [Component system](docs/components.md) — MDX registry, standard component props, CLI, layout config, and starter
- [Integration guide / API](docs/api.md) — MDX, Vite, renderer, templates, and Worker configuration
- [Compatibility guide](docs/compatibility.md) — Tested environments and known limitations
- [Framework integration](docs/framework-integration.md) — SSR/DOM classes, theme lifecycle, docs frame and explicit catalog APIs
- [Markdown-first authoring](docs/markdown.md) — Parser-neutral component renderer, static wrappers and explicit host islands; runnable `.md` examples
- [Maintenance and upgrades](docs/maintenance.md) — Compatibility decisions and template migration
- [Updating existing sites](docs/upgrading-owned-templates.md) — Responsive template fixes and manual merge steps
- [Example application](examples/poc) — The complete client/SSG/Worker pipeline
- [Changelog](CHANGELOG.md) / [Releases](https://github.com/ts-76/honoxpress/releases)
- [Contributing](CONTRIBUTING.md) — Development setup, verification, and PR workflow

Report bugs and proposals in [GitHub Issues](https://github.com/ts-76/honoxpress/issues). Include package/toolchain versions, reproduction steps, the affected URL, and whether the problem occurs in dev, SSG, or Worker mode.

## License and acknowledgements

[MIT](LICENSE) © 2026 ts-76.

Thank you to [Cloudflare Nimbus](https://github.com/cloudflare/nimbus) for its reading width, spacing, and navigation hierarchy, and [Fumapress](https://github.com/fuma-nama/fumapress) for its current-page accent, code actions, and mobile TOC. The templates' JSX, CSS, and icons were independently written.

## Host adapters

The parser-neutral catalog mapper is available as `honoxpress/adapters/hono-markdown`.
`honoxpress/adapters/void` and the existing `honoxpress/void` entry share the same
implementation. Framework presets select the CLI integration files; existing
HonoX/MDX APIs and application-owned components remain supported.
