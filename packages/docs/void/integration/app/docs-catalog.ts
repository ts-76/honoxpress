import { createVoidDocsCatalog, type VoidDocsModule } from "honoxpress/adapters/void";
import docsConfig from "./docs.config";

// Select metadata exports so the catalog does not retain page render functions.
const frontmatter = import.meta.glob<VoidDocsModule["frontmatter"]>("../pages/docs/**/*.md", {
  eager: true,
  import: "frontmatter",
});
const headings = import.meta.glob<VoidDocsModule["headings"]>("../pages/docs/**/*.md", {
  eager: true,
  import: "headings",
});
export const catalog = createVoidDocsCatalog(
  Object.fromEntries(
    Object.entries(frontmatter).map(([path, metadata]) => [
      path,
      { frontmatter: metadata, headings: headings[path] },
    ]),
  ),
  docsConfig,
);
