# Release state and maintenance decisions

The published baseline verified on 2026-10-04 is [honoxpress@0.1.3](https://www.npmjs.com/package/honoxpress), from commit `616d1ab97cf5a63f589d2b41e2faf1f85d7c1b76` at [v0.1.3](https://github.com/ts-76/honoxpress/releases/tag/v0.1.3). Subsequent documentation commits on main are not part of that immutable npm artifact.

[Release run 37185030504](https://github.com/ts-76/honoxpress/actions/runs/37185030504) passed the three-Node quality jobs, preparation, and stage. The downloaded registry tarball matches the accepted release plan's SHA256 and SHA512 integrity. The registry publishes a SLSA provenance attestation naming this repository, `npm-stage.yml`, `refs/tags/v0.1.3`, and the same source commit. This inspection confirms the published payload and digest relationship; it is not a separate cryptographic verification of the attestation signature.

| Area                | Current decision or evidence                                                                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Package and license | honoxpress; MIT © 2026 ts-76. Root workspace is private; only `packages/docs` is published.                                                                                                             |
| Version/channel     | Published baseline 0.1.3 / latest at the verification date. Check npm for later publications; never reuse a published version or move its tag.                                                          |
| Release preparation | release-please creates version/changelog PRs from feature/fix commits. Exact-head CI and maintainer review precede integration.                                                                         |
| CI stage/provenance | `stageEnabled: true`, `provenance: true`, and repository variable `NPM_STAGING_ENABLED=true`. The 0.1.3 CI stage succeeded.                                                                             |
| Owner approval      | Protected `npm-stage` environment allows the sole maintainer ts-76 to approve the job, with no admin bypass and `v*` tag restrictions. Final npm publication still requires owner review and 2FA.       |
| Maintenance         | [Maintenance policy](maintenance.md) defines tested compatibility, change acceptance, and manual template migration.                                                                                    |
| Real-page pilot     | The independent [hono-decks pilot](../pilots/hono-decks) pins registry 0.1.3 and verifies MDX save/add/unlink without expected failures. Its local/CI evidence must be assessed at the relevant commit. |
| Production          | Cloudflare deployment, production load, and a full upstream hono-decks migration remain separate work.                                                                                                  |

The public registry SHA256 for 0.1.3 is `9ca48e0b93cbe859134fc119cc4a141977a1ca322848a5b9300c3441b0da1140`. The [release guide](npm-release.md) describes preparation, owner review, approval, and retries.

New package README content is delivered with a new package version. A merged docs-only PR does not itself create a release PR under the current configuration. Use a reviewed feature/fix release or explicitly prepare a documentation patch release when the npm description needs an earlier update.

Retain Cloudflare Nimbus and Fumapress acknowledgements and the MIT notices in copied templates. Consumers own their renderer, routes, islands, and styles; updates must not silently overwrite those files.

[Issue #6](https://github.com/ts-76/honoxpress/issues/6) tracks the real-page adoption decision. The pilot is a tested representative excerpt conversion; adopting it across the upstream application's guides and deployment needs its own scope and acceptance criteria.
