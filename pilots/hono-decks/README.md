# hono-decks real-page pilot

This independent, private consumer app evaluates the published `honoxpress@0.1.1` with published `hono-decks@1.0.0`. Both versions and all dependencies are locked. It does not use repository package sources, `workspace:*`, unpublished 0.1.2, or a Vite alias to honoxpress source.

The public registry still served 0.1.1 when this pilot was created on 2026-10-03. The existing 0.1.2 release at commit `2912c5bdbc8fa6537bb7aeb4bbc73583b26e6029` was staged with provenance and awaited owner 2FA. That release is separate from the subsequent HMR fix candidate. Publishing or approving either is outside this pilot.

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

The consumer's `build/honox-watch.ts` adapter registers an absolute `app` directory instead of HonoX 0.1.61's relative `./app/**` glob, retaining its restart callbacks and other plugins. The original registration can leave routes absent from the initial Linux watcher; simply enabling relative globs also failed save invalidation. Fixture identity and the current MDX's watched path are checked before any test edit. This pinned-version setup fix does not resolve published 0.1.1's save reload failure; recheck the adapter when upgrading dependencies.

## Verification and known HMR failure

Local results with Node 24.12.0:

| Verification                                         | Result                                          |
| ---------------------------------------------------- | ----------------------------------------------- |
| Registry package resolution and integrity lock       | Passed; 0.1.1, no workspace/source dependencies |
| Format, lint (deny warnings), and types              | Passed                                          |
| Typecheck, deck compilation, client/SSG/Worker build | Passed                                          |
| Build tests                                          | 5 passed                                        |
| Development and production local browser tests       | 6 passed                                        |
| HMR: Japanese MDX add/unlink backend routing and 404 | Passed                                          |
| HMR: saved Unicode MDX after manual reload           | Passed                                          |
| HMR: automatic MDX save reload in published 0.1.1    | **Expected failure, reproduced**                |

The last test is explicitly marked `test.fail` for pinned 0.1.1; a green HMR command therefore does **not** mean automatic save reload works. JSON evidence records that test's expected failure, and the receipt checks that its actual error is the stale MDX body. The first plain reproduction failed while the browser retained the old guide. HonoX disables the default dev-server reload hook, and 0.1.1 only requests reload for MDX add/unlink. Reload the page after the watcher processes a save, or restart development. [Core fix PR #21](https://github.com/ts-76/honoxpress/pull/21) adds save reload and tests both the example and an installed tarball; this pilot intentionally remains on the published version.

Automatic add/unlink reload also races HonoX's route restart on Linux: CI captured an aborted document request when reload was sent before the SSR transport had been replaced. The published-version test verifies backend route changes and 404; automatic navigation refresh is not claimed to pass. If navigation is stale after reload, restart the development process. PR #21 tests automatic refresh after awaiting the shared public restart promise. The fixture uses a websocket round trip before edits, so a missing initial HMR connection cannot masquerade as the known save failure.

Build assertions verify four generated docs, manifest asset files, hashed client paths, removal of obsolete HTML/client/Worker/cf outputs, nonpublic manifest, real 404, and a positive eager-import leakage control. The SSG report skips every `/demo` route; an adversarial dynamic handler confirms zero demo executions. Browser tests verify nav/TOC, translations, Counter after repeat navigation, clock iframe, actual deck embed, second-slide navigation, and encoded Unicode URLs.

Both client and Worker module graphs exclude docs MDX, MDX/remark tooling, `honoxpress/build`, and `hono-decks` Node/CLI/Vite compiler entries. Generated deck modules intentionally remain in the Worker because it serves the deck. They are distinct from the static documentation bodies. Evidence lives under `dist/evidence`, and CI retains it as an artifact.

## Limits and rollback

Experimental compatibility is limited to these pinned dependencies on macOS and CI Linux, using the tested Node version. This does not establish a compatibility range or a full hono-decks migration. Search, drafts, remote/untrusted MDX, deployment, cross-origin embedding, presenter, exports, OGP, and deck-source HMR are outside the pilot. Deck compilation is explicit at startup/build; documentation HMR is tested separately.

The existing hono-decks application and its dirty worktree remain untouched. Discarding this branch or removing `pilots/hono-decks` and its dedicated CI workflow is sufficient to roll back the pilot. There is no production route, registry setting, permission, or deployment to undo.
