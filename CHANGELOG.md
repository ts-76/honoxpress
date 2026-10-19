# Changelog

## [0.5.0](https://github.com/ts-76/honoxpress/compare/v0.4.0...v0.5.0) (2026-10-19)


### Features

* **void:** Markdownスターターと標準連携を追加 ([#44](https://github.com/ts-76/honoxpress/issues/44)) ([1d0bb41](https://github.com/ts-76/honoxpress/commit/1d0bb41a74444adae37e86cf380033b3d8f5db46))


### Bug Fixes

* **void:** verify the published adapter before release ([#46](https://github.com/ts-76/honoxpress/issues/46)) ([88f8492](https://github.com/ts-76/honoxpress/commit/88f84928685e118b809c35342f45bb7cbcd31703))

## [0.4.0](https://github.com/ts-76/honoxpress/compare/v0.3.0...v0.4.0) (2026-10-18)


### Features

* add Markdown-first component rendering and framework primitives ([#39](https://github.com/ts-76/honoxpress/issues/39)) ([02b8d20](https://github.com/ts-76/honoxpress/commit/02b8d20fd2a52e61f74fcec8a2cf42d51b9577ab))

## [0.3.0](https://github.com/ts-76/honoxpress/compare/v0.2.1...v0.3.0) (2026-10-12)


### Features

* colocate static component styles with hono/css ([#33](https://github.com/ts-76/honoxpress/issues/33)) ([b2b8455](https://github.com/ts-76/honoxpress/commit/b2b84552e6ba92c1a3bd1baca0e667de18cf7f74))

## [0.2.1](https://github.com/ts-76/honoxpress/compare/v0.2.0...v0.2.1) (2026-10-11)


### Bug Fixes

* stabilize responsive docs component templates ([#31](https://github.com/ts-76/honoxpress/issues/31)) ([21cedda](https://github.com/ts-76/honoxpress/commit/21ceddaa24df8843829320fa992f5c7dde03a99a))

## [0.2.0](https://github.com/ts-76/honoxpress/compare/v0.1.4...v0.2.0) (2026-10-11)


### Features

* add shared MDX components, setup CLI, and HonoX starter ([#29](https://github.com/ts-76/honoxpress/issues/29)) ([a20a2e6](https://github.com/ts-76/honoxpress/commit/a20a2e67a037628d8a6b2fa738d445b14dfb8798))

## [0.1.4](https://github.com/ts-76/honoxpress/compare/v0.1.3...v0.1.4) (2026-10-04)


### Bug Fixes

* **pilot:** verify published MDX reloads without expected failures ([#27](https://github.com/ts-76/honoxpress/issues/27)) ([9400392](https://github.com/ts-76/honoxpress/commit/9400392dea5c41316bcba3ba4b675fd2fd36949d))

## [0.1.3](https://github.com/ts-76/honoxpress/compare/v0.1.2...v0.1.3) (2026-10-04)


### Bug Fixes

* **build:** reload MDX docs after saves and route restarts ([#21](https://github.com/ts-76/honoxpress/issues/21)) ([55bf1a3](https://github.com/ts-76/honoxpress/commit/55bf1a379f770dffe0e395edba16260b3efaac99))
* **build:** suppress MDX reloads during route restarts ([#25](https://github.com/ts-76/honoxpress/issues/25)) ([20a386d](https://github.com/ts-76/honoxpress/commit/20a386d4b8e07b0c99150c0f83568804b007ca96))
* **dev:** normalize HonoX app watching in consumers ([c78769a](https://github.com/ts-76/honoxpress/commit/c78769aaddb55f81153d75fae589806ed5d49fe3))

## [0.1.2](https://github.com/ts-76/honoxpress/compare/v0.1.1...v0.1.2) (2026-10-03)


### Bug Fixes

* **ci:** enable owner-approved npm staging with provenance ([095b758](https://github.com/ts-76/honoxpress/commit/095b75806f14104e24f1e8cec8ad0716070f2d72))

## [0.1.1](https://github.com/ts-76/honoxpress/compare/v0.1.0...v0.1.1) (2026-10-03)


### Bug Fixes

* **ci:** generate release PRs from main and verify bot branches ([347f1f8](https://github.com/ts-76/honoxpress/commit/347f1f8b95650149be52b0330a26be42ef959aaa))
* **ci:** preserve generated release changelog formatting ([530f34d](https://github.com/ts-76/honoxpress/commit/530f34dd76c3eb17af9037b8a332f26c449b0417))


### Documentation

* record published 0.1.0 and owner release flow ([c588dcc](https://github.com/ts-76/honoxpress/commit/c588dcc6be7057bd5f5688fc033a325154b8ab48))

## 0.1.0

Published on 2026-10-03 after owner-reviewed CI tarball staging and manual owner 2FA approval.

- Pure Hono JSX documentation metadata API and client manifest resolution.
- Build-only MDX metadata, heading/TOC and docs-only SSG helpers using standard HonoX routes and renderer.
- Consumer-owned documentation UI, copy-code island and demo-frame templates.
- English/Japanese PoC, dynamic Hono demos, split client/SSG/Worker builds and external tarball acceptance.
- MIT license; approved npm package `honoxpress`, initial version `0.1.0`, owner `ts-76`.

The GitHub repository is public by owner approval on 2026-10-03, and npm identity ts-76 with auth-and-writes 2FA was verified. The candidate has private:false metadata and the staging policy remains disabled. The reviewed stack is integrated into main and tagged v0.1.0. The initial stage and owner 2FA approval are complete; published latest is 0.1.0. Cloudflare deployment is not performed. Future CI provenance, protected environment and stage-only Trusted Publisher activation remain separate setup tasks.
