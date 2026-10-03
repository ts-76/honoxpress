# Release state and remaining decisions

MIT, honoxpress@0.1.0 and owner ts-76 were approved on 2026-10-02. Public GitHub visibility, main integration/tag and the exact initial local stage were approved on 2026-10-03. The owner completed final npm approval with 2FA. [npm latest](https://www.npmjs.com/package/honoxpress) is 0.1.0; published bytes/metadata/LICENSE match the accepted CI and stage.

The accepted source is a3ddd9e070274d9fbc2e3ea5611799fdbc0ec646 at [v0.1.0](https://github.com/ts-76/honoxpress/tree/v0.1.0). [Three-Node CI](https://github.com/ts-76/honoxpress/actions/runs/37095700185), Mac full acceptance and public registry consumer smoke passed. The initial PR stack is integrated. GitHub uses ts-76/honoxpress; local ghq path remains honox-docs-poc. Root workspace remains private, package metadata private:false.

| Decision                     | Current state                                                                                                                                                                                                           |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Initial name/version/channel | honoxpress@0.1.0 published; latest=0.1.0. Do not reuse its immutable version.                                                                                                                                           |
| License/ownership            | MIT, copyright 2026 ts-76; authenticated maintainer ts-76 with auth-and-writes 2FA.                                                                                                                                     |
| Initial provenance           | Explicitly false for owner-approved local bootstrap; CI provenance needs a cloud runner.                                                                                                                                |
| Next version/trigger         | Owner requested main-merge release PRs on 2026-10-03. release-please proposes versions; release PR merge creates v<version>/GitHub Release and dispatches tagged artifact preparation. npm final approval stays manual. |
| Future CI provenance         | Pending explicit choice; public repository supports true.                                                                                                                                                               |
| Protected environment        | Not created. Need a named independent reviewer; only ts-76 currently has repository access. prevent_self_review:true remains required.                                                                                  |
| Stage-only trust/activation  | Settings lookup requires owner 2FA; registration unverified/unperformed. stageEnabled:false and absent repository activation variable keep CI stopped.                                                                  |
| Support/pilot                | Contribution/support/template migration and a selected hono-decks real-page pilot remain pending.                                                                                                                       |

Concrete setup, review, retry and terminal-attached 2FA commands are in [npm release guide](npm-release.md). [Issue #6](https://github.com/ts-76/honoxpress/issues/6) tracks remaining pilot/support decisions. Do not weaken self-review protection to activate a solo CI stage; retain manual local stage while no independent reviewer exists.

Retain exact [Cloudflare Nimbus](https://nimbus-docs.com/philosophy/) and [Fumapress](https://press.fumadocs.dev/docs) acknowledgements/license sources. UI is independently written; later copied upstream assets/code require exact notices.

Later changes must preserve consumer-owned customization and document template migration. Breaking API, route/anchor or build behavior requires a version decision. Re-check cf beta and the positive HonoX eager-import control on upgrades; keep docs/compiler out of Worker/client and prove stale output removal.

Pilot acceptance remains English/Japanese routes/links/404, language availability, islands after navigation, copy success/failure, demo/iframe/no-store, no demo execution during SSG, manifest/assets and graph isolation. Real deployment, production load and exhaustive HMR remain unverified.
