# External consumer fixture

`pnpm test:consumer` builds/packs the private evaluation package, then creates
a fresh directory outside this repository. The verifier copies the existing
standard HonoX example as consumer-owned application code, changes only local
ports, installs the **tarball**, and overwrites the UI files with the installed
package's exported templates. No workspace links, package source imports, or
repo `node_modules` are used for the installed library.

`usage.ts` compiles against emitted declaration exports (including expected
type failures). `smoke.mjs` checks runtime imports, encapsulated exports,
missing translation behavior, manifest resolution, no Worker MDX discovery,
and the asset-copy path. The consumer runs independent client/SSG/Worker,
application build tests, both browser environments and global cf dry-run.

The fixture pins direct dependencies to the already verified lock versions and
retains Vite Plus's transitive Vite override and existing pnpm build policies.
It performs fresh install followed by frozen install. Successful temporary
directories are removed; failed directories/logs are retained for diagnosis.
Every direct dependency is pinned from the frozen example install. The fresh consumer lockfile/package manifest are retained as local artifacts before cleanup.
Tarball/list/hash and acceptance results are saved under `artifacts` and
`packages/docs/evidence/consumer.json`. This is preparation only: no registry
publish/auth/token, repository publication, deployment, or hono-decks pilot.
