# MDX components and starter

honoxpress can install a set of editable Hono JSX components into an application. The files belong to your app after installation: MDX uses them through one shared registry, and you can change their markup, behavior, props, and styles.

> **Release status:** the component CLI (`init`, `add`, and `list`), component templates, and runnable starter described here are in the unreleased development version. Published npm `honoxpress@0.1.4` does not contain the CLI or these components. Use a built or packed candidate from this repository to try them; wait for a release before following these commands with the current npm package.

## Install into an existing HonoX application

Once a candidate release is installed in the existing app, the CLI adds the complete component set and layout. First inspect the proposed file operations, then apply them:

```sh
pnpm exec honoxpress init --dry-run
pnpm exec honoxpress init
```

`init` installs consumer-owned component and island files, the docs layout and site config, a shared MDX registry, and public styles. It does not add dependencies or rewrite existing routes, Vite configuration, or deployment settings. Existing files are never overwritten. If a destination differs, the command reports the conflict and writes nothing; inspect the existing file, choose a free destination, or merge the relevant code yourself.

To add components incrementally, select a group:

```sh
pnpm exec honoxpress add callout --dry-run
pnpm exec honoxpress add tabs
pnpm exec honoxpress list
```

Available groups are `callout`, `cards`, `steps`, `accordion`, `tabs`, `code-block`, `demo-frame`, and `layout`. `init` is shorthand for all groups. `add` adds the group's files and refreshes only the managed registry block in `app/mdx-components.ts`; local code outside that block is preserved. Do not edit the lines between the `honoxpress:components` markers: a later `add` replaces that generated block. Put custom imports and registry additions outside it. `--dry-run` prints the complete proposed changes without writing files.

Content groups such as `callout` or `tabs` also install `public/components.css` on first addition. The `layout` group installs `public/style.css`, which imports that component stylesheet. Either run `add layout` as well, or link the component stylesheet from your own layout with `<link rel="stylesheet" href="/components.css" />`. `CodeBlock` also uses the base code-toolbar styles from `docs.css`; if you skip the layout group, copy and load both stylesheets or provide equivalent styles in your own CSS.

After installation, finish the MDX and Vite setup in the next section. Existing apps need to connect the component registry to their MDX plugin themselves; the CLI deliberately leaves build configuration in the application's hands.

## Use the shared registry in MDX

The generated `app/mdx-components.ts` exports the `components` map and `useMDXComponents` provider. Configure MDX to use that provider and validate tags against the same map:

```ts
import { components } from "./app/mdx-components";
import { remarkDocsComponents, remarkDocsHeadings } from "honoxpress/build";
import mdx from "@mdx-js/rollup";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";

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

The provider makes registered components available to every MDX page without a page-level import. The validator reports unknown component tags during compilation and catches spelling or registration errors early. Keep the imported `components` object and `providerImportSource` pointed at the same file.

The managed block exports `standardComponents`. Keep application-owned imports outside the markers, then add them to the existing registry composition below the block. For example:

```ts
import ProjectNote from "./components/project-note";
import ProjectCallout from "./components/project-callout";

// In the application-owned section after the managed block:
const overrides: Record<string, unknown> = { ProjectNote, Callout: ProjectCallout };
export const components: Record<string, unknown> = {
  ...standardComponents,
  ...overrides,
};
```

The CLI-generated file already defines the registry composition and `useMDXComponents` outside its managed block. Extend that existing composition; do not add a second `components` export. The Vite config's `Object.keys(components)` then includes `ProjectNote` for validation, and the provider exposes it on each page. The example replaces the built-in `Callout` and adds one local component. Because these declarations sit outside the managed block, they remain in place when you add another standard component later.

The generated `useMDXComponents` provider accepts `Record<string, unknown>` overrides and returns `{ ...components, ...overrides }`. An override with an existing component name takes precedence. For a site-wide change, place it in the application-owned `components` composition as shown above; keep the generated provider outside the managed block intact.

## Component gallery and props

| Component       | What it renders                                                  | Props                                                                                                    |
| --------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `Callout`       | Semantic note with `info`, `tip`, `warning`, or `danger` styling | `type?`, `title?`, children                                                                              |
| `Cards`         | Responsive card grid                                             | `columns?: 2 \| 3` (default `2`), children                                                               |
| `Card`          | A titled card with optional link                                 | `title` (required), `href?`, children                                                                    |
| `Steps`         | Numbered sequence                                                | children                                                                                                 |
| `Step`          | One item in `Steps`                                              | `title?`, children                                                                                       |
| `Accordion`     | Container for disclosure items                                   | children                                                                                                 |
| `AccordionItem` | Native expandable disclosure                                     | `title` (required), `open?` (default `false`), children                                                  |
| `Tabs`          | Keyboard-operable tab navigation island                          | `labels: string[]` (required), `ariaLabel?` (default `"Tabs"`), `selectedIndex?` (default `0`), children |
| `TabPanel`      | Content associated with a `Tabs` label by its index              | `index: number` (required), children                                                                     |
| `CodeBlock`     | Copyable command or code sample island                           | `code: string` (required), `filename?`, `copyLabel?`, `copiedLabel?`, `errorLabel?`                      |
| `DemoFrame`     | Lazy iframe with a caption and direct link                       | `title?`, `src?` (default `/demo/clock`), `linkLabel?`                                                   |

Children are ordinary MDX content. Native Markdown code fences remain available; use `CodeBlock` when a copy button and filename toolbar are useful.

```mdx
<Callout type="warning" title="Trusted content">
  MDX can contain executable JavaScript. Build documentation only from trusted local source.
</Callout>

<Cards columns={2}>
  <Card title="Components" href="/docs/components">
    Reuse a component throughout the documentation site.
  </Card>
  <Card title="Islands">Add a small client-side island only when an interaction needs it.</Card>
</Cards>

<Steps>
  <Step title="Install">Run `pnpm install`.</Step>
  <Step title="Develop">Run `pnpm dev`.</Step>
</Steps>

<Accordion>
  <AccordionItem title="Does this need JavaScript?">
    Callouts, cards, steps, and accordions work as server-rendered HTML. Tabs and code copying
    hydrate as islands.
  </AccordionItem>
</Accordion>

<Tabs labels={["pnpm", "npm"]}>
  <TabPanel index={0}>Run `pnpm install`.</TabPanel>
  <TabPanel index={1}>Run `npm install`.</TabPanel>
</Tabs>

<CodeBlock code="pnpm dev" filename="Terminal" />

<DemoFrame title="Live Worker route" src="/demo/clock" linkLabel="Open demo" />
```

`Tabs` is a HonoX island in `app/islands/tabs.tsx`; its static `TabPanel` is in `app/components/docs-content.tsx`. Before hydration, every tab panel is present in the server-rendered page. When the island hydrates, it activates the selected panel and enables keyboard navigation. `Accordion` uses native `<details>` and `<summary>` elements and works without JavaScript. `CodeBlock` is the MDX registry name for the copy-code island at `app/islands/copy-code.tsx`. HonoX discovers islands by their application file paths, so do not import an island directly from the honoxpress package. The other content elements are Hono JSX components under `app/components`.

## Layout and site configuration

The layout group installs `DocsLayout` in `app/components/docs-layout.tsx`, its navigation helpers in `app/components/docs-ui.tsx`, and a typed site config in `app/docs.config.ts`. In a route renderer, resolve catalog data and pass it to the layout:

```tsx
<DocsLayout
  config={docsSite}
  current={current}
  pages={pages}
  translations={translations}
  locale={locale}
  clientSrc={clientSrc}
>
  {children}
</DocsLayout>
```

`current` is optional for non-documentation pages. `pages` is the current locale's navigation list; `translations` comes from `docsCatalog.translations(pathname)`. `clientSrc` is optional and is loaded only when a documentation page resolves. Use `/app/client.ts` in development and `resolveClientScript` with the client manifest in production. The article children already include the MDX body and its page heading, so the layout does not add a second copy of the title. The page title and description are applied to the document metadata.

| `DocsLayout` prop | Type                    | Purpose                                                     |
| ----------------- | ----------------------- | ----------------------------------------------------------- |
| `children`        | Hono JSX `Child`        | Rendered page body                                          |
| `current?`        | `DocsPage`              | The page for this URL; omit it on a non-documentation route |
| `pages`           | `readonly DocsPage[]`   | Navigation entries for the active locale                    |
| `translations`    | `readonly LocaleLink[]` | Available and unavailable translations for the current page |
| `locale`          | `string`                | Active document language and label lookup key               |
| `clientSrc?`      | `string`                | Client entry to load for an interactive docs page           |
| `config`          | `DocsSiteConfig`        | Site name, links, labels, styles, and footer                |

The config template has this shape:

```ts
import type { DocsSiteConfig } from "honoxpress/templates/docs-layout.tsx";

const docsSite = {
  name: "Your project",
  homeHref: "/",
  repositoryHref: "https://github.com/your-org/your-project",
  stylesheetHref: "/style.css",
  localeLabels: { en: "English", ja: "日本語" },
  labels: {
    en: { nav: "Documentation", toc: "On this page", skip: "Skip to content" },
    ja: { nav: "ドキュメント", toc: "このページの内容", skip: "本文へ移動" },
  },
  footer: "Documentation maintained by your team.",
} satisfies DocsSiteConfig;

export default docsSite;
```

`name` and `localeLabels` are required. `homeHref` defaults to `/`; `repositoryHref`, `footer`, and locale-specific `labels` are optional. `stylesheetHref` defaults to `/style.css`. The layout renders a responsive header, language links, sidebar, breadcrumbs, desktop and mobile TOCs, skip link, main content, and optional footer. `DocsNavigation`, `TableOfContents`, and `LanguageLinks` are also available from the copied `docs-ui.tsx` if your app composes a different layout.

| Layout helper     | Props                                                                                                          |
| ----------------- | -------------------------------------------------------------------------------------------------------------- |
| `DocsNavigation`  | `pages: readonly DocsPage[]`, `pathname: string`, `label?: string`                                             |
| `TableOfContents` | `headings: readonly Heading[]`, `label?: string`                                                               |
| `LanguageLinks`   | `links: readonly LocaleLink[]`, `locale: string`, `labels: Readonly<Record<string, string>>`, `label?: string` |

## Start a new site

Published npm `honoxpress@0.1.4` does not have this command. To try the current repository version from a clone, build and pack a candidate, then invoke its CLI source to create a new directory:

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

Open `http://127.0.0.1:5173/docs/getting-started`. The starter pins Hono, HonoX, Vite Plus, MDX, and Cloudflare tooling. Its production build runs browser assets, docs-only SSG, then the Worker build; `pnpm preview` runs that output locally through Wrangler. It includes a small dynamic Worker demo and keeps MDX route bodies out of the Worker route graph. `init --starter` creates files but does not install packages, access credentials, or deploy. Installing the local tarball with `pnpm add` installs its declared dependencies.

After a release includes the CLI, a new project can use `pnpm dlx honoxpress@<version> init --starter --cwd /path/to/new-docs`. Replace `<version>` with that release; `0.1.4` is not a valid choice because it predates the CLI.

## Ownership, updates, and design references

Installed files become application source. Change components and layout directly to fit your routes, content, and design system. The default `public/style.css` imports `./components.css`; keep that import if you want the standard component styles, or replace both stylesheets with your own. The CLI records the installed groups and file hashes in `.honoxpress.json`; later additions refresh only the registry's marked block and stop on conflicting destination files. They do not overwrite your copied component implementation.

Nimbus and Fumapress informed the layout hierarchy and component patterns. The Hono JSX, CSS, and icons in these templates are independently implemented; no upstream source code or assets were copied. Preserve the repository's MIT license and notice when distributing copied template files.
