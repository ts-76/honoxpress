# HonoXpress documentation starter

This starter gives you a runnable HonoX app with MDX documentation routes, a shared component registry, an editable Hono JSX layout, static page generation, and a Worker build for dynamic routes.

## Start locally

Use Node.js 22.20 or newer in the supported 22, 24, or 26 lines, then install the pinned dependencies with pnpm 11.22:

```sh
pnpm install
pnpm dev
```

Open <http://127.0.0.1:5173/docs/getting-started>. Edit `app/routes/docs/getting-started.mdx` to change the first page. Set the site name, default language, language labels, documentation entry, repository link, stylesheet, footer, and theme control in `app/docs.config.ts`. Vite, SSG, and page rendering share that configuration. Components are registered in `app/mdx-components.ts`; add or replace components there and use them without per-page imports.

The default-language pages live in `app/routes/docs` and have unprefixed `/docs` URLs. For `defaultLocale: "ja"`, put Japanese content there and English translations in `app/routes/en/docs` (`/en/docs` URLs). Changing the default on an existing site requires moving its content to match that convention. `localeLabels` controls the available languages; add a label and its translated MDX files to enable another language. `docsHref` controls the link from the home/404 pages to your default-language first page. `defineDocsConfig` validates the language settings when the application/build loads them.

## Build and preview

The production build has three stages: browser assets, static documentation pages, and the Cloudflare Worker bundle. The stages share `dist/public`; only `/docs/**` pages are written as static HTML, while dynamic routes such as `/demo/clock` remain Worker requests.

```sh
pnpm typecheck
pnpm check
pnpm build
```

`pnpm build` runs the client, documentation SSG, and Worker stages in order. To preview the built Worker locally, install the Cloudflare CLI once and run:

```sh
npm install --global cf@1.0.0-beta.6
pnpm preview
```

`pnpm preview` runs the locally built assets and Worker through Wrangler. `pnpm preview:dry-run` checks the Cloudflare package output without deploying. Review and configure the Cloudflare account and deployment settings separately before publishing.

## MDX components

The starter registers `Callout`, `Card`, `Cards`, `Steps`, `Step`, `Accordion`, `AccordionItem`, `Tabs`, `TabPanel`, `CodeBlock`, and `DemoFrame` in `app/mdx-components.ts`. For example:

```mdx
<Callout type="tip" title="Start here">
  Components are available in every document without imports.
</Callout>

<Cards>
  <Card title="Write pages">Add MDX files under `app/routes/docs`.</Card>
  <Card title="Use components">Edit the registry and component files in `app`.</Card>
</Cards>
```

Interactive controls live in `app/islands`; server-rendered components live in `app/components`. The files are part of your application and can be changed directly.

## Content and security

MDX is trusted build-time source code. Only add or build documentation from content whose authors are allowed to write JSX and JavaScript expressions. The generated Worker does not import the MDX route modules; static HTML is served from the asset directory and dynamic routes are handled by Hono.
