# Void TSX compatibility pilot

Verified locally on 2026-10-18 with Node 24.21.0, npm 11.19.0,
honoxpress 0.3.0, void-plugin-hono-jsx 0.2.0, Void 1.1.11,
Hono 4.13.13 and Vite 8.3.4. The reproducible consumer is in
[`pilots/void`](../pilots/void/README.md).

**TSX reuse works with the pilot's integration changes. The unmodified published
templates are not sufficient for Void's full client-rendered Pages mode.**
Markdown-first authoring is the agreed next step. Full MDX integration is deferred;
this TSX pilot provides neither a Markdown adapter extension nor an MDX compiler.

The current source adds the honoxpress-side class, theme, frame and catalog APIs;
these are unreleased. The separate packed-candidate consumer uses those APIs
without the pilot's class/theming patches and retains only the Void SSR/style-host
workaround. See [framework integration](framework-integration.md). Tracking:
[honoxpress #35](https://github.com/ts-76/honoxpress/issues/35),
[#36](https://github.com/ts-76/honoxpress/issues/36),
[#37](https://github.com/ts-76/honoxpress/issues/37),
[#38](https://github.com/ts-76/honoxpress/issues/38);
[Void #116](https://github.com/ts-76/void-plugin-hono-jsx/issues/116),
[#117](https://github.com/ts-76/void-plugin-hono-jsx/issues/117).

## What the pilot exercises

The component page uses Callout, Cards/Card, Steps/Step, Accordion/AccordionItem,
and CodeGroup (including Tabs, TabPanel and CopyCode). The reference page adds
FileTree/Folder/File, TypeTable and inline code. Page and navigation content is
provided in English and Japanese. The shell reuses the published docs CSS and
tokens, while Void owns the document and head metadata.

| Check                    | Result with integration changes                                                                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| SSR, JavaScript disabled | Both routes contain text and component CSS; native disclosures work; code samples remain readable                                   |
| Client navigation        | Component → reference → translated reference → Back/Forward → component keeps the document and persistent layout                    |
| Page metadata            | Title and `html[lang]` follow the destination route                                                                                 |
| CSS                      | Stable classes survive redraw; newly visited components receive rules; repeated warm navigation does not grow the rule count        |
| Consumer override        | An ordinary `.hx-callout` radius override wins in SSR and after client navigation without increasing specificity                    |
| Theme                    | Light/dark/system controls remain enabled, synchronize and persist through navigation and reload; system mode follows media changes |
| Interactive components   | Tab click/arrow keys, visible panel, real clipboard copy and completion feedback work                                               |
| Responsive layout        | No document-level horizontal overflow at 1280px, 390px or 320px; mobile navigation and theme controls work                          |

Automated coverage: 12 JavaScript-disabled route/language/width cases in development
and the same 12 in production preview; 8 development and 12 production
language/width/light-dark interaction scenarios. Production scenarios capture
both pages, producing 24 screenshots. TypeScript and the production build pass.
The interaction scenarios assert that no extra document request is made by SPA,
language or history navigation, and that there are no browser console/page errors.

Screenshots also cover long identifiers and type unions. The 320px header uses
compact EN/JA labels with full accessible language names. Code blocks scroll
inside their container; long inline identifiers wrap within the table.

Physical phones, Safari/WebKit, production deployment, CSP nonces, static export,
island-only/zero-JavaScript output, HMR editing behavior and MDX compilation are
outside the observed evidence. The TypeTable template still has hardcoded English
column/status labels on the Japanese page; the pilot preserves its current API.

## Failures in the published-template baseline

“Baseline” means the same content-only Void shell and published component files,
with the class, SSR finalization and theme lifecycle adaptations disabled. It
does not nest the complete HonoX DocsLayout inside Void's document.

1. **Missing SSR component CSS.** `style#hono-css` is empty in the raw response.
   The generated Void renderer awaits JSX `.toString()`, then embeds its markup
   as HTML without completing the asynchronous Hono HTML callbacks. Those
   callbacks register and emit the static component styles.
2. **Broken classes on the initial browser redraw.** Nine elements in the
   baseline component page receive `class="[object Promise]"`. The templates use
   `hono/html` to compose global CSS registration with stable class names. That
   HTML value preserves server callbacks, but loses the CSS object's DOM-aware
   string conversion when the DOM renderer sets the attribute.
3. **Disabled theme controls.** The early initializer runs at document load;
   the later Void redraw creates new disabled selects. The initializer's
   `DOMContentLoaded` hook does not provide a page-render lifecycle callback.
4. **CSS host and cascade ownership need coordination.** A style node inside
   `#app` is vulnerable to the initial redraw. Appending the replacement after
   consumer styles would also change the precedence of existing overrides.

## Experimental fixes and upstream destinations

| Destination                   | Recommended change                                                                                                                               | Pilot evidence                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| void-plugin-hono-jsx          | Complete Hono HTML callbacks once per SSR response; expose a supported place for collected component CSS in head, before application CSS         | `integration/ssr-css-plugin.ts` resolves callbacks and moves the collected host into the document head |
| honoxpress                    | Add a shared SSR/DOM-safe class composition helper and use it in static templates, retaining `.hx-*` selectors and consumer override specificity | Three template imports are changed by sync; declarations, props and CSS bodies remain unchanged        |
| Void integration layer        | Keep one persistent CSSOM host outside the client root, before consumer CSS; preserve it across head commits and route changes                   | `integration/style-host.tsx` plus route/cascade checks                                                 |
| honoxpress + Void integration | Separate reusable early theme bootstrap from idempotent control synchronization; call synchronization after initial render and navigation        | The pilot adds one document event listener and dispatches it from a persistent layout effect           |
| honoxpress                    | Offer a content-only docs frame and router-link adapter, keeping the existing full HonoX document layout                                         | Pilot layout uses Void Link and leaves `html`, `head`, `body` and metadata to Void                     |

The prototype does not edit installed dependencies or change the published
templates in this repository. The text transform of the generated renderer is a
diagnostic workaround, not a public extension point. Upstream implementation must
replace it with renderer-owned behavior and add regression tests in that package.

Hono's browser CSS registry also reinserts the initially server-rendered rules on
first redraw. The pilot observes a bounded initial duplication, then stable rule
counts after both pages have been visited. It does not claim SSR-to-DOM rule
deduplication has been solved. A production adapter should consider seeding that
registry or providing a supported SSR/DOM style handoff.

Full TSX Pages redraw the component tree in the browser. Static component source
and its CSS strings therefore participate in that browser graph. This experiment
does not preserve HonoX's server-only static-component delivery boundary. Evaluate
Void island pages separately if keeping static content out of browser JavaScript
is a requirement.

## Markdown-first decision and deferred MDX work

On 2026-10-18 the authoring direction changed to reusing `voidHonoMarkdown()`:
static components produce HTML/CSS, interactive wrappers opt into islands, and
complex props stay in TSX wrappers. [Markdown-first authoring](markdown.md)
documents the new `honoxpress/markdown` component boundary and the HonoX `.md`
fixtures. Those fixtures are not a test of production Void Markdown support.
Void #117 now tracks the missing public static-component extension point; #116
remains the independent SSR CSS prerequisite. The MDX-specific rows below record
the original larger proposal, which is deferred rather than required for this path.

The current optional `voidHonoMarkdown()` plugin discovers and compiles **`.md`**,
not `.mdx`. Its island syntax accepts literal string/boolean props and no tag
children or JSX expressions. Existing honoxpress examples such as
`<Cards><Card>…</Card></Cards>` and `<TypeTable properties={[…]} />` cannot be
ported by changing the filename or enabling the Markdown plugin.

| Work                           | Required behavior and acceptance evidence                                                                                                                                                                                                                                                                                                      |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MDX discovery/compiler adapter | Discover `.mdx` through Void's page scan/manifest and compile to Hono JSX in SSR and browser targets. Support component registry, imports, expressions, nested children and companion server loaders without introducing React. Reject unsupported constructs clearly.                                                                         |
| Build pipeline reuse           | Reuse honoxpress heading IDs, component validation and build-time code highlighting. Connect `useMDXComponents` without HonoX island assumptions. Keep MDX/Shiki compilation out of browser and deployed runtime graphs.                                                                                                                       |
| Metadata/catalog abstraction   | Separate catalog identity from `app/routes/[locale/]docs/*.mdx`. Current `createDocsCatalog` validates HonoX MDX paths, while `docsMetadataPlugin` discovers those files and has HonoX reload behavior. Introduce explicit normalized locale/slug/href metadata plus framework-specific discovery adapters; retain the existing HonoX adapter. |
| Navigation and layout contract | Define whether MDX uses full Pages or document navigation/islands. The current Void Markdown plugin uses document navigation. Specify links, default/named layout replacement, localized URLs, translation availability, head metadata, breadcrumbs and TOC updates under that contract.                                                       |
| CSS and theme lifecycle        | Replace the pilot renderer patch with supported SSR collection/head insertion, a persistent browser host, compatible class values and an idempotent theme hook. Verify requests do not share CSS/context state and that CSP nonces reach emitted styles/scripts.                                                                               |
| SSG/runtime boundary           | Verify Void static prerender paths and loader evaluation for both locales, correct generated page-data assets, unknown route behavior and compiler-free deployed output. HonoX's existing three-stage client/SSG/Worker scaffold cannot simply be copied.                                                                                      |
| Authoring and setup            | Add a Void installer/scaffold that centralizes site settings, copies editable components and chooses the correct router, client entry and compiler. Keep optional Markdown/MDX dependencies optional for ordinary TSX consumers.                                                                                                               |
| Acceptance matrix              | Cover real SSR plus browser context identity, heading/frontmatter/TOC parity, nested components, rich TypeTable/CodeGroup props, route and translation additions/removals, JavaScript-disabled reading, light/dark/system, PC/SP, static output and packed external consumers.                                                                 |

Recommended order: upstream the renderer/CSS/theme primitives and explicit
catalog/frame, then connect and verify the Markdown component boundary through
the Void adapter's public extension point. Keep discovery/parsing/routing in Void.
Revisit a full MDX adapter only if Markdown plus TSX wrappers cannot satisfy an
identified authoring requirement.

Source references: [Hono CSS helper](https://hono.dev/docs/helpers/css),
[Void Hono adapter](https://github.com/ts-76/void-plugin-hono-jsx),
[its optional Markdown contract](https://github.com/ts-76/void-plugin-hono-jsx/blob/main/docs/markdown.md),
[`catalog.ts`](../packages/docs/src/catalog.ts),
[`build.ts`](../packages/docs/src/build.ts), and
[`mdx-components.ts`](../packages/docs/starter/mdx-components.ts).
