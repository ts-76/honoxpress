# Integrating another Hono JSX framework

The APIs on this page are included in **honoxpress 0.4.0**. Version 0.3.0
does not contain these integration primitives.
Existing HonoX applications can keep `createDocsCatalog` and `DocsLayout`.

For new Void-facing authoring, prefer the [Markdown-first component boundary](markdown.md).
`createDocsMarkdownRenderer` from `honoxpress/markdown` dispatches parsed component
nodes to static wrappers or an explicit host island adapter. It does not parse
Markdown or require a full MDX compiler. The existing MDX integration remains
supported.

## Explicit page metadata

Framework adapters can provide paths without inventing HonoX MDX filenames:

```ts
import { createDocsCatalogFromPages } from "honoxpress";

const catalog = createDocsCatalogFromPages({
  locales: ["en", "ja"],
  defaultLocale: "en",
  pages: [
    { locale: "en", slug: "start", href: "/en/start", title: "Start" },
    { locale: "ja", slug: "start", href: "/ja/start", title: "はじめに" },
  ],
});
```

`slug` is a shared, path-like translation key; it does not dictate a route layout.
`href` is a site-local pathname. Unicode segments are canonicalized to encoded
URLs; queries, fragments, traversal, escaped separators and external URLs fail.
Duplicate URLs and duplicate locale/slug identities fail. Root pages can use
`href: "/"` and `slug: ""`. An optional `route` records a diagnostic source such
as `pages/en/start.tsx`; it has no HonoX extension/discovery rules.
Metadata, heading checks, immutable results, ordering, lookup and missing
translations follow the existing catalog contract. Framework adapters still own
file discovery, compiler metadata and development updates.

## A body-only frame

The copied `docs-layout.tsx` also exports `DocsFrame`. It shares the same markup,
tokens and controls as `DocsLayout`, without `html`, `head`, `body`, `Style`,
ThemeScript or a client entry. The host framework owns those document concerns.

```tsx
import { DocsFrame } from "./components/docs-layout";

<DocsFrame
  current={catalog.page(pathname)}
  pages={catalog.navigation(locale)}
  translations={catalog.translations(pathname)}
  locale={locale}
  config={docsSite}
  link={RouterLink}
>
  {children}
</DocsFrame>;
```

`RouterLink` implements `DocsLinkComponent` from the copied `docs-ui.tsx` (also
re-exported by `docs-layout.tsx`). It accepts `href`, `children`, `class`, `lang`,
`hrefLang` and `aria-current`, and returns a Hono JSX anchor/router link. Brand,
sidebar/mobile navigation, breadcrumbs and language links use it. Fragment links
and external repository links remain native anchors. Leaving `link` unset keeps
ordinary document navigation. `DocsLayout` still owns a complete HonoX document
and composes the same frame with the default native links.

## CSS ownership

The runtime `componentClass` tag preserves stable `.hx-*` classes while retaining
both SSR callbacks and CSS handles' synchronous DOM stringification. Copied static
templates use it automatically; class selectors, CSS declarations and specificity
have not changed. Custom class composition can use it in a class attribute:

```tsx
import { css } from "hono/css";
import { componentClass } from "honoxpress";

const styles = css`
  :-hono-global {
    .example {
      color: var(--docs-text);
    }
  }
`;
const Example = () => <aside class={componentClass`${styles}example`}>Content</aside>;
```

This is a class tag, not a general HTML escaping API. Values are CSS handles,
authored class strings or numbers. Let Hono JSX await it during SSR; the DOM
renderer stringifies it directly. Do not synchronously stringify CSS handles in
server code.

The host renderer must finish Hono HTML callbacks, emit a single style host before
application styles, and keep its CSSOM node outside any replaced client root.
Head metadata synchronization must preserve that node. These are framework
responsibilities; the class helper alone does not supply SSR CSS collection.
HonoX's existing `DocsLayout` already supplies its Style element. The Void pilot
still needs a version-pinned SSR workaround until
[void-plugin-hono-jsx#116](https://github.com/ts-76/void-plugin-hono-jsx/issues/116)
is implemented. It is not a supported production adapter yet.

## Theme lifecycle

The copied `theme-switch.tsx` exports `themeInitializer` (literal browser source)
and `syncThemeSwitches()` alongside the existing `ThemeScript` and `ThemeSwitch`.

- Put `themeInitializer` in the framework's early head-script API before CSS, or
  render `ThemeScript` in a document you own. Preserve the request nonce if CSP
  requires one.
- Call `syncThemeSwitches()` after initial mount and after route/locale rendering
  has created or replaced controls. A framework effect keyed to the current page
  is sufficient.
- Repeating the bootstrap or synchronization is safe. One controller per window
  owns change/media/storage listeners and the current preference. Storage being
  unavailable still permits in-page selection.
- Without the early bootstrap, synchronization does nothing and controls retain
  their server-disabled fallback. Avoid executing the bootstrap on the server.

Light/dark/system semantics, `honoxpress-theme` persistence, first-render timing,
storage-event behavior and ThemeScript's nonce prop remain compatible.

## Upgrade consumer-owned files

When upgrading to 0.4.0 or later:

1. Update the package first, retaining the site's supported Hono version.
2. Merge the class import change into all static templates that composed CSS via
   `hono/html`: docs-content, file-tree, type-table, figure, demo-frame,
   definition-list and api-reference. Keep the application's CSS bodies and props.
3. Merge the idempotent bootstrap and synchronization exports into theme-switch.
   Existing HonoX sites need no new lifecycle hook for document navigation.
4. Adopt DocsFrame/router links and explicit catalog entries only if the host
   framework needs them. Keep the document wrapper and HonoX catalog otherwise.
5. Verify SSR with JavaScript disabled, theme persistence, page/locale navigation,
   consumer overrides and narrow screens. An npm update does not rewrite copied
   files, and rerunning the CLI does not overwrite owned customizations.

For a local candidate, build and pack the repository and install that tarball;
versions before 0.4.0 do not have these exports.

## Reproduce the integration checks

With Node 24.21.0 and the locked dependencies installed in `pilots/void`:

```sh
pnpm build:package
node scripts/verify-void-current.mjs
```

The script packs the working-tree library and extracts it in an independent
temporary consumer. Other dependencies are symlinked from the locked pilot
installation; this verifies the candidate's package contents and framework graph,
not a second fresh network installation of every dependency. Ports 5295 and 4295
are used sequentially. Results, package integrity and the consumer path are saved
under `artifacts/void-current/`. Published-version baseline checks remain available
through the ordinary `pilots/void` verifier.

The candidate uses DocsFrame, the explicit catalog and the new theme sync API,
with unchanged class imports and no literal theme patch. Only the Void-owned
SSR/style-host workaround remains. The [pilot report](void-tsx-pilot.md) records
observed limits and the separate Markdown adapter work; these APIs do not add
Markdown discovery, parsing, islands or static export to Void. The HonoX example
contains separate `.md` fixtures for testing the honoxpress-owned boundary.
