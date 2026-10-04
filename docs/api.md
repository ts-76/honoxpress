# Integrating honoxpress with HonoX

This guide connects the metadata API, local MDX routes, renderer, and build pipeline in an existing HonoX application. For the standard components, shared MDX registry, layout configuration, CLI, and runnable starter, see [MDX components and starter](components.md). For public exports, see the [package README](../packages/docs/README.md). The [example app](../examples/poc) contains a complete client/SSG/Worker configuration.

## Install the package

```sh
pnpm add honoxpress hono
```

Keep HonoX, Vite Plus, `@mdx-js/rollup`, `remark-frontmatter`, `remark-mdx-frontmatter`, and the Hono SSG/Worker adapters as explicit application dependencies. The [example package.json](../examples/poc/package.json) and [compatibility guide](compatibility.md) record the tested combination. Add dependencies and generated output to the application's `.gitignore`.

For local package development, `pnpm pack:docs` in this repository creates a tarball under `artifacts/package`. Install that tarball in a separate app to test the actual distribution without workspace links.

The component CLI and runnable starter require the unreleased development version. Published npm `honoxpress@0.1.4` has no `honoxpress` executable; `init`, `add`, and `list` require a built or packed candidate until a later release.

## Add MDX routes

Place trusted MDX under `app/routes/docs` and, for other languages, `app/routes/<locale>/docs`. With English as the default language:

```text
app/routes/
├── docs/
│   └── getting-started.mdx
└── ja/docs/
    └── getting-started.mdx
```

These files map to `/docs/getting-started` and `/ja/docs/getting-started`. Matching relative slugs connect translations. An `index.mdx` represents its parent URL.

```mdx
---
title: Getting started
description: Your first documentation page.
order: 1
---

# Getting started

## Installation

Write your documentation here.
```

`title` is required. `description` and numeric `order` are optional. Do not add a separate identifier: the route path establishes identity. Write static Markdown headings for the generated TOC; MDX expressions are not evaluated for heading text.

## Register metadata and heading plugins

The following excerpt shows the plugins to add to an existing Vite configuration; it is not a complete build configuration:

```ts
import { components } from "./app/mdx-components";
import { docsMetadataPlugin, remarkDocsComponents, remarkDocsHeadings } from "honoxpress/build";
import mdx from "@mdx-js/rollup";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";

// Place this before the HonoX plugins.
docsMetadataPlugin({
  locales: ["en", "ja"],
  defaultLocale: "en",
  worker: mode === "worker",
});

// Add this in dev/SSG; omit MDX compilation from the Worker target.
mdx({
  jsxImportSource: "hono/jsx",
  providerImportSource: "/app/mdx-components",
  remarkPlugins: [
    remarkFrontmatter,
    [remarkMdxFrontmatter, { name: "frontmatter" }],
    remarkDocsHeadings,
    [remarkDocsComponents, { names: Object.keys(components) }],
  ],
});
```

Point the provider and validator at the same registry. The provider makes registered components available to all MDX pages without page-level imports; the validator reports unknown tags during compilation. Add application-owned components to the exported registry so `Object.keys(components)` includes them.

`worker` must be an explicit boolean. Development and SSG read the MDX route exports. Worker mode creates an empty catalog without discovering or importing MDX. `routeRoot` defaults to `app/routes` relative to the Vite root.

For HonoX 0.1.61 / Vite Plus 1.0.0, use the [watch adapter](../examples/poc/build/honox-watch.ts) in place of the direct `honox/vite` import. It registers an absolute `app` directory so route additions/removals trigger HonoX's restart behavior. See the [full Vite config](../examples/poc/vite.config.ts) for mode selection and plugin ordering.

## Use the generated catalog in your renderer

Add an application declaration, for example `app/docs-virtual.d.ts`:

```ts
declare module "virtual:honoxpress/catalog" {
  export const docsCatalog: import("honoxpress").DocsCatalog;
}
```

Import the generated catalog from your HonoX renderer. Do not maintain a second manual catalog alongside MDX frontmatter.

```ts
import { docsCatalog } from "virtual:honoxpress/catalog";

// Inside the renderer callback, c is the Hono context.
const pathname = new URL(c.req.url).pathname;
const current = docsCatalog.page(pathname);
const pages = current ? docsCatalog.navigation(current.locale) : [];
const translations = docsCatalog.translations(pathname);
```

Use `pages` for navigation, `current?.headings` for the TOC, and `translations` for language links. Missing translations have no `href`; display them as unavailable rather than constructing a URL. For current-page navigation, pass `current.href` when a page resolves. Taking the pathname from the URL avoids decoding Hono request paths twice.

The [example renderer](../examples/poc/app/routes/_renderer.tsx) composes these values with the copied UI components, title/description, and client script.

## Install the component system

For a complete list of built-in components, their props, the `DocsLayout` configuration, and MDX examples, see [MDX components and starter](components.md).

The CLI can add the editable files to an existing app, or install a runnable HonoX scaffold into a new directory. Preview the destinations before writing:

```sh
pnpm exec honoxpress init --dry-run
pnpm exec honoxpress init
pnpm exec honoxpress add tabs --dry-run
pnpm exec honoxpress add tabs
```

Use `honoxpress list` to print component groups. `init` installs all groups; `add` accepts one group such as `callout`, `cards`, `steps`, `accordion`, `tabs`, `code-block`, `demo-frame`, or `layout`. The CLI does not install dependencies, edit existing routes or Vite configuration, access credentials, or deploy. It never overwrites existing files; a differing destination stops the plan before files are written.

To try the unreleased CLI against the current checkout, build and pack the package, then create the new app from that local candidate:

```sh
pnpm build:package
mkdir -p /tmp/honoxpress-candidate
pnpm --dir packages/docs pack --pack-destination /tmp/honoxpress-candidate
mkdir /tmp/my-docs
node packages/docs/bin/honoxpress.mjs init --starter --cwd /tmp/my-docs
cd /tmp/my-docs
pnpm add /tmp/honoxpress-candidate/honoxpress-0.1.4.tgz
pnpm dev
```

The starter sets up the HonoX routes, shared MDX registry, and client → docs SSG → Worker build stages. The standard `public/style.css` imports `components.css`; retain the import when keeping the supplied component styles. After a release includes the CLI, use `pnpm dlx honoxpress@<version> init --starter --cwd /path/to/new-docs`; replace `<version>` with that release. Published `honoxpress@0.1.4` predates these commands.

These commands require a built or packed candidate from the development branch until a later release. They are not included in published npm `honoxpress@0.1.4`.

## Build client, static docs, and Worker separately

The reference pipeline runs client → docs SSG → Worker. Clear stale outputs once at the start, then preserve earlier stage output during later stages. Keep static assets and the Worker bundle in separate directories.

Build the client first so the renderer can resolve its production script from the generated manifest:

```ts
import { resolveClientScript } from "honoxpress";

const clientSrc = resolveClientScript(manifest, "app/client.ts");
```

Use `/app/client.ts` in development. Keep the manifest available through renderer builds, then remove build metadata from the public assets. `resolveClientScript` throws when the manifest entry is missing or unsafe.

During SSG, place the documentation filter before Hono's `defaultPlugin()`:

```ts
import { docsOnlyPlugin } from "honoxpress/build";
import { defaultPlugin } from "hono/ssg";

const report = { accepted: [], skipped: [] };
const plugins = [
  docsOnlyPlugin({ locales: ["en", "ja"], defaultLocale: "en" }, report),
  defaultPlugin(),
];
```

Pass `plugins` to `@hono/vite-ssg`'s SSG adapter. The filter rejects non-doc routes and colon/wildcard discovery before request execution, so dynamic demos are not executed by SSG.

## Exclude MDX bodies from the Worker

Use the ordinary `honox/server` entry for dev/SSG. For the Worker, import `createApp` from `honox/server/base` and select only the dynamic routes and layouts using literal globs:

```ts
import { createApp } from "honox/server/base";

export default createApp({
  root: "/app/routes",
  ROUTES: import.meta.glob(["/app/routes/index.tsx", "/app/routes/demo/index.tsx"], {
    eager: true,
  }),
  RENDERER: import.meta.glob("/app/routes/_renderer.tsx", { eager: true }),
  NOT_FOUND: import.meta.glob("/app/routes/_404.tsx", { eager: true }),
  ERROR: {},
  MIDDLEWARE: {},
});
```

Adapt those globs to your own dynamic routes, middleware, layouts, and error pages. The default eager HonoX router imports MDX bodies even with `worker: true`; filtering responses after routing or using `docsOnlyPlugin` does not remove those imports. Keep documentation pages in static assets and configure the deployment's asset routing accordingly.

Use the [Worker entry](../examples/poc/app/worker.ts), [build script](../examples/poc/build/build.mjs), and [Cloudflare config](../examples/poc/wrangler.jsonc) as the complete reference. Verify dev and local production URLs, 404s, assets, and Worker route coverage when adapting the pipeline. The [independent consumer fixture](../fixtures/consumer) demonstrates installation from the packed package rather than workspace source.
