import type { Child } from "hono/jsx";
import { jsx } from "hono/jsx/jsx-runtime";
import { createDocsMarkdownRenderer, type DocsMarkdownAttributes } from "honoxpress/markdown";
import type { MarkdownTree } from "../build/markdown-fixture";
import {
  Callout,
  Cards,
  Card,
  Steps,
  Step,
  Accordion,
  AccordionItem,
} from "./components/docs-content";
import { TypeTable } from "./components/type-table";
import CodeGroup from "./islands/code-group";

const attribute = (attributes: DocsMarkdownAttributes, key: string) => {
  const value = attributes[key];
  if (value !== undefined && typeof value !== "string") throw new Error(`Expected text: ${key}`);
  return value;
};
// This registry belongs to the application. Keep local wrappers and CSS overrides
// when upgrading honoxpress; no template installer rewrites this file.
const render = createDocsMarkdownRenderer({
  components: {
    Callout: {
      kind: "static",
      render: ({ attributes, children }) => (
        <Callout title={attribute(attributes, "title")}>{children}</Callout>
      ),
    },
    Cards: { kind: "static", render: ({ children }) => <Cards>{children}</Cards> },
    Card: {
      kind: "static",
      render: ({ attributes, children }) => (
        <Card title={attribute(attributes, "title") ?? ""} href={attribute(attributes, "href")}>
          {children}
        </Card>
      ),
    },
    Steps: { kind: "static", render: ({ children }) => <Steps>{children}</Steps> },
    Step: {
      kind: "static",
      render: ({ attributes, children }) => (
        <Step title={attribute(attributes, "title")}>{children}</Step>
      ),
    },
    Accordion: { kind: "static", render: ({ children }) => <Accordion>{children}</Accordion> },
    AccordionItem: {
      kind: "static",
      render: ({ attributes, children }) => (
        <AccordionItem title={attribute(attributes, "title") ?? ""}>{children}</AccordionItem>
      ),
    },
    Properties: {
      kind: "static",
      render: ({ attributes }) => (
        <TypeTable
          caption={attributes.locale === "ja" ? "画像のプロパティ" : "Image properties"}
          properties={[
            {
              name: "src",
              type: "string",
              required: true,
              description:
                attributes.locale === "ja" ? "画像の URL を指定します。" : "The URL of the image.",
            },
            {
              name: "loading",
              type: '"lazy" | "eager"',
              defaultValue: '"lazy"',
              description:
                attributes.locale === "ja"
                  ? "最初に表示する画像には eager を指定します。"
                  : "Use eager for images visible when the page opens.",
            },
          ]}
        />
      ),
    },
    CodeSamples: { kind: "island" },
  },
  renderIsland(name, { attributes, children }) {
    // HonoX owns the imported island, serialized props and hydration. Void will
    // supply its own adapter; do not assume it accepts child content today.
    if (name !== "CodeSamples" || (children && (!Array.isArray(children) || children.length)))
      throw new Error("Unsupported island content");
    const ja = attributes.locale === "ja";
    return (
      <CodeGroup
        ariaLabel={ja ? "コードの例" : "Code samples"}
        samples={[
          {
            label: "TypeScript",
            filename: "page.tsx",
            language: "tsx",
            code: 'export const title: string = "Hello";',
            copyLabel: ja ? "TypeScript をコピー" : "Copy TypeScript",
          },
          {
            label: "JavaScript",
            filename: "page.jsx",
            language: "jsx",
            code: 'export const title = "Hello";',
            copyLabel: ja ? "JavaScript をコピー" : "Copy JavaScript",
          },
        ]}
      />
    );
  },
});

/** The host adapter normalizes its parsed tree; the library only handles components. */
function renderTree(tree: MarkdownTree): Child {
  const children = tree.children?.map(renderTree);
  if (tree.type === "root") return <>{children}</>;
  if (tree.type === "text") return tree.value ?? "";
  if (tree.type === "component") return render(tree.name!, tree.attributes, children);
  const properties = { ...tree.properties };
  if (Array.isArray(properties.className)) properties.class = properties.className.join(" ");
  delete properties.className;
  return jsx(tree.tagName!, { ...properties, children });
}

export function MarkdownContent({ tree }: { tree: MarkdownTree }) {
  return <>{renderTree(tree)}</>;
}
