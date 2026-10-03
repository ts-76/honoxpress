# SSR MDX save regression

Published `honoxpress@0.1.1` leaves an open documentation page unchanged after its MDX source is saved. HonoX overrides `@hono/vite-dev-server`'s reload hook; updating Vite's SSR module cache alone does not refresh the document. The metadata plugin already requested full reload for add/unlink, but omitted save changes.

The fix adds a scoped `handleHotUpdate`: only MDX inside the configured route root requests a full document reload, after the save is readable and the virtual metadata catalog is invalidated. For add/unlink it awaits HonoX's shared public restart promise. Vite's client reloads automatically after that restart closes and reconnects its websocket; sending an additional full-reload can cause a second document navigation to abort a link. The regression checks one automatic parent navigation per route addition/removal, including a return to the Counter. Worker mode returns immediately, keeping its empty docs catalog and no filesystem discovery. Full reload resets Island state; this does not promise state-preserving component HMR.

`examples/poc/tests/hmr` changes disposable copies of the standard HonoX app. A fixture-only HMR round trip confirms that the parent document's websocket is connected before edits. Tests assert changed English/Japanese body, frontmatter title, sidebar title and TOC without a test-issued reload; then verify the rehydrated Counter. A second test adds/removes a Japanese filename, checks automatic navigation refresh, follows the Unicode URL, verifies 404 after removal and operates the Counter after returning.

```sh
rtk proxy pnpm install --frozen-lockfile
rtk proxy pnpm build:package
rtk proxy pnpm --filter honoxpress-example test:hmr
rtk proxy pnpm test:consumer
```

The root example uses the built local candidate. `test:consumer` additionally packs the candidate, installs it in a temporary directory outside the repository with no source/workspace links, and runs the same two HMR tests in its full verification. That consumer's original browser test count remains six; HMR has a separate two-test JSON report. Both flow through the existing three-Node CI matrix.

The source package still carries the base 0.1.2 version until release-please prepares a later release. This is an **unpublished fix candidate**, not the existing staged 0.1.2 at `2912c5bdbc8fa6537bb7aeb4bbc73583b26e6029`. A separate real-page pilot remains pinned to registry 0.1.1 and records the known failure. No npm approval, staging, publishing, merge or deployment is part of this fix.

## Initial watcher compatibility

With pinned HonoX 0.1.61 and Vite Plus 1.0.0, the consumer's `build/honox-watch.ts` adapter replaces HonoX's add/unlink plugin's `./app/**` registration with the absolute `app` directory. Vite disables glob interpretation by default. Linux CI captured watched `app` directories without any `app/routes` descendants or MDX files, on both Node 22.23.3 and 24.12.0. Enabling relative glob interpretation alone restored watched paths but still failed save invalidation. The adapter keeps absolute event paths and the same add/unlink restart callbacks, while retaining the other HonoX plugins. It uses Vite's public watcher API and is specific to these pinned versions; recheck it when upgrading HonoX/Vite. It does not change the published package's known save behavior.

Both fixtures attest their unique ID and the current MDX in `watcher.getWatched()` before edits. The external consumer uses a separate port and checks every installed package file against the evaluated tarball. Failures retain browser traces, fixture identity and watcher scope. Automatic update assertions still issue no test navigation or reload.

A 2026-10-03 public Vite `createServer` control used macOS Node 24.12.0 with the Node filesystem backend (`useFsEvents: false`), twenty fresh apps per condition. The original literal glob omitted MDX in 12/20 apps and emitted 8 changes. Enabling globs watched all twenty but emitted twenty relative paths (`app/routes/docs/page.mdx`), which do not match Vite's absolute module paths. Registering the absolute app directory watched all twenty and emitted twenty absolute change paths. These controls explain the two Linux failures; the actual consumer/browser acceptance remains the integration proof.
