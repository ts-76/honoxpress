# Local package evaluation

`@honox-docs-poc/docs` / `0.0.0` is a temporary local evaluation identity.
This package remains private. The final npm name, license, public repository,
and release policy require a user decision. No license grant is implied.

The runtime entry is a pure metadata API. Consumers own standard HonoX
`app/routes`, `_renderer.tsx`, islands and CSS. No router, mounting API, CLI,
runtime MDX compiler, search or draft feature is introduced.

```ts
import { createDocsCatalog } from "@honox-docs-poc/docs";
const docs = createDocsCatalog({
  locales: ["en", "ja"],
  defaultLocale: "en",
  entries: [{ route: "docs/getting-started.mdx", title: "Getting started" }],
});
docs.page("/docs/getting-started");
docs.navigation("en");
docs.translations("/docs/getting-started");
```

Identity comes from the route path; frontmatter `id` is neither required nor
used. Nested paths and `index.mdx` map to standard document URLs. Translations
share a relative slug. Missing translations return a locale with no `href`;
callers can show unavailable text instead of a broken link. Invalid paths,
duplicate URLs, invalid metadata and duplicate heading anchors fail early.
Navigation sorts by optional numeric `order`, then URL. All metadata results
are immutable. Titles remain plain text and rendering must escape them.

Compatibility currently follows the repository's tested HonoX/Vite Plus setup.
The build entry, copyable UI and packed external consumer are verified together;
this evaluation does not promise an npm release.

## Build-only entry

`@honox-docs-poc/docs/build` exports `docsMetadataPlugin`, `remarkDocsHeadings`, and `docsOnlyPlugin`. Import them only in Vite/build configuration. The runtime entry exports no Node API or MDX compiler. The package does not own the build pipeline, router, renderer or server.

Use `docsMetadataPlugin({locales: ["en", "ja"], defaultLocale: "en", worker: mode === "worker"})` before HonoX and register `remarkDocsHeadings` after the frontmatter plugins in `@mdx-js/rollup`. Dev/SSG discover local standard MDX routes and expose their frontmatter/TOC through `virtual:honox-docs/catalog`. Worker mode returns an empty catalog without reading or importing docs. **A Worker using HonoX's default eager router will still import MDX:** consumers must supply literal dynamic route globs via `honox/server/base`, as in the example.

The remark plugin adds deterministic Unicode heading anchors and a `toc` named export, avoids duplicate/suffixed collisions, and does not evaluate MDX expressions for heading text. Expression-only headings fail; the slug algorithm is this package's small documented algorithm, not GitHub-slugger compatibility.

Pass `docsOnlyPlugin({locales, defaultLocale}, report)` before `defaultPlugin()` to Hono SSG. It rejects `/demo/*` and colon/wildcard discovery before request execution. Client→SSG→Worker remains an explicit consumer pipeline. `resolveClientScript(manifest, "app/client.ts")` fails on missing/unsafe assets; use the ordinary dev client URL during development. Consumers copy CSS/assets and remove public build metadata after all stages. See `examples/poc/vite.config.ts` and its `_renderer.tsx` for the full integration.

## Copyable standard UI

Copy `templates/docs-ui.tsx` and `templates/demo-frame.tsx` into `app/components`, `templates/copy-code.tsx` into **`app/islands`**, and `templates/docs.css` into your public stylesheet. Templates are available through `@honox-docs-poc/docs/templates/*`; resolve/read them as files, then copy them. Importing the island directly from the package does not give HonoX a consumer island route and is not supported. No installer CLI or React runtime is required. The example renderer shows nav/TOC/language composition. Adjust names, links, wording, tokens and layout in your owned files. Missing translations render unavailable text without a link.

The starter uses a restrained three-column reading layout, native mobile navigation/TOC disclosures, meaningful landmarks, current-page navigation, skip link, visible keyboard focus, selectable/scrollable code, live copy feedback (including failure), system fonts, color-scheme-aware tokens and reduced-motion support. The browser fixture checks representative contrast/keyboard/mobile behavior; this is not a full accessibility certification.

## References and acknowledgements

Thank you to **Cloudflare Nimbus** and **Fumapress** for their thoughtful documentation UI and ownership model. These are the exact references named in the original design, not a substitution for a similarly named product:

- Nimbus [philosophy](https://nimbus-docs.com/philosophy/) / [registry](https://nimbus-docs.com/registry/) / [source](https://github.com/cloudflare/nimbus). Its desktop reading width, typography, whitespace, sidebar/TOC hierarchy and mobile overview inspired this starter.
- Fumapress [docs](https://press.fumadocs.dev/docs) / [plugins](https://press.fumadocs.dev/docs/plugins) / [config source](https://github.com/fuma-nama/fumapress/blob/main/packages/core/src/config.tsx) / [repository](https://github.com/fuma-nama/fumapress). Its quiet current-page accent, code actions and mobile TOC informed the interaction design.

Desktop (1440px) and mobile (390px) UI were observed on 2026-10-01. Nimbus is [MIT, Cloudflare copyright 2025](https://github.com/cloudflare/nimbus/blob/main/LICENSE); Fumapress is [MIT, Fuma copyright 2026](https://github.com/fuma-nama/fumapress/blob/main/LICENSE). This starter's JSX/CSS/icons were independently written: no source code, logo, font or other asset was copied. If future changes copy source or assets, review that exact file's license and preserve required copyright/license/NOTICE. These references do **not** choose this project's final license, which remains undecided.

## Packed consumer validation

From the repository, run `pnpm test:consumer`. It cleans/builds the package, packs it without publishing, checks the files allowlist and exports, and installs it into a fresh directory outside the repo. Consumer type checks use emitted declarations and expected type failures. Runtime imports exclude Node/MDX/React/compiler modules; private source paths are not exported. Templates/CSS are copied from the installed tarball, then standard HonoX builds, 5 build regressions, 6 browser checks and global cf dry-run run independently. Successful temporary directories are removed. Failed directories and `artifacts/*.log` remain for diagnosis.

`pnpm pack:docs` makes the evaluation tarball only. The package remains private, final identity/license are undecided, and no registry auth/token/publish step is run. The tarball includes compiled ESM/declarations, selected editable UI templates and this README; it excludes package source, tests, configs, internal evidence and application docs. Exported CSS is marked as a side effect for bundlers. Packed evidence is recorded in `packages/docs/evidence/consumer.json`; tarballs are local artifacts, not committed releases.

## Compatibility and release gate

Local acceptance uses macOS arm64 / Devbox Node 24.12.0. CI checks exact PR commits on Ubuntu / Node 22.23.3, 24.12.0 and 24.21.0; inspect each run result rather than treating a committed snapshot as CI proof. The newest observed LTS (2026-10-01) is 24.21.0; Node 26 is Current and unverified. Toolchain engines also admit untested combinations. No actual Cloudflare deployment, other browser/OS, arbitrary docs parameter routing, SPA state, exhaustive HMR or accessibility certification is promised.

Before any release, the owner must choose the final name/scope, license/copyright, repo visibility, contribution/version/migration policy and npm maintainer/authentication approach. Add and verify the chosen license/notices in the tarball under that approval, then re-run the complete external consumer and exact-commit CI. Copied template updates require documented manual migration; they must not silently overwrite consumer files. The evaluation scripts intentionally keep the package private and perform no publish/auth/token/deploy. Integration, compatibility, contribution and release-decision guides are in the repository docs.
