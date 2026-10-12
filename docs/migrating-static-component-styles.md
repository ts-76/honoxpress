# Migrating static component styles

This unreleased change moves static component defaults into their copied TSX
sources using `hono/css`. Published 0.2.1 uses the previous shared CSS arrangement.
Updating the dependency alone does not update application-owned files. Merge this
change after it is released, or evaluate a packed candidate on a separate branch.

## Merge the sources and layout first

Compare the package templates with these application files:

| Package template      | Typical application file             |
| --------------------- | ------------------------------------ |
| `docs-content.tsx`    | `app/components/docs-content.tsx`    |
| `file-tree.tsx`       | `app/components/file-tree.tsx`       |
| `type-table.tsx`      | `app/components/type-table.tsx`      |
| `figure.tsx`          | `app/components/figure.tsx`          |
| `definition-list.tsx` | `app/components/definition-list.tsx` |
| `api-reference.tsx`   | `app/components/api-reference.tsx`   |
| `demo-frame.tsx`      | `app/components/demo-frame.tsx`      |
| `docs-layout.tsx`     | `app/components/docs-layout.tsx`     |

Merge the `css` declarations and their class-attribute registration, keeping local
markup, props, translated labels, and behavior. The declarations use stable global
selectors and the existing tokens. Preserve application overrides separately from
the default declarations. For a custom renderer or layout, add one `<Style />`
from `hono/css` to `<head>` before the stylesheet link. `DocsLayout` passes its
existing `nonce` to both `Style` and `ThemeScript`.

Do not stringify CSS objects or replace their class registration with plain
strings. Do not add a separate `Style` to every component. When using CSP, authorize
inline styles with the request's nonce. Streaming or late Suspense content can
also need a script nonce; the starter's ordinary SSR and SSG paths embed styles
directly without style-append scripts.

## Remove only migrated default rules

Once the merged components render correctly, compare your stylesheets against the
new `templates/components.css` and `templates/docs.css`:

- Remove old defaults for `.hx-callout*`, `.hx-card*`, `.hx-step*`,
  `.hx-accordion*`, FileTree (`.hx-file-*` / `.hx-folder*`), `.hx-type-table*`
  / `.hx-property-*`, `.hx-figure*`, `.hx-definition-*`, and `.hx-api-*` only for
  components whose sources you have migrated.
- Remove DemoFrame defaults (`.demo-frame`, `.demo-title`, `.demo-indicator`)
  from your base stylesheet after migrating `demo-frame.tsx`.
- Retain your custom overrides, shared tokens, Markdown rules, shell styles,
  `.hx-tab*`, `.hx-code-group*`, code toolbar/syntax styles, and theme controls.
  Keep the `tokens.css` import.

Review mixed selector lists and media queries carefully: for example, a focus rule
may cover both Accordion and Tabs. Remove the migrated selector while retaining
the Tabs selector. Do not replace a customized stylesheet wholesale or re-run
`init` with the expectation that it upgrades existing sources.

The new defaults have the same selector specificity as the old defaults and
appear before the application's stylesheet. Token and unlayered class overrides
continue to work. A shell that previously wrapped all component defaults and
overrides in cascade layers needs a deliberate layer migration: either wrap the
copied component defaults in the matching layer or move its overrides into an
unlayered stylesheet. Check this before deleting its old defaults.

## Verify the resulting site

Check English and Japanese pages at desktop and narrow mobile widths in both
themes. Include a component page, a page with few components, native disclosures,
long property types/file names, API separators, and a static component inside a
tab panel. Confirm local token and class overrides still apply, and retain checks
for Markdown, theme selection, and code copying.

Inspect the generated HTML: `style#hono-css` should contain the static components
used on that page and omit unused families. Repeated components should not repeat
their rules. Run SSR and SSG checks in separate requests and confirm CSP nonces
reach the style element. Retain your existing Island hydration and deployment
checks; static style migration does not require migrating Island CSS.
