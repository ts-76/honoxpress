# Void integration

honoxpress 0.5.0 adds a Void/Hono Markdown starter. Use Node 24.21.0 and
`void-plugin-hono-jsx >=0.3.0 <0.4.0`.

## Start a site

Create an empty directory, then run:

```sh
pnpm dlx honoxpress@0.5.0 init --framework void --starter --cwd /path/to/new-docs
cd /path/to/new-docs
npm install
npm run dev
```

Open `/docs/en/guide` or `/docs/ja/examples`. `npm run build` and
`npm run preview` exercise the production app; `npm run typecheck` checks TSX and
configuration. Setup copies files without installing dependencies or deploying.

For an existing Void Hono app, omit `--starter`. Connect `voidPlugin()`,
`voidHonoJsx()`, and `voidHonoMarkdown()` in Vite; mount `app/void-layout.tsx`
from the documentation route layout. Load `/style.css` in Void's head config.
The generated `docs/void.md` describes the owned files and authoring syntax.

## Ownership and behavior

- Void owns routes, head, loaders, builds, and document rendering.
- `void-plugin-hono-jsx` compiles Hono Markdown, collects SSR CSS, and mounts explicit islands.
- honoxpress supplies editable components, navigation, TOC, translations, and themes.
- `honoxpress/void` exports `createVoidDocsCatalog(modules, config)` and `VoidDocsModule`. The bridge reads public `frontmatter`/`headings` exports without a parser, framework, or Node dependency.
- `locale`, translation `slug`, and actual `href` are explicit frontmatter. The default language changes navigation; it does not rename Void routes.
- Static pages have no client script. `interactive: true` adds theme controls; components hydrate only when explicitly imported as islands.
- Links use document navigation. Local island state resets on navigation.
- Complex props belong in TSX wrappers. The CLI copies components and default-export wrappers under `app/markdown` and preserves edits on later `add` commands.
- Existing HonoX installations keep their default CLI behavior. A directory cannot mix HonoX and Void manifests.

This uses the Hono Markdown adapter rather than official `@void/md`, which has
no public Hono compiler registration API.

## Verification

With the repository's dependencies installed:

```sh
pnpm build:package
pnpm test:void
HX_VOID_STACK=vp pnpm test:void
```

The verifier installs the honoxpress tgz and public `void-plugin-hono-jsx@0.3.0`
in a fresh project. It checks the packaged CLI, frozen reinstall, types,
dev/production rendering, static output, CSS, metadata updates, EN/JA, themes, and
islands in Chromium. CI checks Vite 8.3.4 and Vite Plus 1.3.0 separately.
The standalone starter defaults to Vite; existing Vite Plus apps keep their launcher.

Diagnostics are under `artifacts/void-standard`. The verifier closes its servers
and removes successful temporary consumers. The old [TSX pilot](void-tsx-pilot.md)
is a historical diagnostic. Cloudflare deployment, other browsers, and physical
mobile devices are outside this local verification.
