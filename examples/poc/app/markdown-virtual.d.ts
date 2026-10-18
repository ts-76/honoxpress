declare module "*?docs-markdown" {
  export const tree: import("../build/markdown-fixture").MarkdownTree;
  export const title: string;
  export const headings: readonly import("honoxpress").Heading[];
}
declare module "virtual:honoxpress/markdown-fixture" {
  export const pages: readonly import("honoxpress").DocsPageInput[];
}
