# Contributing to honoxpress

Report bugs and proposals in [GitHub Issues](https://github.com/ts-76/honoxpress/issues). Include package/toolchain versions, reproduction steps, the affected URL, and the failing dev/SSG/Worker stage. Keep credentials and private content out of logs. See the [maintenance and upgrade policy](docs/maintenance.md) for compatibility, consumer-owned templates, and change acceptance. Broader adoption in hono-decks remains tracked in [Issue #6](https://github.com/ts-76/honoxpress/issues/6).

Use your existing Node environment manager to select a tested runtime. The reference development setup uses Node.js 24.12.0, pnpm 11.22.0, and `cf@1.0.0-beta.6`. See [compatibility](docs/compatibility.md) for the CI matrix and other dependency versions.

## Development setup

```sh
pnpm install --frozen-lockfile
pnpm --filter honoxpress-example exec playwright install chromium
pnpm verify
pnpm evidence
```

Work in a branch and open a Draft PR with the problem, changed behavior, and verification results. PRs require review and maintainer approval before integration. Run the full pipeline after changes affecting routing, exports, islands, assets, or dependencies. The pipeline uses ports 5173/8787 and packed-consumer ports 5177/8789, and owns their server lifecycle. Do not run a manual server on those ports during acceptance.

For documentation-only changes, check formatting, links, and any edited examples. The PR workflow also runs the full acceptance pipeline.

## Architecture and verification

Keep the runtime entry independent of Node, MDX and build tooling. Build helpers belong under `./build`. Consumers own standard HonoX routes, renderer, islands and CSS: do not introduce mounting APIs, a hidden router or a React requirement. Treat local MDX as trusted executable code; support for untrusted content needs a separate design.

Tests protect module graphs (including a positive eager-import control), pre-execution SSG filtering, stale output cleaning, manifest/assets, typed APIs, real browser behavior and tarball installation without workspace/source links. Extend tests when behavior changes; do not weaken assertions to accept a leak. `pnpm check` and `pnpm lint` include type-aware lint; `.gitignore` must accompany standalone consumer projects to exclude dependencies and generated output. `tsc` is an independent check of emitted types.

Copyable template changes must be synchronized with the example's owned files. Retain Nimbus and Fumapress acknowledgements in the packed README and public documentation. Independently written UI is recorded separately from any future copied source/assets; copied materials require their exact upstream license and notices.

PR verification runs on the exact proposed commit with read-only repository access, pinned official Actions, and no deploy/publish step or external-service credentials. It retains diagnostics for seven days. Failed external consumers remain locally for diagnosis; successful ones are removed. Do not commit tarballs, credentials, or generated service types.

## Release PRs

Use Conventional Commit titles for squash merges (`fix:`, `feat:`, and `!` for breaking changes). With a merge commit, ensure a Conventional Commit appears in the merged history. main push runs release-please to maintain a version/changelog PR. Review and pass its exact-head CI before merging; that merge creates a tag/GitHub Release and prepares accepted artifacts. npm stage/2FA is a separate step described in [the release guide](docs/npm-release.md). Only the package in packages/docs is published; the root remains private. Existing v0.1.0 is the immutable bootstrap baseline.
