import type { Child } from "hono/jsx";

/** Literal attributes from a host parser. Structured data belongs in a TSX wrapper. */
export type DocsMarkdownAttributes = Readonly<Record<string, string | boolean>>;
export interface DocsMarkdownContent {
  readonly attributes: DocsMarkdownAttributes;
  /** Already parsed/renderable content. Never pass unescaped source HTML here. */
  readonly children?: Child;
}
export type DocsMarkdownComponent =
  | { readonly kind: "static"; readonly render: (content: DocsMarkdownContent) => Child }
  | { readonly kind: "island" };
export interface DocsMarkdownOptions {
  readonly components: Readonly<Record<string, DocsMarkdownComponent>>;
  /** The host owns island discovery, serialization, SSR and hydration. */
  readonly renderIsland?: (name: string, content: DocsMarkdownContent) => Child;
}

/**
 * Parser-neutral component boundary for trusted local Markdown. Does not parse
 * Markdown, evaluate expressions, stringify JSX, or install a client runtime.
 * Return the result inside the host's Hono JSX document so SSR CSS callbacks run.
 */
export function createDocsMarkdownRenderer(options: DocsMarkdownOptions) {
  const components = new Map(Object.entries(options.components));
  for (const [name, entry] of components) {
    if (!/^[A-Z][A-Za-z0-9]*$/.test(name))
      throw new Error(`Invalid Markdown component name: ${name}`);
    if (
      !entry ||
      (entry.kind !== "island" && (entry.kind !== "static" || typeof entry.render !== "function"))
    )
      throw new Error(`Invalid Markdown component registration: ${name}`);
  }
  const renderIsland = options.renderIsland;
  return (name: string, attributes: DocsMarkdownAttributes = {}, children?: Child): Child => {
    const entry = components.get(name);
    if (!entry) throw new Error(`Unknown Markdown component: ${name}`);
    if (!attributes || typeof attributes !== "object" || Array.isArray(attributes))
      throw new Error(`Expected literal Markdown attributes for ${name}`);
    const copy: Record<string, string | boolean> = Object.create(null);
    for (const [key, value] of Object.entries(attributes)) {
      if (
        !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(key) ||
        /^(?:children|key|ref|dangerouslySetInnerHTML|__proto__|prototype|constructor)$/i.test(
          key,
        ) ||
        /^on/i.test(key) ||
        (typeof value !== "string" && typeof value !== "boolean")
      )
        throw new Error(`Expected a literal, non-reserved Markdown attribute: ${name}.${key}`);
      copy[key] = value;
    }
    const content = { attributes: Object.freeze(copy), children };
    if (entry.kind === "static") return entry.render(content);
    if (!renderIsland)
      throw new Error(`Markdown island ${name} requires the host's renderIsland adapter`);
    return renderIsland(name, content);
  };
}
