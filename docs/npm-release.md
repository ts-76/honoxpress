# npm release preparation and approval boundaries

The workflow is prepared, but staging is disabled. `honoxpress@0.0.0` remains private and unlicensed. No initial version, license, npm owner, repository visibility, credentials, trust relationship or environment has been selected or registered by this change. A successful preparation run is not publication authorization.

## What runs now

`pnpm verify` retains the existing acceptance checks and external tarball consumer. It also runs nine release regression tests, writes `artifacts/release/plan.json`, and runs pinned npm 11.21.0 against the accepted tarball with `npm stage publish --dry-run --ignore-scripts`. The dry-run uses an isolated HOME/config/cache, removes inherited credentials and OIDC variables, and redirects the registry to a loopback HTTP tripwire. Only GET requests are accepted; the test fails if any write is attempted. SHA256 and npm's SHA512 integrity must match the original bytes. Global Mac npm, pnpm, cf and Devbox settings are unchanged.

The real package currently produces a **blocked** plan: disabled policy, private package, owner version/license/owner/dist-tag/provenance decisions, repository metadata/release notes, and release tag are missing. This is an expected passing preparation result. Corrupt artifacts, stale commit evidence and failed quality checks fail the command. npm dry-run itself can inspect a private package, so it is never used as evidence of permission to stage.

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

After the owner approves license, version, name/ownership, visibility/provenance and the public placeholder, the first authenticated stage can use the exact CI-verified tarball. The owner must already have suitable npm access and 2FA enabled; choose the authentication method separately. This preparation neither reads local npm credentials nor creates tokens or performs that stage. Once the placeholder exists, configure the stage-only Trusted Publisher and inspect/approve the staged package with 2FA. A direct initial `npm publish` is not required.

Bootstrap is intentionally outside the OIDC job rather than silently falling back to a stored token. Do not enable the CI flag merely to bypass the nonexistent-package check.

## Validation limits and official sources

Local validation on 2026-10-02 passed format, warning-free lint, TypeScript, 15 package tests, 5 build tests, 6 browser tests across development/production, the packed external consumer, and the 9 release regression tests. Actionlint 1.7.12 passed both workflows. The real evaluation artifact produced a blocked plan and its npm dry-run made 0 write requests.

Local and PR CI prove artifact binding, disabled gates and credential-free npm dry-run. The live OIDC exchange, protected-environment approval, real stage receipt, npm 2FA approval, registry installation and provenance are **not executed**. Review the exact final commit's Actions result rather than an earlier local snapshot. The real-page hono-decks pilot and main integration are still separate owner decisions.

Specifications checked on 2026-10-02:

- [npm staged publishing](https://docs.npmjs.com/staged-publishing/): initial public placeholder, Node/npm prerequisites and maintainer 2FA approval.
- [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/): hosted runners, workflow/environment binding, granular stage permission and public-repository provenance requirement.
- [npm trust prerequisites](https://docs.npmjs.com/cli/v11/commands/npm-trust/): package must already exist.
- [npm stage CLI](https://docs.npmjs.com/cli/v11/commands/npm-stage/) and [official command source](https://github.com/npm/cli/tree/latest/lib/commands/stage): explicit tarball spec, shared version uniqueness and OIDC command limitations. Dry-run behavior was inspected in the official registry's npm 11.21.0 CLI and exercised against loopback; latest source can differ from the pinned version.
- [GitHub deployment environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments): environment protection and plan/visibility requirements.
