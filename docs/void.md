# Void integration

The next honoxpress release adds a Void starter. It requires the Void Hono
adapter changes in [PR #122](https://github.com/ts-76/void-plugin-hono-jsx/pull/122),
planned for `void-plugin-hono-jsx >=0.3.0`. Neither this starter nor that adapter
candidate is included in the currently published honoxpress 0.4.0.

## Start a site

Use Node 24.21.0. From a build of this repository:

```sh
pnpm build:package
node packages/docs/bin/honoxpress.mjs init --framework void --starter --cwd /path/to/empty-directory
```

Install the generated dependencies after the required adapter is published.
During development, install the two candidate tgz files instead. Run `npm run dev`,
then open `/docs/en/guide` or `/docs/ja/examples`. `npm run build` and
`npm run preview` exercise the production app. Setup does not install dependencies
or deploy anything.

For an existing Void Hono app, omit `--starter`. Connect `voidPlugin()`,
`voidHonoJsx()`, and `voidHonoMarkdown()` in Vite; mount `app/void-layout.tsx`
from the documentation route layout. Load `/style.css` in Void's head config.
The generated `docs/void.md` describes the owned files and authoring syntax.

## Ownership and behavior

- Void owns routes, head, loaders, builds, and document rendering.
- `void-plugin-hono-jsx` compiles Hono Markdown, collects SSR CSS, and mounts explicit islands.
- honoxpress supplies editable components, navigation, TOC, translations, and themes.
- `honoxpress/void` exports `createVoidDocsCatalog(modules, config)` and `VoidDocsModule`. The bridge reads public `frontmatter`/`headings` exports; it imports no parser, framework, or Node APIs.
- `locale`, translation `slug`, and actual `href` are explicit frontmatter. The default language changes navigation; it does not rename Void routes.
- Static pages have no client script. `interactive: true` adds theme controls; components hydrate only when explicitly imported as islands.
- Links use document navigation. Local island state resets on navigation.
- Complex props belong in TSX wrappers. The CLI copies all standard components and thin default-export wrappers under `app/markdown`; it preserves edits on later `add` commands.
- Existing HonoX installations keep their default CLI behavior. A directory cannot mix HonoX and Void manifests.

This uses the Hono Markdown adapter rather than official `@void/md`, which has
no public Hono compiler registration API. No private renderer transform or
framework impersonation is used.

## Verify a candidate

```sh
# Build PR #122 at commit 743badf8a4153aadf3fbb8a9ab78e6563d3ef555 first.
node scripts/prepare-void-dependency.mjs /path/to/void-plugin-hono-jsx
pnpm build:package
node scripts/verify-void-standard.mjs
HX_VOID_STACK=vp node scripts/verify-void-standard.mjs
```

The verifier installs real tarballs, runs the packaged CLI in an independent
project, reinstalls from its lockfile, and checks dev/production rendering,
types, static output, CSS, metadata updates, EN/JA, themes, and islands in Chromium.
CI checks Vite 8.3.4 and Vite Plus 1.3.0 independently. The standalone starter
defaults to Vite; existing Vite Plus projects keep their launcher and config.
The script owns temporary ports and closes its servers. Diagnostics are under
`artifacts/void-standard`; successful temporary consumers are removed.

Publish the adapter containing PR #122 before the combined honoxpress release.
The old [TSX pilot](void-tsx-pilot.md) remains a historical diagnostic, not the
standard setup. Cloudflare deployment, other browsers, and physical mobile
devices are not covered by this local verification.
