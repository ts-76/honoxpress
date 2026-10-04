# hono-decks real-page pilot

This independent, private consumer app uses published `honoxpress@0.1.3` and `hono-decks@1.0.0`. All dependencies are locked. It installs honoxpress from the public registry and does not use repository package sources, `workspace:*`, or a Vite source alias.

The pilot checks representative real documentation and slide content against the public package, including automatic MDX reload on save, addition, and removal. It is an integration reference rather than a full migration of hono-decks.

## Real content and provenance

Adapted from [hono-decks `docs/app/guides.tsx`](https://github.com/ts-76/hono-decks/blob/965c27468a7c9f75ed84ea3a41bab128b46c544d/docs/app/guides.tsx): the English/Japanese getting-started guides and a small authoring excerpt. The Welcome deck adapts the guide's actual two-slide example, including its per-slide cover metadata. Deck sources are excluded from the generic formatter, which otherwise rewrites the custom slide frontmatter as Markdown headings. The documentation shows that source in a plain-text fence to preserve the same syntax. The source is MIT, copyright 2026 ts-76; its full license is retained in [UPSTREAM-LICENSE](./UPSTREAM-LICENSE).

This is a representative excerpt conversion, not a full migration. Manual TSX sections become static Markdown headings with generated TOC anchors. Counter, copy-code and DemoFrame are consumer-owned additions. Unmigrated guide links are omitted rather than pointing at nonexistent local pages. `decks.paths("welcome")` supplies the deck URLs.

| Existing hono-decks implementation                        | Isolated pilot                                                        |
| --------------------------------------------------------- | --------------------------------------------------------------------- |
| `getGuide(slug, locale)` TSX factories and `/docs/[slug]` | Local MDX under standard `app/routes/docs` and `app/routes/ja/docs`   |
| Manually maintained section IDs                           | Static heading anchors and TOC from `remarkDocsHeadings`              |
| Runtime docs renderer and catalog                         | Docs-only SSG; consumer `_renderer.tsx` and published catalog helpers |
| Existing docs demo router                                 | A separate compiled Welcome deck and clock under `/demo`              |

## Reproduce

Use supported Node (validated locally with 24.12.0) and pnpm 11.22.0. Enter this directory so its independent `pnpm-workspace.yaml` is selected.

```sh
rtk proxy pnpm install --frozen-lockfile
rtk proxy pnpm exec playwright install chromium
rtk proxy pnpm verify
rtk proxy pnpm dev
```

The verification expects `cf@1.0.0-beta.6` on PATH. CI installs it only within its job. Existing local cf/global package-manager configuration is not modified. The application uses the same three-stage client → docs SSG → Worker pipeline as the tested example. `hono-decks compile` runs before development, types and the full build. Generated `app/generated` is ignored and never hand-edited.

For a production local preview, run `pnpm build:cf`, then `pnpm preview`. No deployment is needed. URLs:

| Route                         | Purpose                                          |
| ----------------------------- | ------------------------------------------------ |
| `/docs/getting-started`       | English getting-started guide                    |
| `/ja/docs/getting-started`    | Japanese getting-started guide                   |
| `/docs/スライドを書く`        | English authoring excerpt with Unicode filename  |
| `/ja/docs/スライドを書く`     | Japanese authoring excerpt with Unicode filename |
| `/demo/welcome`               | Actual compiled two-slide viewer                 |
| `/demo/welcome/embed`         | Same-origin deck embed; nested slide iframe      |
| `/demo/clock`, `/demo/status` | Per-request dynamic Hono responses               |

Development is at `http://127.0.0.1:5183`; Worker local preview is at `http://127.0.0.1:8793`. The isolated HMR test server uses port 5185. Tests use disposable application copies under the system temporary directory, preserve the tracked MDX, and stop their process group on exit.

The consumer's `build/honox-watch.ts` adapter registers an absolute `app` directory for HonoX 0.1.61 / Vite Plus 1.0.0, retaining HonoX's route restart callbacks. Recheck this adapter when upgrading HonoX or Vite Plus. The HMR tests confirm the disposable app identity and watched MDX path before editing.

## Verification

Local full acceptance passed with Node.js 24.12.0 on macOS arm64. The dedicated [pilot workflow](../../.github/workflows/hono-decks-pilot.yml) repeats the same acceptance on Ubuntu / Node.js 24.12.0; use its exact-commit result to assess a PR.

| Verification                                                         | Local result                                    |
| -------------------------------------------------------------------- | ----------------------------------------------- |
| Public package resolution and integrity lock                         | Passed; 0.1.3, no workspace/source dependencies |
| Format, lint, types, and deck compilation                            | Passed                                          |
| Client / docs SSG / Worker build and cf dry-run                      | Passed                                          |
| Build regressions                                                    | 5 passed                                        |
| Development and production-local browser tests                       | 6 passed                                        |
| HMR: English/Japanese save updates body, title, nav, TOC, and island | Passed                                          |
| HMR: Japanese add/unlink updates navigation, routing, and real 404   | Passed; one automatic reload per route change   |
| HMR: Unicode MDX save updates the open browser                       | Passed                                          |
| Expected failures, skipped HMR tests, or flaky HMR tests             | Zero                                            |

All three HMR tests must succeed. Assertions after an edit do not call `page.reload` or navigate to refresh content. The evidence receipt rejects expected failures and records the installed package versions. Test edits remain in disposable application copies, so restoring a file cannot trigger a reload during the next test.

Build assertions verify four generated docs, manifest asset files, hashed client paths, removal of obsolete HTML/client/Worker/cf outputs, nonpublic manifest, real 404, and a positive eager-import leakage control. The SSG report skips every `/demo` route; an adversarial dynamic handler confirms zero demo executions. Browser tests verify nav/TOC, translations, Counter after repeat navigation, clock iframe, actual deck embed, second-slide navigation, and encoded Unicode URLs.

Both client and Worker module graphs exclude docs MDX, MDX/remark tooling, `honoxpress/build`, and `hono-decks` Node/CLI/Vite compiler entries. Generated deck modules intentionally remain in the Worker because it serves the deck. They are distinct from the static documentation bodies. Evidence lives under `dist/evidence`, and CI retains it as an artifact.

## Limits and rollback

Experimental compatibility is limited to these pinned dependencies on macOS and CI Linux, using the tested Node version. This does not establish a compatibility range or a full hono-decks migration. Search, drafts, remote/untrusted MDX, deployment, cross-origin embedding, presenter, exports, OGP, and deck-source HMR are outside the pilot. Deck compilation is explicit at startup/build; documentation HMR is tested separately.

This pilot is isolated from the upstream hono-decks application. Discarding this branch or removing `pilots/hono-decks` and its dedicated CI workflow is sufficient to roll back the pilot. There is no production route, registry setting, permission, or deployment to undo.
