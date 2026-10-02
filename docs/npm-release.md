# npm release preparation and approval boundaries

The owner approved **MIT**, **honoxpress**, initial **0.1.0** and npm owner **ts-76** on 2026-10-02. Root/package LICENSE, package metadata, changelog and release policy reflect that decision. The stable initial channel is `latest`; no registry dist-tag is changed. The workflow is prepared, but staging is disabled and the candidate remains private. Repository visibility, provenance, credentials, trust relationship and environment have not been approved or registered. A successful preparation run is not publication authorization.

## What runs now

`pnpm verify` retains the existing acceptance checks and external tarball consumer. It also runs ten release regression tests, writes `artifacts/release/plan.json`, and runs pinned npm 11.21.0 against the accepted tarball with `npm stage publish --dry-run --ignore-scripts`. The dry-run uses an isolated HOME/config/cache, removes inherited credentials and OIDC variables, and redirects the registry to a loopback HTTP tripwire. Only GET requests are accepted; the test fails if any write is attempted. SHA256 and npm's SHA512 integrity must match the original bytes. Global Mac npm, pnpm, cf and Devbox settings are unchanged.

The approved metadata passes its preparation gate, including root/package/packed LICENSE byte equality. The real package still produces a **blocked** publication plan: `staging-disabled`, `package-private`, `provenance-decision`, and `version-tag`. Selecting MIT and a version does not activate staging. This is an expected passing preparation result. Corrupt artifacts, stale commit evidence and failed quality checks fail the command. npm dry-run itself can inspect a private package, so it is never used as evidence of permission to stage.

```sh
pnpm install --frozen-lockfile
pnpm verify
cat artifacts/release/plan.json
cat artifacts/release/dry-run.json
```

The positive release fixture is packed with pnpm and inspected through the same artifact gate. The fixture's `7.8.9` and `SEE LICENSE IN LICENSE` are synthetic test metadata, not proposed release decisions.

## Future CI flow

`.github/workflows/npm-stage.yml` is manually dispatched on an owner-created `v<version>` tag. Its `quality` job calls the same three-Node Verify workflow. Only after every matrix job succeeds does preparation download the Node 24.12.0 artifact from that same run. The source commit, packed metadata, consumer evidence, 15 package tests, 5 build tests, 6 browser tests, graph isolation, SHA256 and license contents are checked again. The package is never rebuilt, modified or repacked in the staging job.

Staging requires all of the following:

- Owner-reviewed package metadata, LICENSE and matching changelog entry; explicit values in `release-policy.json`, including `stageEnabled: true`.
- `v<version>` tag exactly matching package and policy version, with that commit reachable from `origin/main`.
- Repository variable `NPM_STAGING_ENABLED=true` and the `npm-stage` environment with required reviewers and prevention of self-review. The script checks actual protection rules through the GitHub API; naming an environment does not provide approval.
- An existing npm package, the approved owner listed as a maintainer, and an npm Trusted Publisher bound to owner `ts-76`, repo `honox-docs-poc`, workflow filename `npm-stage.yml`, environment `npm-stage`. Configure **stage-only** permission; do not allow direct publish or dist-tag changes.
- Explicit provenance policy. npm provenance needs a public repository and public package. Keep the repository private until its owner authorizes visibility; `provenance: false` would also require an owner decision.

Only the isolated staging job gets `id-token: write`; it also needs `actions: read` to inspect environment protection through the GitHub API. It installs a pinned npm CLI without lifecycle scripts into the runner temporary directory, then submits the exact accepted tarball to the official registry with explicit access/dist-tag/provenance and ignored lifecycle scripts. There are no npm tokens in the workflow. On GitHub Free/Pro/Team, required reviewers are available only for public repositories; if unavailable, this workflow remains blocked until the owner chooses an approved arrangement. No environment or repository variable is created by these preparation changes.

After stage submission, the saved receipt contains stage ID, version, commit, tag and tarball hashes. The npm maintainer reviews the stage (including downloading its tarball and checking the saved SHA256) and approves through npm with 2FA. **Approval is never automated.** Do not treat a missing CI receipt as proof that npm received nothing; inspect pending stages before any retry.

Concurrency serializes this repository's release attempts for a tag, without cancelling an in-flight attempt. Registry preflight fails closed on outage, blocks a published version, and blocks a nonexistent package for the OIDC workflow. npm's shared version uniqueness covers pending stages as well as published versions. OIDC short-lived credentials cannot list/view/approve pending stages; maintainers perform that review using their account. Concurrency does not serialize another repository or a maintainer's local actions.

## First-package bootstrap: manual publish is unnecessary, authentication is necessary

Official staged publishing supports new packages, but the first stage creates a **public `0.0.0-stage` placeholder**. Trusted Publisher registration requires a package that already exists. Consequently, the first stage cannot start with an unconfigured, purely OIDC workflow for a nonexistent name.

After the owner approves license, version, name/ownership, visibility/provenance and the public placeholder, the first authenticated stage can use the exact CI-verified tarball. The owner must already have suitable npm access and 2FA enabled; choose the authentication method separately. The permitted non-secret `npm whoami --registry=https://registry.npmjs.org/` check returned **ENEEDAUTH** on 2026-10-02. There is no authenticated account identity or 2FA confirmation yet. No credentials were displayed, created or changed, and no stage was performed. Once the placeholder exists, configure the stage-only Trusted Publisher and inspect/approve the staged package with 2FA. A direct initial `npm publish` is not required.

Bootstrap is intentionally outside the OIDC job rather than silently falling back to a stored token. Do not enable the CI flag merely to bypass the nonexistent-package check.

## Remaining authorized-action sequence and exact setup targets

1. **Final release source and integration:** review this Draft PR and the stacked changes. Main merge remains unauthorized. At separately authorized staging activation, set package `private: false`, choose provenance, and re-run acceptance on that source commit: the current private 0.1.0 tarball is not a stageable artifact. Do not edit an accepted tarball in place. Then create matching `v0.1.0` on the reviewed main commit.
2. **Initial npm authentication/bootstrap:** obtain authorization for an owner login/session at `https://registry.npmjs.org/` (e.g. `pnpm exec npm login --registry=https://registry.npmjs.org/`), confirm `whoami` is exactly `ts-76` and verify account 2FA. A different account must stop the operation. No new token is needed for a CLI login-based bootstrap. Authorize `npm stage publish` of the final verified tarball specifically, including its public `0.0.0-stage` placeholder, `public` access and `latest` channel. Download/check the resulting stage before owner 2FA approval; never use direct publish as a silent fallback.
3. **Future CI controls, separate setup approval:** create/configure GitHub environment `npm-stage` on `ts-76/honox-docs-poc` with required reviewer(s), **prevent_self_review: true**, and tag deployment rules matching the approved `v*` releases. The initiating user cannot be their own approver. Required reviewers need a suitable public/Enterprise arrangement for this currently private repository; repository publicization is not implied by the license decision. Decide the repository/provenance arrangement first. No protection is weakened here.
4. **npm Trusted Publisher registration, separate setup approval:** after the package exists, in `honoxpress` settings bind GitHub owner `ts-76`, repo `honox-docs-poc`, workflow filename `npm-stage.yml`, environment `npm-stage`. Grant **stage publish only**; no direct `npm publish` or dist-tag-change permission, and no permanent npm token in GitHub. Then explicitly enable `release-policy.json.stageEnabled` and repository variable `NPM_STAGING_ENABLED` for an authorized run. The stage job only has GitHub `contents: read`, `actions: read`, and `id-token: write`.

Steps 3–4 enable subsequent CI stages; first authenticated bootstrap can precede Trusted Publisher registration. Each actual public-placeholder stage and final npm 2FA approval is distinct from this preparation. Registration, login, merge, tag creation and activation have not been performed.

## Validation limits and official sources

The earlier disabled-workflow preparation passed format, warning-free lint, TypeScript, 15 package tests, 5 build tests, 6 browser tests across development/production, the packed external consumer, and 9 release regression tests. This owner-approved metadata update adds a tenth regression: MIT/0.1.0/ts-76 preparation succeeds while private/staging/provenance gates remain blocked. Inspect the final update commit's CI and accepted `honoxpress-0.1.0.tgz` before release. Actionlint 1.7.12 passed both workflows. The real evaluation artifact produced a blocked plan and its npm dry-run made 0 write requests.

Local and PR CI prove artifact binding, disabled gates and credential-free npm dry-run. Release workflow dispatch/caller orchestration is statically checked and its prepare helper is exercised against downloaded artifacts; actual dispatch remains unexecuted before main integration/setup. The live OIDC exchange, protected-environment approval, real stage receipt, npm 2FA approval, registry installation and provenance are **not executed**. Review the exact final commit's Actions result rather than an earlier local snapshot. The real-page hono-decks pilot and main integration are still separate owner decisions.

Specifications checked on 2026-10-02:

- [npm staged publishing](https://docs.npmjs.com/staged-publishing/): initial public placeholder, Node/npm prerequisites and maintainer 2FA approval.
- [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/): hosted runners, workflow/environment binding, granular stage permission and public-repository provenance requirement.
- [npm trust prerequisites](https://docs.npmjs.com/cli/v11/commands/npm-trust/): package must already exist.
- [npm stage CLI](https://docs.npmjs.com/cli/v11/commands/npm-stage/) and [official command source](https://github.com/npm/cli/tree/latest/lib/commands/stage): explicit tarball spec, shared version uniqueness and OIDC command limitations. Dry-run behavior was inspected in the official registry's npm 11.21.0 CLI and exercised against loopback; latest source can differ from the pinned version.
- [GitHub deployment environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments): environment protection and plan/visibility requirements.
