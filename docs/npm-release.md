# npm releases after 0.1.0

## Current published release: 0.1.1

[honoxpress@0.1.1](https://www.npmjs.com/package/honoxpress) became latest on 2026-10-03 at 19:23 JST after the owner completed manual npm 2FA approval. Its source is 934a3e4aea866397902a92609de06b963f2582a8 at [v0.1.1](https://github.com/ts-76/honoxpress/releases/tag/v0.1.1).

PR #15 recorded the initial publication, #16 introduced release-please, and generated release PR #17 proposed 0.1.1. All were reviewed, passed exact-head CI and merged. Main push created the release PR; its merge created the tag/GitHub Release and explicitly dispatched [tag acceptance and preparation](https://github.com/ts-76/honoxpress/actions/runs/37114591151). All three Node quality jobs and preparation passed; CI stage was skipped.

The owner-requested manual stage used the original same-run Node 24.12.0 CI tgz, public/latest, ignore-scripts and provenance:false. CI stage was disabled during that release; the subsequent owner-approved solo setup is described below. Downloaded stage and public-registry bytes match the source metadata/LICENSE and accepted artifact:

- SHA256: 9a6bdaf11dfbc3ac9718b3c1c2b24377042e31fb319cc3c9d98c2e9f813c83dd.
- SHA512: sha512-ev0hF9mqRQssDm3pxNlP6+TiwIXcIwLo/w3Xuc09NQUWoGlGDXuN1imIFtTK4pYY0/N0kqyIRpl7Wal1XnkD4A==.
- Fresh public-registry consumer install, frozen install and runtime/build exports, emitted types, private-export rejection, Worker-empty metadata and copied assets passed. pnpm's default non-strict minimum-release-age behavior auto-added the explicitly pinned honoxpress@0.1.1 to the temporary consumer's exclusions; repository/global policy was unchanged.

The first bot pull_request event required workflow approval and later ended without jobs. The explicit SHA-checked bot dispatch and the final reviewed PR head both passed all three Node jobs. Final npm approve was performed by the owner, never by CI or the agent. Both published versions and tags remain immutable.

## Initial published release: 0.1.0

[honoxpress@0.1.0](https://www.npmjs.com/package/honoxpress) was published on 2026-10-03. latest resolved to 0.1.0 at initial publication, the license is MIT and the maintainer is ts-76. main and v0.1.0 resolved to accepted commit a3ddd9e070274d9fbc2e3ea5611799fdbc0ec646 at publication. The local ghq path remains honox-docs-poc; GitHub and origin use ts-76/honoxpress.

The owner approved public GitHub visibility, main integration/tag and the exact initial local stage. The owner completed final npm approval through terminal/browser 2FA. The agent did not approve the stage. Initial provenance was explicitly false; Mac cannot generate cloud CI provenance.

The public registry tarball, downloaded stage and accepted CI artifact have identical bytes:

- SHA256: 53dbf0b92d6a60857370e1b9b58b967c0fde91bff9ffcb7b2e986f37c4d3a2e4.
- SHA512: sha512-3Ygcwwy6nRIg1tEdTUKxaR/thIqifY5n94yv/q/DpC4Mpk+7fvkU+V4xaTH1xk1BV1ZD7DwL0M2y27ceYzijPA==.
- CI: [run 37095700185](https://github.com/ts-76/honoxpress/actions/runs/37095700185), Node 22.23.3 / 24.12.0 / 24.21.0 all passed. Mac full acceptance also passed.
- Accepted checks: 15 package tests, 5 build tests, 6 development/production browser tests, packed external consumer and 10 release regressions. Public-registry install/frozen install and runtime/build exports, type files, private exports, copied templates and Worker-empty metadata smoke also passed.

Mac and Linux gzip bytes differ, while decompressed tar bytes and all 17 files/modes match. Stage only the original downloaded CI tgz; never repack it on Mac. Root/package/packed LICENSE and metadata were checked. An optional offline install probe lacked cached hono policy metadata; normal online frozen install passed with standard policy checks intact. Failed diagnostics are retained locally.

The initial public 0.0.0-stage placeholder remains in registry history; latest is now the approved 0.1.1. Do not remove registry history or restage the published version. The immutable npm artifact/README reflect the release candidate at its accepted commit; current repository documentation records the completed release.

## What happens when a PR is merged

The owner requested release-please on 2026-10-03. The configured flow is:

1. Merge reviewed feature/fix PRs into main. release-please.yml runs on push to main and creates/updates a release PR from Conventional Commits. A fix bumps patch, a feat bumps minor, and breaking changes bump major. Documentation/maintenance sections are hidden, so publication-status docs and routine chores do not trigger another release PR. Feature/fix or explicit breaking-change commits remain release candidates.
2. Review the generated version, CHANGELOG, package metadata and release-policy version. The root private workspace tracks the same version as packages/docs; only honoxpress is published. Merge the release PR after its exact-source Verify checks pass.
3. The subsequent main push creates v<version> and a GitHub Release. The release workflow explicitly dispatches npm-stage.yml on that tag. Its quality job calls the three-Node Verify workflow, and preparation retrieves the Node 24.12.0 artifact from the same run/attempt without rebuilding. It validates source/metadata/LICENSE/consumer/graphs/SHA.
4. CI policy enables stage-only OIDC with provenance:true. The npm-stage job requires repository variable NPM_STAGING_ENABLED=true, a matching release tag and the accepted same-run artifact. GitHub pauses it for owner ts-76 approval; self-review is explicitly allowed for solo maintenance. Admin bypass is disabled and deployment is limited to v* tags. Only the original accepted tgz is submitted; never repack it on Mac. Without the activation variable, the stage job is skipped.
5. The owner reviews/downloads the npm stage, compares hashes and approves with 2FA. Final npm publication is never automated by release-please.

The manifest starts at 0.1.0 and bootstrap-sha points to the existing published v0.1.0 source. Tag format remains v<version>; the published tag and npm version are not replaced. JSON extra-files keep the package and release-policy version in sync. The generated root CHANGELOG is excluded from Oxfmt because release-please owns its Markdown formatting; release-note version validation remains required. No permanent release-as or last-release-sha is set, so subsequent releases progress normally.

The pinned official Release Please Action uses the built-in GITHUB_TOKEN. The repository must allow GitHub Actions to create pull requests; default workflow permissions remain read-only, with write scopes only in the release-please job. No PAT/npm token is introduced. Bot-created events do not reliably start ordinary CI without approval; the workflow explicitly dispatches Verify on the PR branch with its API head SHA. Verify rejects a head that changed between dispatch and checkout. GitHub release tags likewise use explicit dispatch rather than relying on a token-generated tag event. Dispatch validates the repository, main base, release-please branch and tag before writes.

Manual recovery remains available: dispatch release-please.yml on main to refresh a release PR or finish tagging a merged release PR, then inspect existing state before retrying. To re-prepare a tagged artifact, dispatch npm-stage.yml on the existing matching tag. A GitHub Release confirms source/tag/notes; check npm separately for package publication.

## Owner-approved solo CI setup

The owner reported having no other maintainer and explicitly requested the solo code configuration on 2026-10-03. Policy now sets stageEnabled:true and provenance:true. GitHub environment npm-stage was independently read and matches required reviewer User ts-76 (ID 108617014), prevent_self_review:false, can_admins_bypass:false, and selected tag rule v*. The script verifies those settings through GitHub before submitting any candidate; an environment name alone is insufficient. It rejects missing or extra reviewers, admin bypass and absent/broader/branch deployment rules.

The owner reports configuring npm Trusted Publisher for honoxpress with GitHub owner ts-76, repository honoxpress, workflow filename npm-stage.yml and environment npm-stage. Stage publish only is allowed; direct publish and dist-tag management stay disabled. The npm trust list read required owner 2FA, so registration is owner-reported rather than independently verified. GitHub's NPM_STAGING_ENABLED repository variable was absent at the setup read; set it to true after the configuration PR passes CI and is merged. Environment-scoped variables cannot enable this job-level condition.

This intentionally permits the same maintainer to initiate and approve the GitHub job. Final npm approval still requires that maintainer's manual 2FA. OIDC cannot approve the npm stage. No npm token is stored in CI.

Use the next generated release PR to obtain a new unpublished version. Do not restage 0.1.0 or 0.1.1, move their tags or bypass the duplicate-version check. The script retains exact tag/commit/main ancestry, metadata/LICENSE/consumer/graph/SHA and public-repository provenance checks. Live OIDC/provenance submission remains unverified until a future tagged run is approved.

## Local owner review and 2FA

Use reviewed npm 11.21.0 with the established Node environment. Commands below read existing owner authentication; never post auth URLs, done URLs, tokens or OTP codes into chat/logs. Replace STAGE_ID with the actual ID and REVIEW_REPO_PATH with the local checkout path.

```sh
pnpm --dir REVIEW_REPO_PATH exec npm stage view STAGE_ID --registry=https://registry.npmjs.org/
pnpm --dir REVIEW_REPO_PATH exec npm stage download STAGE_ID --registry=https://registry.npmjs.org/
```

RTK proxy makes child stdout non-TTY. npm 11.21.0 refuses its interactive web-OTP flow when stdin or stdout is not a TTY and reports EOTP. Attach the interactive approval command to the terminal explicitly; replace STAGE_ID before running:

```sh
rtk proxy zsh -lic 'pnpm --dir /Users/toma_7698/ghq/github.com/ts-76/honox-docs-poc exec npm stage approve STAGE_ID --registry=https://registry.npmjs.org/ </dev/tty >/dev/tty 2>/dev/tty'
```

Open the displayed npm authentication URL in your own browser and complete 2FA; the command then retries approval. Approval publishes the version. If a prior submission/approval outcome is unknown, inspect stage and registry state before retrying. OIDC short-lived credentials cannot list/view/approve pending stages.

## Verification and retry behavior

pnpm verify runs unchanged full acceptance plus isolated npm dry-run. Dry-run uses temporary HOME/config/cache, no inherited credentials/OIDC, and a loopback tripwire accepting GET only. It does not contact the official registry or submit a stage. Outside a matching release tag, the current plan remains blocked by version-tag. Dry-run deliberately uses provenance:false because it is credential-free and executes locally; the live CI stage explicitly uses provenance:true.

The disabled workflow was actually dispatched on v0.1.0 in [run 37100696508](https://github.com/ts-76/honoxpress/actions/runs/37100696508): all three quality jobs and prepare passed; the exact same-run artifact was retrieved, its plan was blocked by staging-disabled/provenance-decision, and stage was skipped with zero steps. Environments and activation variables remained absent. This proves orchestration while disabled, not live OIDC or stage permission.

CI concurrency serializes attempts per tag without cancelling an in-flight stage. Artifact/receipt names contain run attempt and preserve evidence. Retry the whole quality flow; downstream-only rerun cannot silently use an earlier artifact. Other maintainers' local actions are outside that concurrency.

An earlier f09963d CI run timed out at external-consumer Vitest startup on Node 24.21.0 without an assertion failure. Cause was not established; diagnostics were retained and later accepted CI passed. Dependencies, timeout and protections were not relaxed.

Live CI OIDC/provenance submission remains unexecuted; owner approval and the activation variable are still required for a future tagged run. Cloudflare deployment and hono-decks pilot remain separate tasks. Review exact-head Actions and downloaded artifacts; committed snapshots are historical, not proof for a later commit.

Official references checked 2026-10-03: [staged publishing](https://docs.npmjs.com/staged-publishing/), [trusted publishers](https://docs.npmjs.com/trusted-publishers/), [npm trust](https://docs.npmjs.com/cli/v11/commands/npm-trust/), [provenance](https://docs.npmjs.com/generating-provenance-statements/), [npm stage](https://docs.npmjs.com/cli/v11/commands/npm-stage/), [GitHub environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments).
