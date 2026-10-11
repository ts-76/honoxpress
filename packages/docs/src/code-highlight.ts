import type { ThemeRegistration } from "shiki";

export interface DocsCodeToken {
  readonly content: string;
  readonly kind: string;
}

// CSS roles keep the same token data valid in SSR, hydrated islands, and both themes.
const theme: ThemeRegistration = {
  name: "honoxpress",
  fg: "var(--docs-text)",
  bg: "var(--docs-surface)",
  settings: [
    { scope: ["comment"], settings: { foreground: "var(--docs-code-comment)" } },
    { scope: ["string"], settings: { foreground: "var(--docs-code-string)" } },
    {
      scope: ["constant.numeric", "constant.language"],
      settings: { foreground: "var(--docs-code-number)" },
    },
    { scope: ["keyword", "storage"], settings: { foreground: "var(--docs-code-keyword)" } },
    {
      scope: ["entity.name.function", "support.function"],
      settings: { foreground: "var(--docs-code-function)" },
    },
    {
      scope: ["entity.name.type", "entity.name.tag", "support.type"],
      settings: { foreground: "var(--docs-code-type)" },
    },
    { scope: ["punctuation"], settings: { foreground: "var(--docs-code-punctuation)" } },
  ],
};

/** Build/server helper. Never import the highlighter into a client island. */
export async function highlightDocsCode(code: string, language = "text"): Promise<DocsCodeToken[]> {
  if (["text", "txt", "plaintext", ""].includes(language))
    return [{ content: code, kind: "plain" }];
  const { codeToTokens, bundledLanguages } = await import("shiki");
  if (!Object.hasOwn(bundledLanguages, language)) return [{ content: code, kind: "plain" }];
  const { tokens } = await codeToTokens(code, {
    lang: language as keyof typeof bundledLanguages,
    theme,
  });
  const endings = code.match(/\r\n|\r|\n/g) ?? [];
  const result: DocsCodeToken[] = [];
  for (const [index, line] of tokens.entries()) {
    for (const token of line) {
      const kind = token.color?.match(/^var\(--docs-code-([a-z]+)\)$/)?.[1] ?? "plain";
      result.push({ content: token.content, kind });
    }
    if (index < tokens.length - 1) result.push({ content: endings[index] ?? "\n", kind: "plain" });
  }
  // Preserve bytes, including unusual line endings, even if a grammar normalizes input.
  return result.map((token) => token.content).join("") === code
    ? result
    : [{ content: code, kind: "plain" }];
}

interface Node {
  type: string;
  name?: string;
  lang?: string;
  value?: unknown;
  children?: Node[];
  attributes?: Node[];
  data?: Record<string, unknown>;
}

function expression(value: unknown): object {
  if (Array.isArray(value)) return { type: "ArrayExpression", elements: value.map(expression) };
  if (value !== null && typeof value === "object")
    return {
      type: "ObjectExpression",
      properties: Object.entries(value).map(([key, item]) => ({
        type: "Property",
        key: { type: "Literal", value: key },
        value: expression(item),
        kind: "init",
        method: false,
        shorthand: false,
        computed: false,
      })),
    };
  return { type: "Literal", value };
}

function staticString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  const node = value as
    | {
        data?: {
          estree?: {
            body?: {
              expression?: {
                type?: string;
                value?: unknown;
                expressions?: unknown[];
                quasis?: { value: { cooked: string } }[];
              };
            }[];
          };
        };
      }
    | undefined;
  const expr = node?.data?.estree?.body?.[0]?.expression;
  if (expr?.type === "Literal" && typeof expr.value === "string") return expr.value;
  if (expr?.type === "TemplateLiteral" && expr.expressions?.length === 0)
    return expr.quasis?.[0]?.value.cooked;
  return undefined;
}

/** Highlight fences and static CodeBlock props while MDX is compiled. */
export function remarkDocsCode() {
  return async (tree: Node) => {
    async function visit(node: Node): Promise<void> {
      if (node.type === "code" && typeof node.value === "string") {
        const tokens = await highlightDocsCode(`${node.value}\n`, node.lang);
        node.data = {
          ...node.data,
          hChildren: tokens.map((token) => ({
            type: "element",
            tagName: "span",
            properties: { className: [`hx-syntax-${token.kind}`] },
            children: [{ type: "text", value: token.content }],
          })),
        };
      }
      if (node.type === "mdxJsxFlowElement" && node.name === "CodeBlock") {
        const attributes = node.attributes ?? [];
        // Spreads or consumer-supplied tokens may override code/language at runtime.
        if (!attributes.some((attr) => attr.type !== "mdxJsxAttribute" || attr.name === "tokens")) {
          const code = staticString(attributes.find((attr) => attr.name === "code")?.value);
          const lang = attributes.find((attr) => attr.name === "language");
          const language = lang ? staticString(lang.value) : "text";
          if (code !== undefined && language !== undefined) {
            const tokens = await highlightDocsCode(code, language);
            attributes.push({
              type: "mdxJsxAttribute",
              name: "tokens",
              value: {
                type: "mdxJsxAttributeValueExpression",
                value: JSON.stringify(tokens),
                data: {
                  estree: {
                    type: "Program",
                    sourceType: "module",
                    body: [{ type: "ExpressionStatement", expression: expression(tokens) }],
                  },
                },
              },
            });
            node.attributes = attributes;
          }
        }
      }
      for (const child of node.children ?? []) await visit(child);
    }
    await visit(tree);
  };
}
