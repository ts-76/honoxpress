# npm release guide

Only `packages/docs` is published as honoxpress. The root workspace stays private. Published npm versions and Git tags are immutable.

## Verified published baseline: 0.1.3

[honoxpress@0.1.3](https://www.npmjs.com/package/honoxpress) was published on 2026-10-04 from `616d1ab97cf5a63f589d2b41e2faf1f85d7c1b76` at [v0.1.3](https://github.com/ts-76/honoxpress/releases/tag/v0.1.3).

[Run 37185030504](https://github.com/ts-76/honoxpress/actions/runs/37185030504) succeeded in all three Node quality jobs, preparation, and CI stage. Downloading the public registry tarball and comparing it to the accepted release plan gives:

- SHA256: `9ca48e0b93cbe859134fc119cc4a141977a1ca322848a5b9300c3441b0da1140`.
- SHA512: `sha512-+mPgHx3jshZ83E5uNghF2vOptjyydBmK+VBWkL6mA9CKercVwlJPpvWYPoRJcY2+1ewQIXpAOmfqfJ6rPsW/XQ==`.
- Public provenance payload: SLSA v1, `ts-76/honoxpress`, `.github/workflows/npm-stage.yml`, `refs/tags/v0.1.3`, and the same source commit and package SHA512 digest. The payload was inspected; no separate signature verification is claimed.

The npm artifact contains the README at its release commit. Documentation merged afterward is included in the next package release. Check the registry for the current latest version rather than assuming that main or a GitHub Release is already published on npm.

## Release flow

1. Merge reviewed feature/fix PRs into main. The release-please workflow creates or updates a version/changelog PR from Conventional Commits. Docs/chore sections are hidden in the current configuration and do not create a release on their own.
2. Review the version, changelog, package metadata, and release-policy version. Root and published-package versions stay synchronized. Verify the generated release PR's exact head before merging.
3. Merging the release PR creates `v<version>` and a GitHub Release. The workflow explicitly dispatches `npm-stage.yml` on that tag.
4. Three-Node quality acceptance runs again. Preparation retrieves the original Node 24.12.0 artifact from the same run/attempt without rebuilding, checking source, metadata, LICENSE, consumer, module graphs, and digest.
5. The stage job requires `stageEnabled: true`, `provenance: true`, repository variable `NPM_STAGING_ENABLED=true`, a matching release tag, and the accepted artifact. The protected `npm-stage` environment pauses for owner ts-76 approval.
6. CI submits only the accepted tarball using stage-only OIDC with provenance. The owner reviews the stage and approves publication with npm 2FA.
7. Confirm the registry version, latest dist-tag, public tarball bytes, metadata/LICENSE, and provenance. Exercise a fresh public-registry consumer when the release changes package behavior.

Final npm approval is not automated. A GitHub tag/release or successful stage does not prove final publication. Never repack a CI tarball on another machine for submission.

## CI configuration

The protected environment uses ts-76 as its sole required reviewer, `prevent_self_review: false`, `can_admins_bypass: false`, and selected `v*` tag rules. Self-review is intentionally allowed for solo maintenance; named-owner review and final npm 2FA remain required. The stage script checks the configuration rather than relying on the environment name.

The npm Trusted Publisher selects GitHub owner `ts-76`, repository `honoxpress`, workflow `npm-stage.yml`, and environment `npm-stage`, with stage-publish permission. Direct publish and dist-tag management are outside this workflow. The successful 0.1.3 stage provides observed submission evidence; it does not imply permission to approve npm stages.

Release Please uses the built-in GITHUB_TOKEN with job-specific write scopes. Default workflow access is read-only. Bot-created events do not reliably trigger ordinary CI, so the release workflow explicitly dispatches Verify with the PR head SHA and explicitly dispatches tagged preparation. Verify rejects a checkout that differs from the expected head.

The manifest tracks the latest released version. Its bootstrap SHA refers to the initial 0.1.0 source. JSON extra-files keep package and release-policy versions synchronized; the generated changelog uses release-please's formatting. No permanent `release-as` override is set.

## Local owner review and 2FA

Use the reviewed npm 11.21.0 with the established Node environment. Replace `REVIEW_REPO_PATH` and `STAGE_ID` before running these read commands:

```sh
rtk proxy pnpm --dir REVIEW_REPO_PATH exec npm stage view STAGE_ID --registry=https://registry.npmjs.org/
rtk proxy pnpm --dir REVIEW_REPO_PATH exec npm stage download STAGE_ID --registry=https://registry.npmjs.org/
```

Compare the downloaded bytes to the accepted plan. Keep authentication URLs, tokens, and OTP codes out of chat and logs.

npm's interactive web-OTP flow needs a terminal. If using RTK, attach approval to the terminal explicitly; set these placeholders in your own shell:

```sh
export REVIEW_REPO_PATH=/path/to/honoxpress
export STAGE_ID=your-stage-id
rtk proxy zsh -lic 'pnpm --dir "$REVIEW_REPO_PATH" exec npm stage approve "$STAGE_ID" --registry=https://registry.npmjs.org/ </dev/tty >/dev/tty 2>/dev/tty'
```

The owner opens the displayed authentication URL and completes 2FA. Approval publishes the package. OIDC cannot approve the stage. If an outcome is unknown, inspect stage and registry state before retrying.

## Verification and recovery

`pnpm verify` includes full acceptance and an isolated npm dry-run. Dry-run uses temporary config/cache, no inherited authentication or OIDC, and a loopback tripwire accepting GET only. It neither contacts the official registry nor submits a stage. Its `provenance: false` setting is for this credential-free local simulation; live CI stage uses `provenance: true`.

A plan outside a matching release tag stays blocked by the version-tag gate. To refresh a release PR or finish tagging an already merged release PR, dispatch `release-please.yml` on main after checking existing state. To prepare a tagged release again, dispatch `npm-stage.yml` on that matching tag.

Concurrency serializes attempts per tag without cancelling an in-flight stage. Artifact and receipt names include the attempt. Retry the complete quality flow; downstream-only reruns cannot silently reuse a previous attempt's artifact. Check for a pending or completed submission before retrying an uncertain outcome.

For a docs-only npm update, prepare an explicitly reviewed patch release or include the update in the next feature/fix release. Never restage an already published version merely to replace its README.

## Historical publication evidence

These records describe earlier immutable releases, not the current npm dist-tag:

| Version | Source commit                              | Accepted tarball SHA256                                            |
| ------- | ------------------------------------------ | ------------------------------------------------------------------ |
| 0.1.0   | `a3ddd9e070274d9fbc2e3ea5611799fdbc0ec646` | `53dbf0b92d6a60857370e1b9b58b967c0fde91bff9ffcb7b2e986f37c4d3a2e4` |
| 0.1.1   | `934a3e4aea866397902a92609de06b963f2582a8` | `9a6bdaf11dfbc3ac9718b3c1c2b24377042e31fb319cc3c9d98c2e9f813c83dd` |

Initial 0.1.0 and 0.1.1 staging used owner-approved local submission with `provenance: false` and final owner 2FA. CI acceptance/preparation runs were [37095700185](https://github.com/ts-76/honoxpress/actions/runs/37095700185) and [37114591151](https://github.com/ts-76/honoxpress/actions/runs/37114591151). The public `0.0.0-stage` placeholder remains registry history. Do not delete that history or reuse these versions.

## Official references

- [Staged publishing](https://docs.npmjs.com/staged-publishing/)
- [Trusted publishers](https://docs.npmjs.com/trusted-publishers/)
- [Provenance](https://docs.npmjs.com/generating-provenance-statements/)
- [npm stage](https://docs.npmjs.com/cli/v11/commands/npm-stage/)
- [GitHub environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)
