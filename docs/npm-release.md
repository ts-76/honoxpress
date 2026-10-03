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

Merging a PR does not start a release. Verify runs on PR events and workflow dispatch/call; npm-stage.yml is workflow_dispatch only. Current source policy is stageEnabled:false and provenance:null, no NPM_STAGING_ENABLED repository variable is configured, and npm-stage environment is not created. No live CI stage is enabled.

The current manual release flow is:

1. Decide a new version and release notes; review/integrate its source. 0.1.0 is already published and cannot be reused.
2. Create a matching v<version> tag on the reviewed commit reachable from origin/main.
3. Manually dispatch npm-stage.yml on that tag. The quality job calls the existing three-Node Verify workflow. Preparation downloads the Node 24.12.0 artifact from that same run/attempt, without rebuilding it, and verifies commit/metadata/LICENSE/consumer/graphs/SHA.
4. With all setup gates enabled, the stage job waits for the protected environment review, then uses stage-only OIDC to submit exact bytes. If setup is incomplete, it stays skipped or fails closed.
5. The owner reviews/downloads the stage, compares hashes and approves it with 2FA. Final approval is never automated.

PR-merge-triggered stage automation is a separate trigger/version/tag design choice; it has not been implemented. Stage and final public approval remain distinct operations.

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

CI concurrency serializes attempts per tag without cancelling an in-flight stage. Artifact/receipt names contain run attempt and preserve evidence. Retry the whole quality flow; downstream-only rerun cannot silently use an earlier artifact. Other maintainers' local actions are outside that concurrency.

An earlier f09963d CI run timed out at external-consumer Vitest startup on Node 24.21.0 without an assertion failure. Cause was not established; diagnostics were retained and later accepted CI passed. Dependencies, timeout and protections were not relaxed.

Live CI OIDC/environment/trust activation and future CI provenance remain unexecuted. Cloudflare deployment and hono-decks pilot remain separate tasks. Review exact-head Actions and downloaded artifacts; committed snapshots are historical, not proof for a later commit.

Official references checked 2026-10-03: [staged publishing](https://docs.npmjs.com/staged-publishing/), [trusted publishers](https://docs.npmjs.com/trusted-publishers/), [npm trust](https://docs.npmjs.com/cli/v11/commands/npm-trust/), [provenance](https://docs.npmjs.com/generating-provenance-statements/), [npm stage](https://docs.npmjs.com/cli/v11/commands/npm-stage/), [GitHub environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments).
