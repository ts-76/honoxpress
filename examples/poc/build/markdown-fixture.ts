// Experimental host adapter. Parsing, syntax and routing belong to this example,
// not to honoxpress/markdown or to the Void adapter's production implementation.
import { readFile } from "node:fs/promises";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkDirective from "remark-directive";
import remarkRehype from "remark-rehype";
import type { Plugin } from "vite-plus";

interface Node {
  type: string;
  name?: string;
  tagName?: string;
  value?: string;
  attributes?: Record<string, string>;
  properties?: Record<string, unknown>;
  data?: Record<string, unknown>;
  children?: Node[];
}
export interface MarkdownTree extends Node {
  type: "root" | "element" | "text" | "component";
  children?: MarkdownTree[];
}
const id = "virtual:honoxpress/markdown-fixture";
const query = "?docs-markdown";

async function parse(source: string) {
  const parser = unified().use(remarkParse).use(remarkDirective);
  const tree = parser.parse(source);
  function directives(node: Node) {
    if (node.type.endsWith("Directive")) {
      node.data = {
        hName: "hx-markdown-component",
        hProperties: { name: node.name, attributes: JSON.stringify(node.attributes ?? {}) },
      };
    }
    if (node.type === "html") throw new Error("Markdown fixture: use directives, not raw HTML/JSX");
    node.children?.forEach(directives);
  }
  directives(tree as unknown as Node);
  const hast = (await unified().use(remarkRehype).run(tree)) as unknown as Node;
  const text = (node: Node): string => node.value ?? node.children?.map(text).join("") ?? "";
  const headings: { depth: number; id: string; text: string }[] = [];
  const used = new Set<string>();
  function normalize(node: Node): MarkdownTree {
    const children = node.children?.map(normalize);
    if (node.tagName === "hx-markdown-component")
      return {
        type: "component",
        name: String(node.properties?.name),
        attributes: JSON.parse(String(node.properties?.attributes)),
        children,
      };
    const properties = { ...node.properties };
    if (/^h[1-6]$/.test(node.tagName ?? "")) {
      const label = text(node).trim();
      const base =
        label
          .normalize("NFKC")
          .toLowerCase()
          .replace(/[^\p{L}\p{N}\s_-]/gu, "")
          .trim()
          .replace(/\s+/g, "-") || "section";
      let anchor = base;
      let suffix = 1;
      while (used.has(anchor)) anchor = `${base}-${suffix++}`;
      used.add(anchor);
      properties.id = anchor;
      headings.push({ depth: Number(node.tagName![1]), id: anchor, text: label });
    }
    if (!["root", "element", "text"].includes(node.type))
      throw new Error(`Markdown fixture: unsupported node ${node.type}`);
    return {
      type: node.type as MarkdownTree["type"],
      tagName: node.tagName,
      value: node.value,
      properties,
      children,
    };
  }
  const content = normalize(hast);
  return {
    tree: content,
    headings,
    title: headings.find((heading) => heading.depth === 1)?.text ?? "Markdown",
  };
}

export function markdownFixturePlugin(worker: boolean): Plugin {
  let root = "";
  return {
    name: "honoxpress-example-markdown",
    configResolved(config) {
      root = config.root;
    },
    resolveId(source) {
      if (source === id) return `\0${id}`;
    },
    async load(source) {
      if (source === `\0${id}`) {
        if (worker) return "export const pages = [];";
        return [
          ...["en", "ja"].map(
            (locale) =>
              `import * as ${locale} from ${JSON.stringify(`${root}/content/${locale}.md${query}`)};`,
          ),
          "export const pages = [",
          ...["en", "ja"].map(
            (locale) =>
              `{locale:${JSON.stringify(locale)}, slug:"markdown", href:${JSON.stringify(`${locale === "ja" ? "/ja" : ""}/docs/markdown`)}, title:${locale}.title, headings:${locale}.headings, order:2},`,
          ),
          "];",
        ].join("\n");
      }
      if (!source.endsWith(query)) return;
      const file = source.slice(0, -query.length);
      this.addWatchFile(file);
      const result = await parse(await readFile(file, "utf8"));
      return Object.entries(result)
        .map(
          ([key, value]) =>
            `export const ${key} = JSON.parse(${JSON.stringify(JSON.stringify(value))});`,
        )
        .join("\n");
    },
  };
}
