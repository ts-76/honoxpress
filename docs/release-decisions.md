# Decisions before an OSS release

The owner approved MIT, honoxpress@0.1.0 and npm owner ts-76 on 2026-10-02. On 2026-10-03 the owner approved public GitHub visibility; the canonical repository is [ts-76/honoxpress](https://github.com/ts-76/honoxpress), already renamed on GitHub when checked. Its public visibility was confirmed. The existing local ghq path remains honox-docs-poc.

Read-only npm checks after owner login confirmed exactly ts-76 and active auth-and-writes 2FA. The agent did not create/change credentials. Registry GET for honoxpress returned 404 on 2026-10-03; this does not reserve the name or prove future publishing access.

| Decision                | Current state                                                                                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Package/version/channel | Approved honoxpress@0.1.0; stable channel latest. No registry dist-tag changed.                                                                       |
| License                 | MIT, Copyright (c) 2026 ts-76; root/package/packed LICENSE must match.                                                                                |
| GitHub visibility       | Public by explicit owner approval; canonical URLs and release checks use ts-76/honoxpress.                                                            |
| npm identity and 2FA    | Existing owner session verified as ts-76, auth-and-writes.                                                                                            |
| Candidate               | private:false source metadata; requires new exact-commit acceptance, not the earlier private tarball. Root workspace remains private.                 |
| Provenance              | Unset. A local first stage cannot generate provenance. Future CI provenance is supported by the public repository but still requires explicit policy. |
| Publishing controls     | stageEnabled:false, no activation, main merge, tag, stage/publish or trust/environment registration. Self-review prevention retained.                 |
| Support/pilot           | Contribution/support/template migration policy and hono-decks real-page pilot remain pending.                                                         |

The candidate consumer checks approved metadata, actual tarball bytes, exports/types/templates/LICENSE and full application acceptance while requiring the disabled staging gate. private:false enables evaluation of a publishable-format tarball; it is not permission to submit it. The actual publication gate still checks explicit stage activation, provenance and matching release tag.

Review the final exact-commit CI and tarball before authorizing main integration and the initial authenticated stage. Initial staging creates a public 0.0.0-stage placeholder; final npm approval with 2FA remains manual. See [release preparation](npm-release.md) for concrete setup and [Issue #6](https://github.com/ts-76/honoxpress/issues/6) for remaining decisions.

Retain the exact [Cloudflare Nimbus](https://nimbus-docs.com/philosophy/) and [Fumapress](https://press.fumadocs.dev/docs) acknowledgements and source/license links in the root and packed README. UI is independently written; later copied upstream code/assets require their exact notices.

For later releases preserve consumer-owned customization and document template migration. Breaking API, routes/anchors or build behavior require a version decision. Re-check cf beta compatibility and the HonoX positive eager-router control on upgrades. Keep docs/compiler out of Worker/client and prove stale output removal.

Pilot acceptance remains English/Japanese routes/links/404, language availability, islands after navigation, copy success/failure, demo/iframe/no-store, no demo execution during SSG, manifest/assets and graph isolation. Real deployment, production load and exhaustive HMR remain unverified.
