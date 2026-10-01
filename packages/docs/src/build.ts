import { isVisibleMdxRoute } from "./route-files.js";
import type { Plugin } from "vite-plus";
import type { SSGPlugin } from "hono/ssg";
import { readdir } from "node:fs/promises";
import { resolve, relative } from "node:path";
import type { Heading } from "./catalog.js";

export interface DocsBuildOptions {
  readonly locales: readonly string[];
  readonly defaultLocale: string;
  /** Vite-root-relative directory; the consumer still owns HonoX routes. */
  readonly routeRoot?: string;
  /** Must be true for the Worker target. It neither discovers nor imports MDX. */
  readonly worker: boolean;
}
export interface SSGReport {
  accepted: string[];
  skipped: string[];
}
export function docsOnlyPlugin(
  options: Pick<DocsBuildOptions, "locales" | "defaultLocale">,
  report: SSGReport = { accepted: [], skipped: [] },
) {
  const prefixes = options.locales.map(
    (locale) => `${locale === options.defaultLocale ? "" : `/${locale}`}/docs`,
  );
  return {
    beforeRequestHook(request: Request) {
      const pathname = new URL(request.url).pathname;
      const accepted =
        !/[:*]/.test(pathname) &&
        prefixes.some(
          (prefix) =>
            pathname === prefix ||
            (pathname.startsWith(`${prefix}/`) && pathname.length > prefix.length + 1),
        );
      report[accepted ? "accepted" : "skipped"].push(pathname);
      return accepted ? request : false;
    },
  } satisfies SSGPlugin;
}

const virtualId = "virtual:honoxpress/catalog";
const resolvedId = `\0${virtualId}`;
export function docsMetadataPlugin(options: DocsBuildOptions): Plugin {
  let routeRoot = "";
  const config = { locales: options.locales, defaultLocale: options.defaultLocale };
  return {
    name: "honoxpress-metadata",
    configResolved(vite) {
      routeRoot = resolve(vite.root, options.routeRoot ?? "app/routes");
    },
    resolveId(id) {
      if (id === virtualId) return resolvedId;
    },
    async load(id) {
      if (id !== resolvedId) return;
      const imports: string[] = [];
      const entries: string[] = [];
      if (!options.worker) {
        this.addWatchFile(routeRoot);
        const files = await readdir(routeRoot, { recursive: true, withFileTypes: true });
        for (const file of files
          .filter((file) => file.isFile() && file.name.endsWith(".mdx"))
          .sort((a, b) => `${a.parentPath}/${a.name}`.localeCompare(`${b.parentPath}/${b.name}`))) {
          const absolute = resolve(file.parentPath, file.name);
          const route = relative(routeRoot, absolute).replaceAll("\\", "/");
          if (!isVisibleMdxRoute(route)) continue;
          if (
            !options.locales.some((locale) =>
              route.startsWith(`${locale === options.defaultLocale ? "" : `${locale}/`}docs/`),
            )
          )
            continue;
          this.addWatchFile(absolute);
          const index = entries.length;
          imports.push(
            `import {frontmatter as fm${index}, toc as toc${index}} from ${JSON.stringify(absolute)};`,
          );
          entries.push(`{...fm${index},route:${JSON.stringify(route)},headings:toc${index}}`);
        }
      }
      return (
        `import {createDocsCatalog} from "honoxpress";\n${imports.join("\n")}\n` +
        `export const docsCatalog=createDocsCatalog({...${JSON.stringify(config)},entries:[${entries.join(",")}]});`
      );
    },
    configureServer(server) {
      if (options.worker) return;
      const invalidate = (file: string) => {
        if (!file.startsWith(`${routeRoot}/`) || !file.endsWith(".mdx")) return;
        const module = server.moduleGraph.getModuleById(resolvedId);
        if (module) server.moduleGraph.invalidateModule(module);
        server.ws.send({ type: "full-reload" });
      };
      server.watcher.on("add", invalidate).on("unlink", invalidate);
    },
  };
}

interface MarkdownNode {
  type: string;
  value?: string;
  depth?: number;
  children?: MarkdownNode[];
  data?: Record<string, unknown>;
}
const text = (node: MarkdownNode): string =>
  node.type === "mdxTextExpression" || node.type === "mdxFlowExpression"
    ? ""
    : (node.value ?? node.children?.map(text).join("") ?? "");
/** Static Markdown headings only; expressions are not evaluated for the TOC. */
export function remarkDocsHeadings() {
  return (root: MarkdownNode) => {
    const headings: Heading[] = [];
    const used = new Set<string>();
    const walk = (node: MarkdownNode) => {
      if (node.type === "heading") {
        const label = text(node).trim();
        if (!label) throw new Error("Docs headings must contain static text");
        const base =
          label
            .normalize("NFKC")
            .toLowerCase()
            .replace(/[^\p{L}\p{N}\s_-]/gu, "")
            .trim()
            .replace(/\s+/g, "-") || "section";
        let id = base;
        let suffix = 1;
        while (used.has(id)) id = `${base}-${suffix++}`;
        used.add(id);
        node.data = { ...node.data, hProperties: { id } };
        headings.push({ depth: node.depth ?? 2, text: label, id });
      }
      node.children?.forEach(walk);
    };
    walk(root);
    root.children ??= [];
    root.children.push({
      type: "mdxjsEsm",
      value: `export const toc = ${JSON.stringify(headings)};`,
      data: {
        estree: {
          type: "Program",
          sourceType: "module",
          body: [
            {
              type: "ExportNamedDeclaration",
              specifiers: [],
              source: null,
              declaration: {
                type: "VariableDeclaration",
                kind: "const",
                declarations: [
                  {
                    type: "VariableDeclarator",
                    id: { type: "Identifier", name: "toc" },
                    init: {
                      type: "ArrayExpression",
                      elements: headings.map((heading) => ({
                        type: "ObjectExpression",
                        properties: Object.entries(heading).map(([key, value]) => ({
                          type: "Property",
                          key: { type: "Identifier", name: key },
                          value: { type: "Literal", value },
                          kind: "init",
                          method: false,
                          shorthand: false,
                          computed: false,
                        })),
                      })),
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    });
  };
}
