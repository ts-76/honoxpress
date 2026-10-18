# Markdown-first authoring

The API below is included in **honoxpress 0.4.0**, introduced by PR #39.
Existing HonoX/MDX sites keep their current compiler, registry and routes. This
change adds a component boundary for Markdown hosts; it does not make the
published Void adapter support nested static components automatically.

Prefer ordinary Markdown for prose, links, headings and code fences. Use static
components for callouts, cards, steps and native disclosures. Use an explicit
island only for interactions such as tabs, copying or a live demo. Arrays,
objects, calculations and localization logic belong in application-owned TSX
wrappers, rather than JavaScript expressions in Markdown.

## Register application-owned wrappers

```tsx
import { createDocsMarkdownRenderer } from "honoxpress/markdown";
import { Callout } from "./components/docs-content";
import { TypeTable } from "./components/type-table";
import CodeGroup from "./islands/code-group";

export const renderComponent = createDocsMarkdownRenderer({
  components: {
    Callout: {
      kind: "static",
      render: ({ attributes, children }) => (
        <Callout title={String(attributes.title ?? "")}>{children}</Callout>
      ),
    },
    Properties: {
      kind: "static",
      render: () => <TypeTable properties={[{ name: "src", type: "string", required: true }]} />,
    },
    CodeSamples: { kind: "island" },
  },
  renderIsland(name, { attributes, children }) {
    // This example uses HonoX's imported island wrapper. A different framework
    // supplies its own island adapter and serialization rules.
    if (name !== "CodeSamples" || children) throw new Error("Unsupported island content");
    return <CodeGroup samples={[{ label: "npm", code: "npm install honoxpress" }]} />;
  },
});
```

The host calls `renderComponent("Callout", { title: "A note" }, parsedChildren)`
and places the returned child inside its Hono JSX document. Do not stringify it
before rendering the document: the host must finish SSR callbacks and emit
`Style` before application styles, as described in the [framework guide](framework-integration.md).
HonoX's copied `DocsLayout` already does this.

Names are case-sensitive PascalCase identifiers. Attributes are strings or
booleans; unknown component names, structured values, expression/spread attribute
keys, event handlers and reserved JSX properties fail. The API does not evaluate
expressions. Wrappers validate and convert their own literal attributes (for
example, converting `columns="3"` to the number `3`) and supply their own data.
Component text is escaped by Hono JSX; `children` must be already parsed JSX/text,
never source HTML passed through `raw()`. This is a trusted-local-content API,
not an HTML sanitizer for user submissions.

Static registrations return ordinary renderable children and require no island
adapter. Island registrations require `renderIsland`; omitting it throws instead
of silently shipping an inert control. The host owns component imports,
serializable props, child support, hydration strategy and fallback HTML. Its
callback must return the host's actual island wrapper, not just a static JSX
component. An imported HonoX island is not a portable Void island.

`honoxpress/markdown` contains no parser, compiler, filesystem API, UI template or
client scheduler. It is separate from the normal runtime entry. Parser packages
used by the example are dev dependencies of that example, not package peers or
new runtime dependencies. Import only the wrappers and components a site uses;
an eager registry containing every component can still make the server graph
larger. Whole-page JavaScript depends on the host's client entry, theme script
and other interactions; a `.md` filename alone does not mean zero JavaScript.

## Running example and syntax boundary

The example's `/docs/markdown` and `/ja/docs/markdown` pages read actual
[`content/en.md`](../examples/poc/content/en.md) and
[`content/ja.md`](../examples/poc/content/ja.md). A host-owned Vite fixture parses
them at build time using remark and converts directive nodes to calls to the
component renderer. It demonstrates nested content and leaf wrappers:

```md
:::Callout{title="A note"}
Ordinary **Markdown** and `inline code`.
:::

::::Cards
:::Card{title="Guide" href="/docs/getting-started"}
Read the guide.
:::
::::

::Properties

::CodeSamples
```

**Directives are this fixture's syntax, not a newly supported Void syntax or a
required honoxpress parser.** Another host can map its own parsed component tags
to the same renderer. This fixture rejects raw HTML/JSX and does not add imports,
expressions or MDX semantics. It derives headings and metadata at build time and
feeds `createDocsCatalogFromPages`; it does not add `.md` discovery to the existing
HonoX-only `docsMetadataPlugin`.

The example keeps the existing layout, static CSS classes/tokens and consumer
overrides. Its page contains exactly one HonoX island for CodeGroup. Callout,
Cards, Steps, TypeTable and Accordion remain static. With JavaScript disabled,
both code samples and the native disclosure remain readable. Markdown parsing
and static wrapper sources are checked against the browser and Worker graphs;
SSG generates the six Markdown/MDX documentation pages.

## Void integration

honoxpress 0.5.0 adds a [standard Void starter](void.md), based on the Hono
adapter's static imports, Markdown containers, explicit islands, and public CSS
host. It requires `void-plugin-hono-jsx >=0.3.0 <0.4.0`. Existing honoxpress 0.4.0
users can upgrade the package before adopting this starter.

Void and its Hono adapter own compilation, routes, contexts, SSR, islands, and
static export. honoxpress owns editable wrappers, tokens, layout, themes, and the
catalog bridge. The bridge selects metadata exports without retaining page render
functions. No private compiler import, renderer patch, or fake framework is used.
Complex data remains in TSX; explicit islands still accept literal props rather
than nested Markdown children. Full MDX support is a separate feature.

## Adopting 0.4.0

1. Install `honoxpress@0.4.0` or later. For local development, build/pack the
   checkout and install its tarball. Version `0.3.0` does not contain this API.
2. Keep existing copied components, CSS overrides and MDX content. Merge the
   [framework template changes](framework-integration.md#upgrade-consumer-owned-files)
   manually; installing a package does not replace owned files.
3. Add a small local registry and wrappers. Keep the host parser/compiler in the
   build graph and pass parsed children to the component boundary.
4. Connect the host's actual island wrapper only where needed. Keep its normal
   document navigation unless SPA support has been designed and verified.
5. Check English/Japanese, desktop/mobile, light/dark/system, JS-disabled reading,
   CSS override precedence, locale links/back navigation and emitted asset graphs.
