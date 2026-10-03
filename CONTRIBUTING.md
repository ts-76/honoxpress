# Contributing to the evaluation

The repository is public and honoxpress@0.1.0 is published under MIT as of 2026-10-03. The package name is honoxpress. The owner approved MIT, honoxpress@0.1.0 and npm owner ts-76 on 2026-10-02; see [LICENSE](LICENSE). Initial staging and owner 2FA approval are complete. Contribution/support and the real-page pilot remain pending decisions; subsequent releases need an approved version and verified artifact. Please resolve [Issue #6](https://github.com/ts-76/honoxpress/issues/6) before soliciting public contributions or adopting this in hono-decks.

Use the existing Node environment manager. This Mac uses Devbox global Node 24.12.0/pnpm 11.22.0 and global cf 1.0.0-beta.6; do not add another manager or modify shell PATH to work around activation. Other machines can use their established manager to select a documented CI version. See [compatibility](docs/compatibility.md).

```sh
pnpm install --frozen-lockfile
pnpm --filter honoxpress-example exec playwright install chromium
pnpm verify
pnpm evidence
```

Work in a branch and open a Draft PR with the trigger/problem, changed behavior and verification results. The initial dependent PR stack is integrated into main; its release source is v0.1.0. New PRs need review and integration authorization. Run the full pipeline after changes affecting routing, exports, islands, assets or dependencies. The pipeline uses ports 5173/8787 and packed-consumer ports 5177/8789, and owns their server lifecycle. Do not run a manual server on those ports during acceptance.

Keep the runtime entry independent of Node, MDX and build tooling. Build helpers belong under `./build`. Consumers own standard HonoX routes, renderer, islands and CSS: do not introduce mounting APIs, a hidden router or a React requirement. Treat local MDX as trusted executable code; support for untrusted content needs a separate design.

Tests protect module graphs (including a positive eager-import control), pre-execution SSG filtering, stale output cleaning, manifest/assets, typed APIs, real browser behavior and tarball installation without workspace/source links. Extend tests when behavior changes; do not weaken assertions to accept a leak. `pnpm check` and `pnpm lint` include type-aware lint; `.gitignore` must accompany standalone consumer projects to exclude dependencies and generated output. `tsc` is an independent check of emitted types.

Copyable template changes must be synchronized with the example's owned files. Retain Nimbus and Fumapress acknowledgements in the packed README and public documentation. Independently written UI is recorded separately from any future copied source/assets; copied materials require their exact upstream license and notices.

CI runs on the exact proposed commit with read-only repository access, pinned official Actions and no deploy/publish step or external-service credentials. It retains evaluation diagnostics for seven days. Failed external consumers remain locally for diagnosis; successful ones are removed. Do not commit tarballs, credentials or generated service types. Report bugs with versions, reproduction, failing route/mode and relevant sanitized output; avoid secrets in logs.
