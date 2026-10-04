# Integrating honoxpress with HonoX

This guide connects the metadata API, local MDX routes, renderer, and build pipeline in an existing HonoX application. For public exports, see the [package README](../packages/docs/README.md). The [example app](../examples/poc) contains a complete client/SSG/Worker configuration.

## Install the package

```sh
pnpm add honoxpress hono
```

Keep HonoX, Vite Plus, `@mdx-js/rollup`, `remark-frontmatter`, `remark-mdx-frontmatter`, and the Hono SSG/Worker adapters as explicit application dependencies. The [example package.json](../examples/poc/package.json) and [compatibility guide](compatibility.md) record the tested combination. Add dependencies and generated output to the application's `.gitignore`.

For local package development, `pnpm pack:docs` in this repository creates a tarball under `artifacts/package`. Install that tarball in a separate app to test the actual distribution without workspace links.

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
import { docsMetadataPlugin, remarkDocsHeadings } from "honoxpress/build";
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
  remarkPlugins: [
    remarkFrontmatter,
    [remarkMdxFrontmatter, { name: "frontmatter" }],
    remarkDocsHeadings,
  ],
});
```

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

## Copy and customize the UI

Run this script from the application root after installing honoxpress:

```js
import { copyFile, mkdir } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname } from "node:path";

const templates = [
  ["docs-ui.tsx", "app/components/docs-ui.tsx"],
  ["copy-code.tsx", "app/islands/copy-code.tsx"],
  ["demo-frame.tsx", "app/components/demo-frame.tsx"],
  ["docs.css", "public/docs.css"],
];

for (const [source, destination] of templates) {
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(
    new URL(import.meta.resolve(`honoxpress/templates/${source}`)),
    destination,
    constants.COPYFILE_EXCL,
  );
}
```

The script stops if a destination already exists. Choose unused paths or merge the templates into your files manually. Load the copied CSS from your renderer, for example with `<link rel="stylesheet" href="/docs.css" />`.

The copy-code component must live under `app/islands` for HonoX to discover it. Importing it directly from the package does not register an application island. Edit names, links, wording, and layout in your owned files. Template updates require manual review and migration; keep the MIT copyright and permission notice with distributed copies.

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
