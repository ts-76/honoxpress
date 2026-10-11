# Updating existing documentation sites

honoxpress installs editable application source. Updating the npm dependency does
not replace copied components, CSS, or layouts. `init` and `add` preserve existing
files; they are not upgrade commands.

This guide covers four responsive template fixes: theme-selector spacing, stable
navigation wrapping, long code filenames, and adjacent API-reference separators.
They do not change component props, routes, content, or theme persistence.

## Choose the template source

These fixes are unreleased until a package containing this change is published.
Do not assume `honoxpress@0.2.0` contains them. Before publication, review the files
from the Git commit containing this change. After publication, install an explicit
version containing the fixes and use that package's exported templates.

Create a branch in your application and commit your current customizations before
comparing files. The default installed destinations are:

| Package template             | Application file                  | Changes to merge                          |
| ---------------------------- | --------------------------------- | ----------------------------------------- |
| `templates/docs.css`         | `public/style.css`                | Navigation weight and code-toolbar layout |
| `templates/components.css`   | `public/components.css`           | Theme selector and API separators         |
| `templates/theme-switch.tsx` | `app/components/theme-switch.tsx` | Decorative chevron                        |

Paths may differ with custom destinations. Keep `style.css`'s import of
`components.css`, and `components.css`'s import of `tokens.css`.

To stage templates from an **installed package containing the fixes**, run this
from your application's root. This writes to a temporary directory only:

```sh
export HONOXPRESS_REVIEW_DIR="$(mktemp -d)"
pnpm exec node --input-type=module <<'NODE'
import { copyFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

for (const name of ["docs.css", "components.css", "theme-switch.tsx"]) {
  const source = fileURLToPath(import.meta.resolve(`honoxpress/templates/${name}`));
  copyFileSync(source, join(process.env.HONOXPRESS_REVIEW_DIR, name));
}
console.log(`Review templates in ${process.env.HONOXPRESS_REVIEW_DIR}`);
NODE

git diff --no-index -- public/style.css "$HONOXPRESS_REVIEW_DIR/docs.css"
git diff --no-index -- public/components.css "$HONOXPRESS_REVIEW_DIR/components.css"
git diff --no-index -- app/components/theme-switch.tsx "$HONOXPRESS_REVIEW_DIR/theme-switch.tsx"
```

`git diff --no-index` exits with status 1 when files differ; that is expected.
Before publication, copy the three files from `packages/docs/templates/` in the
chosen Git checkout into the review directory instead. Merge the changes below
rather than replacing a customized stylesheet.

## 1. Update the theme selector's JSX and CSS together

Keep the native `<select>`, accessible label, `data-hx-theme-switch`, and options.
Immediately after `</select>`, inside the same label, add:

```tsx
<svg
  class="hx-theme-chevron"
  width="16"
  height="16"
  viewBox="0 0 16 16"
  fill="none"
  aria-hidden="true"
  focusable="false"
>
  <path
    d="m4 6 4 4 4-4"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
</svg>
```

Merge these rules into `components.css`, retaining the select's existing colors,
border, typography, disabled state, and focus styles:

```css
.hx-theme-switch {
  position: relative;
  display: inline-flex;
  align-items: center;
}
.hx-theme-switch select {
  min-width: 7.5rem;
  padding-inline-end: calc(var(--docs-space-3) * 2 + 16px);
  appearance: none;
}
.hx-theme-chevron {
  position: absolute;
  inset-inline-end: var(--docs-space-3);
  color: var(--docs-muted);
  pointer-events: none;
}
```

The JSX and CSS must ship together: `appearance: none` removes the native arrow,
and the SVG replaces it. Keep `ThemeScript` in `<head>` before the stylesheet;
its initialization, storage key, and Light / Dark / System behavior are unchanged.

## 2. Keep navigation typography stable

In `style.css`, add `font-weight: var(--docs-weight-ui)` to `.docs-nav a` and remove
`font-weight` from `.docs-nav a[aria-current="page"]`. Keep the selected background
and text color. Apply the same principle to custom mobile navigation: selecting a
page must not change the label's text metrics.

## 3. Allow long filenames to wrap

Merge into `style.css`:

```css
.code-filename {
  min-width: 0;
  overflow-wrap: anywhere;
}
.code-toolbar button {
  flex-shrink: 0;
  white-space: nowrap;
}
```

Keep the toolbar's existing gap and padding. Filenames can use multiple lines
while the copy action stays on one line. Preserve CodeGroup's more specific rules
that place its copy button in the tab row. Very long custom copy labels may need
shorter wording on narrow screens.

## 4. Use one separator between adjacent API references

Add after the existing `.hx-api-reference` rule in `components.css`:

```css
.hx-api-reference + .hx-api-reference {
  border-top: 0;
}
```

Keep the base top and bottom borders. The first or standalone reference retains
both; an immediately following reference shares the preceding bottom separator.
References separated by other content retain their own top border.

## Verify the merged application

Run the application's build and existing checks. Inspect English and Japanese at
1280px, 390px, and 320px in light and dark themes:

- Theme selection: labels clear the arrow; Light / Dark / System work; keyboard
  focus remains visible. Check the desktop header and open mobile menu.
- Navigation: a long label retains its wrapping and item height when selected.
- Code block: a long filename is readable, Copy and Copied stay on one line, and
  copying succeeds. Check CodeGroup too.
- API references: consecutive entries have one separator; standalone entries keep
  their outer borders.
- No page-wide horizontal overflow. Long code and tables may still scroll inside
  their own containers.

Scope old site-specific CSS under a dedicated class, such as `.home`, and check
later overrides of `.docs-nav`, `.code-toolbar`, and `.hx-theme-switch`. Broad
legacy selectors can undo the merged rules. Deploy after reviewing your application
diff and verifying its rendered pages. Test Safari on a real device when available;
Chromium checks alone do not establish native-control behavior on every browser.
