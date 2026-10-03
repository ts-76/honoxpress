# npm releases after 0.1.0

## Published release

[honoxpress@0.1.0](https://www.npmjs.com/package/honoxpress) was published on 2026-10-03. latest resolves to 0.1.0, the license is MIT and the maintainer is ts-76. main and v0.1.0 resolved to accepted commit a3ddd9e070274d9fbc2e3ea5611799fdbc0ec646 at publication. The local ghq path remains honox-docs-poc; GitHub and origin use ts-76/honoxpress.

The owner approved public GitHub visibility, main integration/tag and the exact initial local stage. The owner completed final npm approval through terminal/browser 2FA. The agent did not approve the stage. Initial provenance was explicitly false; Mac cannot generate cloud CI provenance.

The public registry tarball, downloaded stage and accepted CI artifact have identical bytes:

- SHA256: 53dbf0b92d6a60857370e1b9b58b967c0fde91bff9ffcb7b2e986f37c4d3a2e4.
- SHA512: sha512-3Ygcwwy6nRIg1tEdTUKxaR/thIqifY5n94yv/q/DpC4Mpk+7fvkU+V4xaTH1xk1BV1ZD7DwL0M2y27ceYzijPA==.
- CI: [run 37095700185](https://github.com/ts-76/honoxpress/actions/runs/37095700185), Node 22.23.3 / 24.12.0 / 24.21.0 all passed. Mac full acceptance also passed.
- Accepted checks: 15 package tests, 5 build tests, 6 development/production browser tests, packed external consumer and 10 release regressions. Public-registry install/frozen install and runtime/build exports, type files, private exports, copied templates and Worker-empty metadata smoke also passed.

Mac and Linux gzip bytes differ, while decompressed tar bytes and all 17 files/modes match. Stage only the original downloaded CI tgz; never repack it on Mac. Root/package/packed LICENSE and metadata were checked. An optional offline install probe lacked cached hono policy metadata; normal online frozen install passed with standard policy checks intact. Failed diagnostics are retained locally.

The initial public 0.0.0-stage placeholder remains in registry history; latest is the approved 0.1.0. Do not remove registry history or restage the published version. The immutable npm artifact/README reflect the release candidate at its accepted commit; current repository documentation records the completed release.

## What happens when a PR is merged

The owner requested release-please on 2026-10-03. The configured flow is:

1. Merge reviewed feature/fix PRs into main. release-please.yml runs on push to main and creates/updates a release PR from Conventional Commits. A fix bumps patch, a feat bumps minor, and breaking changes bump major. Documentation/maintenance appear in notes when there is a releasable change; a docs-only merge does not require an npm release.
2. Review the generated version, CHANGELOG, package metadata and release-policy version. The root private workspace tracks the same version as packages/docs; only honoxpress is published. Merge the release PR after its exact-source Verify checks pass.
3. The subsequent main push creates v<version> and a GitHub Release. The release workflow explicitly dispatches npm-stage.yml on that tag. Its quality job calls the three-Node Verify workflow, and preparation retrieves the Node 24.12.0 artifact from the same run/attempt without rebuilding. It validates source/metadata/LICENSE/consumer/graphs/SHA.
4. CI stage remains disabled: stageEnabled:false, provenance:null, no NPM_STAGING_ENABLED variable and no npm-stage environment. Download the original accepted CI tgz for local manual stage, after owner release authorization. Never repack it on Mac. With separately configured CI stage gates, the stage job instead waits for an independent protected-environment reviewer and uses stage-only OIDC.
5. The owner reviews/downloads the npm stage, compares hashes and approves with 2FA. Final npm publication is never automated by release-please.

The manifest starts at 0.1.0 and bootstrap-sha points to the existing published v0.1.0 source. Tag format remains v<version>; the published tag and npm version are not replaced. JSON extra-files keep the package and release-policy version in sync. No permanent release-as or last-release-sha is set, so subsequent releases progress normally.

The pinned official Release Please Action uses the built-in GITHUB_TOKEN. The repository must allow GitHub Actions to create pull requests; default workflow permissions remain read-only, with write scopes only in the release-please job. No PAT/npm token is introduced. Bot-created events do not reliably start ordinary CI without approval; the workflow explicitly dispatches Verify on the PR branch with its API head SHA. Verify rejects a head that changed between dispatch and checkout. GitHub release tags likewise use explicit dispatch rather than relying on a token-generated tag event. Dispatch validates the repository, main base, release-please branch and tag before writes.

Manual recovery remains available: dispatch release-please.yml on main to refresh a release PR or finish tagging a merged release PR, then inspect existing state before retrying. To re-prepare a tagged artifact, dispatch npm-stage.yml on the existing matching tag. A GitHub Release confirms source/tag/notes; check npm separately for package publication.

## Future CI setup targets

Prepare these concrete settings before activation; registration and new grants need owner authorization:

- Choose a new release version and explicit CI provenance. The now-public repository supports provenance:true. Current policy remains unset.
- GitHub environment npm-stage on ts-76/honoxpress: named required reviewer(s), prevent_self_review:true, approved v* tag deployment rules. Only ts-76 currently has repository access, so a separate reviewer must be identified. A workflow initiator cannot approve their own deployment. Keep this protection; if no independent reviewer is available, use the approved local manual-stage path while CI remains disabled.
- npm Trusted Publisher for honoxpress: GitHub owner ts-76, repository honoxpress, workflow filename npm-stage.yml, environment npm-stage; allow stage publish only, no direct publish or dist-tag changes. Package now exists, so initial-bootstrap dependency is resolved. Reading trust settings can itself require owner 2FA; no configured relationship is assumed without inspection.
- After these settings are authorized/registered, set release-policy.json.stageEnabled:true and NPM_STAGING_ENABLED=true and re-run exact-commit acceptance. The job alone receives contents:read, actions:read and id-token:write. No permanent npm token is stored in CI.

The script checks actual environment protections, tag/commit/main ancestry, explicit metadata/provenance, existing package/owner and version absence. Registry outage and duplicates stop the operation. Naming an environment is not approval. GitHub Free/Pro/Team support required reviewers for public repositories.

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

pnpm verify runs unchanged full acceptance plus isolated npm dry-run. Dry-run uses temporary HOME/config/cache, no inherited credentials/OIDC, and a loopback tripwire accepting GET only. It does not contact the official registry or submit a stage. Current plan stays blocked by disabled staging/unset provenance and, outside a matching tag, version-tag.

The disabled workflow was actually dispatched on v0.1.0 in [run 37100696508](https://github.com/ts-76/honoxpress/actions/runs/37100696508): all three quality jobs and prepare passed; the exact same-run artifact was retrieved, its plan was blocked by staging-disabled/provenance-decision, and stage was skipped with zero steps. Environments and activation variables remained absent. This proves orchestration while disabled, not live OIDC or stage permission.

CI concurrency serializes attempts per tag without cancelling an in-flight stage. Artifact/receipt names contain run attempt and preserve evidence. Retry the whole quality flow; downstream-only rerun cannot silently use an earlier artifact. Other maintainers' local actions are outside that concurrency.

An earlier f09963d CI run timed out at external-consumer Vitest startup on Node 24.21.0 without an assertion failure. Cause was not established; diagnostics were retained and later accepted CI passed. Dependencies, timeout and protections were not relaxed.

Live CI OIDC/environment/trust activation and future CI provenance remain unexecuted. Cloudflare deployment and hono-decks pilot remain separate tasks. Review exact-head Actions and downloaded artifacts; committed snapshots are historical, not proof for a later commit.

Official references checked 2026-10-03: [staged publishing](https://docs.npmjs.com/staged-publishing/), [trusted publishers](https://docs.npmjs.com/trusted-publishers/), [npm trust](https://docs.npmjs.com/cli/v11/commands/npm-trust/), [provenance](https://docs.npmjs.com/generating-provenance-statements/), [npm stage](https://docs.npmjs.com/cli/v11/commands/npm-stage/), [GitHub environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments).
