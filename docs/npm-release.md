# npm release preparation and approval boundaries

MIT, honoxpress@0.1.0 and npm owner ts-76 were approved on 2026-10-02. GitHub public visibility was explicitly approved on 2026-10-03 and confirmed at [ts-76/honoxpress](https://github.com/ts-76/honoxpress). The repository had already been renamed when checked; local ghq checkout remains honox-docs-poc. Canonical package URLs and CI repository checks now use honoxpress.

The owner logged in. Read-only whoami and selected profile checks confirmed exactly ts-76 with active auth-and-writes 2FA on 2026-10-03; no credentials were printed/created/changed by the agent. Registry GET returned 404 for honoxpress. These observations do not authorize an actual registry write.

## Public candidate and current checks

packages/docs/package.json now has private:false for the unpublished distribution candidate; root workspace remains private. The earlier private tarball is not reused or edited. release-policy.json retains stageEnabled:false and provenance:null. main, release tags, repository variables, environment and Trusted Publisher settings are untouched.

```sh
pnpm install --frozen-lockfile
pnpm verify
cat artifacts/release/plan.json
cat artifacts/release/dry-run.json
```

Full verification checks format, warning-free typed lint, tsc, 15 package tests, 5 build tests, 6 development/production browser tests, packed external consumer and 10 release regressions. Consumer checks bind source commit, tarball SHA256/SHA512, packed metadata, root/package/packed LICENSE, exports/types/templates, outside-repo installation, stale output cleaning and empty Worker/client docs/compiler graphs.

The public candidate retains a blocked plan: staging-disabled, provenance-decision and version-tag. Removing the package-private blocker does not activate publication. Pinned npm 11.21.0 dry-run uses isolated HOME/config/cache/environment and a loopback HTTP tripwire with no inherited credentials/OIDC. Only GET is allowed; any network write or changed bytes fails. No official-registry dry-run or stage runs here. Mac Devbox/chezmoi/global cf/pnpm choices remain intact.

## Initial authenticated stage

Trusted Publisher registration requires an existing package. For the currently nonexistent name, an initial authenticated stage is needed before pure OIDC can be configured. npm stage publish creates a publicly visible 0.0.0-stage placeholder; candidate contents remain unavailable until npm maintainer approval.

A stage from the logged-in Mac cannot generate npm provenance, which requires a supported cloud CI runner. The recommended initial bootstrap is the exact newly CI-accepted tarball with explicit public access, latest channel, ignored lifecycle scripts and provenance:false. This exception needs owner approval of the concrete artifact and public placeholder; it is separate from future CI provenance. No direct npm publish fallback or new permanent token is proposed.

After an authorized stage, inspect the actual stage ID and download its tarball to compare SHA256/SHA512 against the accepted bytes. A missing receipt is not proof that npm received nothing: inspect pending stages before any retry. Final npm stage approve requires owner review and 2FA and is never automated. OIDC credentials cannot list/view/approve pending stages.

## Future CI staging and controls

.github/workflows/npm-stage.yml is manually dispatched on a matching v0.1.0 tag. Its quality job calls the same three-Node Verify workflow. Every job must succeed before preparation retrieves the Node 24.12.0 accepted tarball from that same run and attempt. The staging job never rebuilds/repackages the package.

Before activating it, separately authorize these concrete settings:

- Review/integrate the Draft PR stack into main and create v0.1.0 on the reviewed main commit. Source commit, tag and package/policy version must match, and the tagged commit must be reachable from origin/main.
- Choose explicit future CI provenance. The now-public repository supports provenance:true; policy remains unset until chosen.
- Create npm-stage environment on ts-76/honoxpress with named required reviewer(s), prevent_self_review:true and deployment tag rules for approved v* tags. The workflow initiator cannot approve their own deployment. GitHub Free/Pro/Team allow required reviewers for public repositories; choose an independent reviewer before activation. Protection is never weakened to accommodate a solo release.
- After initial placeholder creation, configure honoxpress Trusted Publisher: GitHub owner ts-76, repository honoxpress, workflow filename npm-stage.yml, environment npm-stage. Grant stage publish only; no direct publish or dist-tag changes.
- Only after these controls are authorized/registered, set release-policy.json.stageEnabled:true and repository variable NPM_STAGING_ENABLED=true, then verify the activation commit again.

The stage job alone receives contents:read, actions:read and id-token:write. It installs pinned npm 11.21.0 job-locally without lifecycle scripts, validates actual environment protections/repository visibility, checks existing package/approved maintainer/version absence, and submits exact accepted bytes to the official registry with explicit access/tag/provenance. There are no CI npm tokens.

Concurrency serializes this repository's attempts for a tag without cancelling an in-flight stage. Artifact/receipt names contain run attempt and preserve failed evidence. Retry the whole quality flow; a downstream-only rerun cannot silently use an earlier attempt's artifact. Outages fail closed. npm's shared version uniqueness also covers pending stages. Other maintainers' local actions are outside workflow concurrency.

## Evidence and limits

Earlier private-source commit 068fe78d4415feaf4a41db4c5b1fb6553b5119eb passed all three Node jobs in [run 36957944342](https://github.com/ts-76/honoxpress/actions/runs/36957944342). That success does not accept this changed public candidate; inspect its new exact-head CI and artifacts. The current final acceptance result belongs in the PR and local handoff evidence.

An earlier f09963d run (36956721250) timed out at external-consumer Vitest startup on Node 24.21.0 without an assertion failure. Its cause was not established and diagnostics were retained. Revalidation on 068fe78 passed all three versions. Timeouts/dependencies/protections were not relaxed.

Release workflow orchestration is statically checked with actionlint and its prepare helper is exercised on accepted artifacts. Actual dispatch, environment approval, OIDC exchange, stage receipt, final npm 2FA approval, registry installation and provenance remain unexecuted. Cloudflare deployment and the hono-decks real-page pilot remain separate tasks.

Official specifications checked on 2026-10-03:

- [npm staged publishing](https://docs.npmjs.com/staged-publishing/): public first placeholder, Node/npm prerequisites and manual 2FA approval.
- [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/): hosted runners, exact workflow/environment binding, stage-only permission and public-repository provenance.
- [npm trust prerequisites](https://docs.npmjs.com/cli/v11/commands/npm-trust/): existing package required.
- [npm provenance](https://docs.npmjs.com/generating-provenance-statements/): supported cloud CI runner required; local stage cannot generate it.
- [npm stage CLI](https://docs.npmjs.com/cli/v11/commands/npm-stage/): tarball specs and staged-package review commands. Local loopback verification uses the pinned official npm 11.21.0 CLI.
- [GitHub environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments): required reviewers, self-review prevention and plan/visibility requirements.
