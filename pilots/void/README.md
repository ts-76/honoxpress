# honoxpress on Void: TSX pilot

This isolated consumer tests published honoxpress templates inside Void Hono Pages.
It is a compatibility experiment, not an official Void scaffold or an MDX adapter.
It does not change honoxpress's published templates or the HonoX starter.

Pinned dependencies: honoxpress **0.3.0**, void-plugin-hono-jsx **0.2.0**,
Void **1.1.11**, Hono **4.13.13**, Vite **8.3.4**. Use Node **24.21.0**
and npm **11.19.0**, the versions used for the recorded checks.
This directory is intentionally outside the root pnpm workspace's package globs.
Its npm lockfile keeps Vite independent of the workspace's Vite Plus override.

## Run locally

```sh
cd pilots/void
npm ci
npm run components:sync
npm run dev
```

Open `http://127.0.0.1:5195/en` or `http://127.0.0.1:5195/ja`.
Each language has a component page and an API reference page.
Use the navigation links to exercise client navigation and the language links to
switch between equivalent pages. On mobile, the theme selector is in the menu.

The sync command reads templates from the installed npm package into `.generated/`.
The baseline copy is unchanged. The adapted copy changes only the `hono/html`
class-tag import in `docs-content.tsx`, `file-tree.tsx`, and `type-table.tsx`.
It reuses the published CSS, tokens, interactive components, and theme control.
SHA256 hashes of the input templates are recorded in `.generated/template-hashes.json`.
Sync intentionally fails if the expected version or integration markers change.

## Reproduce the checks

```sh
npx playwright install chromium
npm run verify
```

Verification owns ports **5196**, **5195**, and **4195**, sequentially. Stop a
manually started pilot server first: simultaneous workers in the same project can
contend for Void's local SQLite state. No deployment or Cloudflare login is needed.
The verifier shuts down its own servers and browser when it finishes.

It reproduces the unmodified-template failures, tests the adapted development
server, runs TypeScript and a production build, then tests the production preview.
Results, server logs and screenshots are saved in `evidence/` (ignored by Git).
The browser matrix uses Chromium at 1280px, 390px and 320px; mobile contexts enable
touch and mobile viewport behavior. These are browser emulations, not physical
iOS/Android device tests.

For manual production preview after verification:

```sh
npm run preview
```

## Integration files

| File | Purpose |
| --- | --- |
| `pages/layout.tsx` | Content-only honoxpress shell using Void's router and head ownership |
| `integration/ssr-css-plugin.ts` | Finalize Hono SSR callbacks and place collected CSS before application styles |
| `integration/style-host.tsx` | Preserve the CSSOM host outside the redrawn `#app` root |
| `integration/component-class.ts` | Preserve server callbacks and synchronous DOM class serialization |
| `integration/theme-bootstrap.ts` | Add a render lifecycle event to the published early initializer |
| `integration/pilot.css` | Two-column shell, narrow header labels and an equal-specificity consumer override |
| `scripts/sync-components.mjs` | Regenerate unchanged/adapted consumer-owned templates from npm |
| `scripts/verify.mjs` | SSR, navigation, CSS, theme and responsive acceptance checks |

The SSR plugin patches `virtual:void-pages-renderer` generated source. This is
deliberately version-pinned and fails if the expected source markers change.
It is evidence for an upstream renderer change; do not adopt this text transform
as a stable production integration API. The prototype also uses the exported
`hono/utils/html` callback resolver, whose internals need compatibility coverage.

Read the [findings and Markdown-first direction](../../docs/void-tsx-pilot.md) before
extending the experiment.

To test the current working-tree library instead of the published baseline, run
`node scripts/verify-void-current.mjs` from the repository root after
`pnpm build:package`. It packs the library into an independent temporary consumer,
uses `candidate/layout.tsx` with the public frame/catalog/theme APIs, and leaves
only the Void SSR workaround in place. See the
[framework integration guide](../../docs/framework-integration.md#reproduce-the-integration-checks).
