# Void documentation

Use Node 24.22.1 or newer within Node 24. Install dependencies, then run `npm run dev`.
`npm run build` creates the production app; `npm run preview` serves it locally.
Run `npm run typecheck` to check the TSX and configuration files.

- Edit site settings in `app/docs.config.ts`.
- Write pages under `pages/docs`. Keep `locale`, translation `slug`, and actual route `href` explicit in frontmatter.
- `app/docs-catalog.ts` collects metadata and headings for navigation and TOC.
- `pages/docs/layout.tsx` mounts the editable `app/void-layout.tsx`.
- Static imports use `with { component: "static" }`. Only explicit `with { island: "load" }` imports send component JavaScript.
- Define array/object props in a TSX wrapper such as `app/markdown/Properties.tsx` or `CodeSamples.tsx`. Markdown accepts literal attributes, not JSX expressions.
- Use `:::component Name` containers for Markdown children. Nested containers need more colons on the outer fence.
- `interactive: true` enables theme controls. Static pages use the system palette without JavaScript.
- Edit `/public/style.css`, `components.css`, and `tokens.css` for honoxpress styles. Optional `void-plugin-hono-jsx/theme-content.css` styles use `.void-md` and separate `--vmd-*` tokens.
- Links use native document navigation. No custom router, renderer source patch, or second Markdown compiler is installed.

This starter requires `void-plugin-hono-jsx >=0.3.0 <0.8.0`. Setup and verification do not deploy the application.

For an existing app, `init --framework void` copies components and integration
files without editing Vite config, routes, or dependencies. Add `voidHonoJsx()`
and `voidHonoMarkdown()` after `voidPlugin()` in Vite; mount `app/void-layout.tsx`
in your docs route layout and link `/style.css` from Void head config. Install
`void-plugin-hono-jsx`, `markdown-exit`, `markdown-it-container`, `yaml`,
`shiki`, and `@shikijs/transformers` with the versions in the starter's package.json.

The generated catalog keeps `honoxpress/void` so an existing installation does
not require a package upgrade just to copy the integration.
`honoxpress/adapters/void` exposes the same adapter in newer packages. The neutral mapper is `honoxpress/adapters/hono-markdown`.
The same Void app may also mount hono-decks at `/slides`; keep the docs layout
scoped to `/docs` and let each integration own its document routes.

New Void starters use Void 1.2.1 and adapter 0.7 on Node >=24.22.1 <25. Existing compatible app configuration and scripts remain unchanged. Adapter 0.7 retains the documented [Void/Cloudflare dependency risks](https://github.com/ts-76/void-plugin-hono-jsx/blob/v0.7.0/docs/dependency-security.md); this is not an audit-zero stack.
