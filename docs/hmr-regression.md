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
