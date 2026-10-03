# Changelog

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
