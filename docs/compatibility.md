# Compatibility and evidence

The tables below record tested combinations. Dependency engine ranges also admit untested versions. The lockfile is the primary dependency record. A runtime change requires the full acceptance pipeline and an exact-commit CI result.

| Environment                       | Coverage                                                       |
| --------------------------------- | -------------------------------------------------------------- |
| macOS arm64 / Devbox Node 24.12.0 | Local complete package/example/packed-consumer acceptance      |
| Ubuntu / Node 24.12.0             | CI reproduces the Mac runtime version                          |
| Ubuntu / Node 24.21.0             | CI tests the newest LTS patch observed on 2026-10-01           |
| Ubuntu / Node 22.23.3             | CI tests the current maintenance LTS line                      |
| Node 26 / other OS or browsers    | Unverified; engine compatibility does not imply tested support |

The [official Node release lifecycle](https://nodejs.org/en/about/previous-releases) lists 24 and 22 as LTS, and 26 as Current on 2026-10-01. The [official distribution index](https://nodejs.org/dist/index.json) was checked for exact patch versions. The latest observed LTS is 24.21.0. The existing Mac runtime stays 24.12.0 to preserve its Devbox/chezmoi environment; CI tests that exact version and the newer LTS patch. Production applications should use an LTS line. The toolchain's combined Node engine is `^22.20.0 || ^24.12.0 || >=26.0.0`; this range admits some untested combinations.

| Dependency                   | Verified evaluation version                     |
| ---------------------------- | ----------------------------------------------- |
| pnpm                         | 11.22.0 (Devbox global locally, exact CI setup) |
| Vite Plus                    | 1.0.0 (underlying Vite 8.3.1)                   |
| Hono / HonoX                 | 4.13.12 / 0.1.61                                |
| TypeScript                   | 5.9.3 (independent declaration check)           |
| cf                           | 1.0.0-beta.6 (global locally and per CI job)    |
| Cloudflare config / Wrangler | 0.20.0 / 4.145.0                                |
| MDX rollup / Hono SSG        | See frozen lockfile and example evidence        |

Wrangler must remain the directly declared dev-server used internally by global cf. cf rejects an app at the pnpm workspace root, so the standard app lives under `examples/poc`. CI installs global cf only inside disposable runner jobs; it changes no Mac manager, PATH configuration or project dependency.

Runtime exports contain metadata/manifest helpers only. `./build` contains Node-based metadata discovery, heading transformation and the pre-request SSG filter. Worker mode must be explicit and returns an empty catalog without MDX discovery. The consumer's literal Worker glob selection is still required: the default HonoX eager router retains docs body even when response routing is filtered.

The package includes editable content and layout templates, a shared MDX registry validator, and a setup CLI with a runnable HonoX starter. The CLI places islands in the consumer's `app/islands` so HonoX discovers them. It preserves standard application-owned routing and build configuration. See the [component guide](components.md) for the unreleased candidate workflow, props, styles, and registry setup. Local MDX must be trusted. Heading anchors use the package's documented static Unicode algorithm, not GitHub slugger compatibility. Missing translations have no synthetic href. Navigation is full document navigation; Counter state resets and rehydrates on revisits. HMR of every edit/rename, arbitrary parameter docs, SPA state, search, draft, performance/load and every accessibility criterion are not covered.

Known non-fatal upstream messages: HonoX's deprecated `esbuild` client option under Vite 8; a missing Rollup pluginutils source map; and cf reporting a stopped Docker daemon on the Mac with no Containers. Actual build/test/dry-run exit status, module graphs and browser results are the acceptance criteria. Lint warnings from this project are forbidden.

`examples/poc/evidence` and `packages/docs/evidence/consumer.json` are dated local snapshots. CI re-runs acceptance, checks out the PR head SHA explicitly, logs `git rev-parse HEAD`, and attaches its own fresh evidence per Node version. Judge CI success from that run's conclusion and SHA, not a committed snapshot claiming future CI success. Production Cloudflare deployment is unverified. Published versions are listed on [npm](https://www.npmjs.com/package/honoxpress); tags and release notes are on [GitHub Releases](https://github.com/ts-76/honoxpress/releases).
