# MDX components and starter

honoxpress can install a set of editable Hono JSX components into an application. The files belong to your app after installation: MDX uses them through one shared registry, and you can change their markup, behavior, props, and styles.

> **Release status:** the component CLI (`init`, `add`, and `list`), component templates, and runnable starter described here are in the unreleased development version. Published npm `honoxpress@0.1.4` does not contain the CLI or these components. Use a built or packed candidate from this repository to try them; wait for a release before following these commands with the current npm package.

## Install into an existing HonoX application

For a site that already owns copied components and styles, see
[Updating existing documentation sites](upgrading-owned-templates.md) for the
responsive template fixes and a manual merge procedure.

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

Available groups are `callout`, `cards`, `steps`, `accordion`, `tabs`, `code-block`, `demo-frame`, `file-tree`, `type-table`, `code-group`, `figure`, `theme-switch`, `definition-list`, `api-reference`, and `layout`. `init` is shorthand for all groups. `add` adds the group's files and refreshes only the managed registry block in `app/mdx-components.ts`; local code outside that block is preserved. Do not edit the lines between the `honoxpress:components` markers: a later `add` replaces that generated block. Put custom imports and registry additions outside it. `--dry-run` prints the complete proposed changes without writing files. `add code-group` also installs the `tabs` and `code-block` groups when they are missing; previously installed, locally edited islands are preserved. `add layout` also installs `theme-switch`.

Content groups such as `callout` or `tabs` also install `public/components.css` and its shared `public/tokens.css` on first addition. The `layout` group installs `public/style.css`, which imports that component stylesheet. Either run `add layout` as well, or link the component stylesheet from your own layout with `<link rel="stylesheet" href="/components.css" />`. `CodeBlock` also uses the base code-toolbar styles from `docs.css`; if you skip the layout group, copy and load both stylesheets or provide equivalent styles in your own CSS.

After installation, finish the MDX and Vite setup in the next section. Existing apps need to connect the component registry to their MDX plugin themselves; the CLI deliberately leaves build configuration in the application's hands.

## Use the shared registry in MDX

The copied `app/client.ts` discovers islands with app-owned `import.meta.glob` calls and passes them to `createClient({ ISLAND_FILES })`. This keeps newly added islands discoverable even when the browser has cached the prebundled HonoX client. Retain that discovery when customizing the client entry.

The generated `app/mdx-components.ts` exports the `components` map and `useMDXComponents` provider. Configure MDX to use that provider and validate tags against the same map:

```ts
import { components } from "./app/mdx-components";
import { remarkDocsComponents, remarkDocsHeadings, remarkDocsCode } from "honoxpress/build";
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
    remarkDocsCode,
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

| Component        | What it renders                                                  | Props                                                                                                               |
| ---------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `Callout`        | Semantic note with `info`, `tip`, `warning`, or `danger` styling | `type?`, `title?`, children                                                                                         |
| `Cards`          | Responsive card grid                                             | `columns?: 2 \| 3` (default `2`), children                                                                          |
| `Card`           | A titled card with optional link                                 | `title` (required), `href?`, children                                                                               |
| `Steps`          | Numbered sequence                                                | children                                                                                                            |
| `Step`           | One item in `Steps`                                              | `title?`, children                                                                                                  |
| `Accordion`      | Container for disclosure items                                   | children                                                                                                            |
| `AccordionItem`  | Native expandable disclosure                                     | `title` (required), `open?` (default `false`), children                                                             |
| `Tabs`           | Keyboard-operable tab navigation island                          | `labels: string[]` (required), `ariaLabel?` (default `"Tabs"`), `selectedIndex?` (default `0`), children            |
| `TabPanel`       | Content associated with a `Tabs` label by its index              | `index: number` (required), children                                                                                |
| `CodeBlock`      | Copyable command or code sample island                           | `code: string` (required), `language?`, `tokens?`, `filename?`, `copyLabel?`, `copiedLabel?`, `errorLabel?`         |
| `DemoFrame`      | Lazy iframe with a caption and direct link                       | `title?`, `src?`, `href?`, `linkLabel?`, `aspectRatio?`, `height?`, `allowFullscreen?`, `openInNewTab?`, `loading?` |
| `FileTree`       | Accessible nested file list                                      | `label?` (default `"Project files"`), children                                                                      |
| `Folder`         | Native collapsible folder inside a file tree                     | `name`, `open?` (default `true`), children                                                                          |
| `File`           | File name, with optional link or emphasis                        | `name`, `href?`, `highlighted?` (default `false`)                                                                   |
| `TypeTable`      | Semantic property reference table                                | `properties: TypeProperty[]`, `caption?` (default `"Properties"`), `emptyLabel?`                                    |
| `CodeGroup`      | Tabbed code samples using the existing islands                   | `samples: CodeSample[]`, `ariaLabel?` (default `"Code examples"`), `selectedIndex?`                                 |
| `Figure`         | Responsive image and optional caption                            | `src`, `alt`, intrinsic `width` and `height`, `caption?`, `loading?` (default `"lazy"`)                             |
| `ThemeSwitch`    | Native Light / Dark / System selector                            | `locale?` (default `"en"`; `"ja"` localizes labels)                                                                 |
| `DefinitionList` | Semantic term-description rows                                   | `items: readonly DefinitionItem[]`, `label?`                                                                        |
| `APIReference`   | API heading, usage, reference content and links                  | `name`, `id?`, `importFrom?`, `description?`, `usage?`, `guideHref?`, `sourceHref?`, `labels?`, children            |

Children are ordinary MDX content. Language-labelled Markdown fences are highlighted by `remarkDocsCode`. Use `CodeBlock` with `language` when a copy button and filename toolbar are useful.

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

<CodeBlock language="bash" code="pnpm dev" filename="Terminal" />

<DemoFrame title="Live Worker route" src="/demo/clock" linkLabel="Open demo" />
```

`Tabs` is a HonoX island in `app/islands/tabs.tsx`; its static `TabPanel` is in `app/components/docs-content.tsx`. Before hydration, every tab panel is present in the server-rendered page. When the island hydrates, it activates the selected panel and enables keyboard navigation. `Accordion` uses native `<details>` and `<summary>` elements and works without JavaScript. `CodeBlock` is the MDX registry name for the copy-code island at `app/islands/copy-code.tsx`. HonoX discovers islands by their application file paths, so do not import an island directly from the honoxpress package. The other content elements are Hono JSX components under `app/components`.

## Authoring components

Install the new authoring groups individually or with `init`:

```sh
pnpm exec honoxpress add file-tree
pnpm exec honoxpress add type-table
pnpm exec honoxpress add code-group
pnpm exec honoxpress add figure
```

FileTree, TypeTable, and Figure live in separate application-owned files under `app/components`: `file-tree.tsx`, `type-table.tsx`, and `figure.tsx`. `CodeGroup` lives in `app/islands/code-group.tsx` and reuses the app's Tabs and CodeBlock implementations. A single island owns tab navigation and copying to avoid nested island hydration. Adding a group updates the same MDX registry, so no page-level imports are required. Before hydration all code panels remain visible; the selected panel and keyboard navigation become active when Tabs hydrates. Groups do not synchronize their selection across the page. After hydration, the copy icon shares the tab row while the filename stays directly above its code; the button retains its accessible label and announces copy feedback.

**Existing installations:** `add` preserves your owned stylesheets. If your copied `components.css` predates these components, merge the authoring styles from `honoxpress/templates/components.css` and keep its `tokens.css` import before using the new groups. Fresh installations include those styles automatically. This is a manual source upgrade, rather than an automatic overwrite of local styles.

```mdx
<FileTree label="Project structure">
  <Folder name="app">
    <Folder name="routes" open={false}>
      <File name="getting-started.mdx" href="/docs/getting-started" />
    </Folder>
    <File name="mdx-components.ts" highlighted={true} />
  </Folder>
  <File name="vite.config.ts" />
</FileTree>

<TypeTable
  caption="Callout properties"
  properties={[
    {
      name: "type",
      type: '"info" | "tip" | "warning" | "danger"',
      defaultValue: '"info"',
      description: "Semantic tone of the note.",
    },
    { name: "title", type: "string", description: "Optional heading." },
  ]}
/>

<CodeGroup
  ariaLabel="Install command"
  samples={[
    { label: "pnpm", language: "bash", filename: "Terminal", code: "pnpm add honoxpress" },
    { label: "npm", language: "bash", filename: "Terminal", code: "npm install honoxpress" },
  ]}
/>

<Figure
  src="/images/example.png"
  alt="Describe the screenshot's relevant content."
  width={1440}
  height={900}
  caption="The documentation layout on a wide screen."
/>
```

`FileTree` uses nested lists rather than an ARIA tree widget. Each `Folder` uses native `details` and `summary`, so it opens with Enter or Space and works with JavaScript disabled. Use `File.highlighted` to mark a file discussed in the text; it does not set `aria-current` or imply a selected navigation destination. Icons are inline SVG and require no icon font.

`TypeTable.properties` accepts entries with `name: string`, `type: string`, optional `description: Child`, `required: boolean`, `defaultValue: string`, and `deprecated: boolean`. `TypeProperty` is exported from the copied `type-table.tsx` for typed application data. Missing `required` means optional; a supplied empty default string is still displayed. An empty array renders `emptyLabel` (default `"No properties."`) instead of an empty table. The table keeps property names as row headers and wraps long names and types at narrow widths. Table headers and required/optional labels are English defaults that can be localized in the owned source.

`CodeGroup.samples` takes entries with `label: string`, `code: string`, and optional `language`, `filename`, `tokens`, `copyLabel`, `copiedLabel`, and `errorLabel`, matching CodeBlock. `CodeSample` is exported from the copied island. An empty array renders nothing. Static array/object literals receive syntax tokens from `remarkDocsCode`; dynamic arrays are left untouched and may provide tokens generated with the server/build helper `highlightDocsCode`. No expressions or spreads are evaluated by the plugin.

`Figure` renders a native image with the provided intrinsic dimensions to reserve its aspect ratio. It scales to its container without cropping. Write informative `alt` text; use `alt=""` only for a decorative image. Use `loading="eager"` for an image visible when the page opens. Caption content may include links or ordinary MDX, passed as a JSX expression. The component does not optimize images or provide zoom; serve appropriately sized image files from your application.

## Structured references and live demos

```sh
pnpm exec honoxpress add definition-list
pnpm exec honoxpress add api-reference
pnpm exec honoxpress add theme-switch
```

`DefinitionList` and `APIReference` live in `app/components/definition-list.tsx` and `app/components/api-reference.tsx`. They render static HTML and can contain links, code, and other registered components.

```mdx
<DefinitionList
  label="Configuration"
  items={[
    { term: <code>basePath</code>, description: "The URL prefix used by the application." },
    { term: "Theme", description: "The presentation's authored colors and typography." },
  ]}
/>

## DemoFrame API

<APIReference
  name="DemoFrame"
  importFrom="./components/demo-frame"
  description="Embed an interactive example alongside its documentation."
  usage="Use it when readers need to try the example without leaving the guide."
  guideHref="/docs/demos"
  sourceHref="https://github.com/your-org/your-project/blob/main/app/components/demo-frame.tsx"
>
  <CodeBlock
    language="tsx"
    code={
      '<DemoFrame src="/demo/product/embed" href="/demo/product" aspectRatio={16 / 9} allowFullscreen />'
    }
  />
  <TypeTable properties={[{ name: "src", type: "string", required: true }]} />
</APIReference>
```

`DefinitionItem` has `term: Child` and `description: Child`; an empty array renders nothing. Rows stack on narrow screens. Use it for concepts or configuration explanations, and TypeTable for typed properties.

`APIReference` groups related content in a labelled article. `description` and `usage` accept `Child`; its children can include CodeBlock, TypeTable, DefinitionList, and prose. `labels` accepts `usage`, `guide`, `source`, and `links` strings for localization. Add an ordinary Markdown heading above the component for automatic TOC discovery; its own generated heading is not included in the MDX heading export. The optional `id` supplies a direct anchor.

`DemoFrame` separates an iframe `src` from its link `href` (defaults to `src`). Positive, finite `aspectRatio` values reserve the iframe's width-to-height ratio; positive, finite `height` values specify pixels and take precedence. Without either prop the default stylesheet retains a 210px height. Invalid dimensions throw during rendering. `allowFullscreen={true}` grants the iframe fullscreen permission, while `openInNewTab={true}` adds a separate tab with `rel="noreferrer"`. Both default to `false`; `loading` defaults to `"lazy"`. `title` defaults to `"Live Worker demo"`, and `src` to `/demo/clock`. The embedded app remains responsible for its controls and theme.

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
| `nonce?`          | `string`                | Request-specific CSP nonce for the early theme script       |
| `config`          | `DocsSiteConfig`        | Site name, links, labels, styles, and footer                |

The config template has this shape:

```ts
import { defineDocsConfig } from "honoxpress";

const docsSite = defineDocsConfig({
  name: "Your project",
  defaultLocale: "en",
  homeHref: "/",
  docsHref: "/docs/getting-started",
  repositoryHref: "https://github.com/your-org/your-project",
  stylesheetHref: "/style.css",
  themeSwitch: true,
  localeLabels: { en: "English", ja: "日本語" },
  labels: {
    en: { nav: "Documentation", toc: "On this page", skip: "Skip to content" },
    ja: { nav: "ドキュメント", toc: "このページの内容", skip: "本文へ移動" },
  },
  footer: "Documentation maintained by your team.",
});

export default docsSite;
```

`name`, `defaultLocale`, and `localeLabels` are required. `defineDocsConfig` validates locale codes, display labels, and that the default belongs to the configured languages when the file is loaded. `DocsSiteConfig` and `DocsLayoutLabels` are exported from `honoxpress` (and re-exported by the layout template). `homeHref` defaults to `/`; `docsHref` selects the default-language documentation entry and defaults to `/docs/getting-started` in the starter. `repositoryHref`, `footer`, and locale-specific `labels` are optional. `stylesheetHref` defaults to `/style.css`. The layout renders a responsive header, language links, sidebar, breadcrumbs, desktop and mobile TOCs, skip link, main content, and optional footer. `DocsNavigation`, `TableOfContents`, and `LanguageLinks` are also available from the copied `docs-ui.tsx` if your app composes a different layout.

The generated starter reads `app/docs.config.ts` in Vite, the docs-only SSG filter, the renderer, the home page, and the 404 handler. Change the site settings there; no separate language arrays or default-language constants need editing. Available languages come from `Object.keys(docsSite.localeLabels)`, and `resolveDocsLocale(pathname, docsSite)` handles complete locale path segments with the configured default as the fallback. Resolved documentation pages use their catalog locale.

For Japanese as the default, set `defaultLocale: "ja"` while retaining `ja` in `localeLabels`. Author Japanese pages at `app/routes/docs/*.mdx` (URLs `/docs/*`) and English translations at `app/routes/en/docs/*.mdx` (URLs `/en/docs/*`). When changing the default on an existing multilingual site, move the previously prefixed default-language pages and prefix the former default's translations accordingly; changing configuration does not translate or move content. Add languages by adding labels and their MDX files, without editing build settings. `docsHref` always points to an existing default-language page without a locale prefix.

**Existing installations:** add `defaultLocale` to the owned config and connect the renderer/build files to it as above (the CLI preserves existing files). Import `defineDocsConfig` and the config types from the updated package. Set `docsHref` when your first page uses a different slug. Cloudflare account, Worker names/domains, and deployment credentials remain in deployment configuration; CSS tokens and authored content remain application source.

| Layout helper     | Props                                                                                                          |
| ----------------- | -------------------------------------------------------------------------------------------------------------- |
| `DocsNavigation`  | `pages: readonly DocsPage[]`, `pathname: string`, `label?: string`                                             |
| `TableOfContents` | `headings: readonly Heading[]`, `label?: string`                                                               |
| `LanguageLinks`   | `links: readonly LocaleLink[]`, `locale: string`, `labels: Readonly<Record<string, string>>`, `label?: string` |

## Theme switching

`DocsLayout` installs `ThemeScript` and `ThemeSwitch` from `app/components/theme-switch.tsx` and enables them by default. The control appears in the desktop header and inside the mobile menu. On non-documentation pages it remains visible in the header. Set `config.themeSwitch = false` to omit both the control and initializer.

For a custom shell, render `<ThemeScript />` in `<head>` **before the stylesheet**, then render `<ThemeSwitch locale="en" />` where needed. Include both `components.css` and `tokens.css`; `ThemeSwitch` alone does not initialize the theme. If your CSP uses a nonce, pass the request's value as `<ThemeScript nonce={nonce} />` or `DocsLayout.nonce` and authorize that script in the policy.

The selector offers Light, Dark, and System. Its choice is stored under `honoxpress-theme` in localStorage and survives document navigation. The synchronous head initializer sets `html[data-theme]` before styles load to avoid the wrong initial palette. System follows `prefers-color-scheme`, including later OS changes; storage events synchronize open tabs. Restricted storage still permits switching within the current page. Without JavaScript the selector stays disabled and the stylesheet follows the OS. Forced-colors mode always uses system colors.

**Existing installations:** merge the new layout import, head initializer and controls into your owned layout, and merge the updated tokens/styles. `add theme-switch` installs the component and registry entry but preserves your existing CSS and shell. The documentation theme does not reach inside an iframe or override the presentation's authored theme.

## Theme and interaction styles

The layout and standard components import one shared `public/tokens.css`. It separates the four-pixel spacing foundation, typography scale, surface colors, and semantic roles. Component styles consume roles such as panel padding or title spacing, so a single customization reaches every component. Override semantic properties after the default stylesheet:

```css
:root {
  --docs-accent: #a34222;
  --docs-tint: #fbede7;
  --docs-panel-padding: 1.25rem;
  --docs-title-gap: 0.5rem;
  --docs-title-size: 1.125rem;
}

:root[data-theme="dark"] {
  --docs-accent: #e8a587;
  --docs-tint: #362821;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --docs-accent: #e8a587;
    --docs-tint: #362821;
  }
}
```

| Role                            | Token                                                  | Default                                      |
| ------------------------------- | ------------------------------------------------------ | -------------------------------------------- |
| Reading canvas                  | `--docs-bg`                                            | `#F9FAFB` / cool charcoal                    |
| Component panels                | `--docs-panel`                                         | White / raised cool charcoal                 |
| Code and hover surfaces         | `--docs-surface`                                       | Near-white code and hover surface            |
| Text / secondary text / borders | `--docs-text`, `--docs-muted`, `--docs-line`           | Separate contrast levels in each theme       |
| Links, selection, and focus     | `--docs-accent`, `--docs-tint`                         | Rust accent with a soft tint                 |
| Body / lead paragraph           | `--docs-text-md`, `--docs-text-lg`                     | 16 / 18px                                    |
| Page / section headings         | `--docs-page-title-size`, `--docs-section-title-size`  | Responsive 32–40 / 24px                      |
| Card / step titles              | `--docs-title-size`                                    | 18px, independent of article headings        |
| Controls / code / metadata      | `--docs-ui-size`, `--docs-code-size`, `--docs-text-xs` | 14 / 14 / 12px                               |
| Panel inner padding             | `--docs-panel-padding`                                 | 20px; 16px on mobile                         |
| Title-to-content spacing        | `--docs-title-gap`                                     | 8px                                          |
| Component / section spacing     | `--docs-block-gap`, `--docs-section-gap`               | 20 / 40px; section spacing is 32px on mobile |
| Paragraph spacing               | `--docs-paragraph-gap`                                 | 16px                                         |
| Panel / control radius          | `--docs-radius`, `--docs-control-radius`               | 8 / 6px                                      |
| Reading measure                 | `--docs-measure`                                       | 72ch maximum article column                  |

The foundation uses `--docs-space-1`, `-2`, `-3`, `-4`, `-5`, `-6`, `-8`, `-10`, `-12`, and `-16` for 4, 8, 12, 16, 20, 24, 32, 40, 48, and 64px. Existing `--docs-space-xs`, `-sm`, `-md`, and `-lg` remain aliases for 4, 8, 16, and 24px. Prefer semantic roles for site customization. One system font family serves headings and reading text; monospace is reserved for code. Plain Markdown fences and `CodeBlock` share code size, leading, and padding. Code blocks use `--docs-code-padding-block` (12px) vertically and panel padding horizontally; disclosure summaries use `--docs-disclosure-padding` (12px) vertically.

Callout colors retain their meanings through `--docs-info`, `--docs-tip`, `--docs-warning`, and `--docs-danger`. Their 12% semantic fills, solid semantic borders, and colored titles make each note distinguishable from the canvas. Keep text and focus contrast readable when changing colors in either theme. Forced-colors mode restores system colors.

Controls distinguish hover, pressed, selected, disabled, and keyboard-focus states. Focus uses a shared 2px accent outline; scrollable tabs and code areas inset it to keep the outline visible. Card links remain on their titles. Cards collapse to one column at the layout's 760px mobile breakpoint. Low-specificity article selectors preserve component titles and internal spacing.

The light canvas is pinned to `#F9FAFB`. Neutral surfaces use very low-chroma cool hues, while the rust accent keeps a hue near 40°. The rust accent and semantic colors use more chroma than the neutral canvas to distinguish navigation, callouts, and syntax. Code surfaces are near-white in the light theme; the header uses the white panel role. The stylesheet ships rounded sRGB hex colors. Chroma describes perceptual color intensity; it is separate from the relative luminance used for contrast.

Run `pnpm check:theme` from this repository to report the actual OKLCH coordinates, relative luminance, and contrast of both palettes. This is also part of `pnpm verify`: normal text pairs must reach 4.5:1, and focus colors must reach 3:1 against the supported surfaces. It checks the default tokens, standard Callout text/title/border pairs, and syntax colors, rather than claiming complete accessibility conformance. The calculations follow [CSS Color 4](https://www.w3.org/TR/css-color-4/#ok-lab) and [WCAG 2.2 relative luminance](https://www.w3.org/TR/WCAG22/#dfn-relative-luminance).

## Syntax highlighting

Add `remarkDocsCode` to the MDX `remarkPlugins` list as shown above. The generated starter includes it. Shiki tokenizes language-labelled fences, `<CodeBlock language="ts" code={"const count = 1"} />`, and static CodeGroup sample arrays during compilation. Tokens use the shared `--docs-code-keyword`, `-string`, `-number`, `-function`, `-type`, `-comment`, and `-punctuation` roles, so light/dark and forced-colors changes work without re-tokenizing. Shiki and its grammars stay out of the client and Worker bundles.

Static `code` and `language` attributes may be strings, string literals in braces, or template literals without interpolation. Dynamic expressions and attribute spreads are not evaluated by the plugin. For server-generated code, call `await highlightDocsCode(code, language)` from `honoxpress/build` and pass the returned `tokens` to `CodeBlock`. Keep that helper on the server/build side. Missing or unsupported languages render as plain text. If code changes without matching tokens, the component falls back to plain text. Copy always uses the original `code` string, and token content is rendered as escaped text.

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

Installed files become application source. Change components and layout directly to fit your routes, content, and design system. The default `public/style.css` imports `./components.css`; keep that import if you want the standard component styles, and its import of `tokens.css`, or replace the three stylesheets with your own. To update a previously copied theme manually, copy `tokens.css` alongside the updated stylesheets; `add` preserves existing application-owned CSS. The CLI records the installed groups and file hashes in `.honoxpress.json`; later additions refresh only the registry's marked block and stop on conflicting destination files. They do not overwrite your copied component implementation.

Nimbus and Fumapress informed the layout hierarchy and component patterns. The Hono JSX, CSS, and icons in these templates are independently implemented; no upstream source code or assets were copied. Preserve the repository's MIT license and notice when distributing copied template files.
