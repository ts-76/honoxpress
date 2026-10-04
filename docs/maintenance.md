# Maintenance and upgrade policy

honoxpress is maintained as a 0.x library for trusted local MDX in HonoX applications. The [compatibility guide](compatibility.md) records tested combinations; dependency engine ranges also admit untested versions. Pin the package version in an application and review the changelog before upgrading.

## Compatibility and changes

Runtime metadata APIs, build helpers, and template files are separate public entry points. Changes must preserve that boundary and keep MDX/compiler code out of runtime bundles.

A change to public API shape, route identity, heading anchors, or build behavior that requires consumer changes needs an explicit version decision and migration notes before merging. Do not infer compatibility from a successful build alone. Verify the typed API, routing, generated assets, browser behavior, and an independent installed consumer.

Upgrades to HonoX, Vite Plus, MDX adapters, or Cloudflare tooling require the full acceptance pipeline. Recheck the HonoX watch adapter, eager-import positive control, and stale-output cleanup. Core CI covers Node.js 22.23.3, 24.12.0, and 24.21.0; the real-page pilot currently covers Node.js 24.12.0 on macOS and Ubuntu CI.

## Consumer-owned templates

Copied routes, renderers, islands, and CSS belong to the consumer application. Package updates do not overwrite them. Compare the old and new template files, merge relevant changes manually, and rerun the application's type and browser checks. Preserve the bundled MIT copyright and permission notice in distributed copies.

Describe required template migrations in release notes, including changed imports, props, paths, or CSS tokens. Independent application customizations must remain intact.

## Issues and contributions

Report issues with the exact package/toolchain versions, a minimal reproduction, the affected URL, and the failing dev/SSG/Worker stage. Include sanitized diagnostics and avoid credentials or private content.

Use a branch and a Draft PR describing the problem, resulting behavior, and verification. Maintainer review and approval are required before integration. Documentation-only changes need format/link/example checks; routing, exports, islands, assets, or dependency changes need full acceptance. CI validates the proposed commit.

The current scope is local trusted MDX, standard HonoX routing, metadata, build helpers, and editable templates. Search, drafts, remote/untrusted content, SPA navigation, presenter/export features, and production deployment need separate design and acceptance work. A pilot success establishes compatibility for its tested combination; a wider upstream migration remains a separate change.
