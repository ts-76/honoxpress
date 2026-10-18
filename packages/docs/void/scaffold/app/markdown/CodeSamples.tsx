import CodeGroup from "../islands/code-group";
import { useFrontmatter } from "void-plugin-hono-jsx/markdown";
export default function CodeSamples() {
  const { locale } = useFrontmatter<{ locale: string }>();
  return (
    <CodeGroup
      ariaLabel={locale === "ja" ? "コード例" : "Examples"}
      samples={[
        {
          label: "TypeScript",
          code: 'const message: string = "Hello";',
          filename: "example.ts",
          copyLabel: locale === "ja" ? "コピー" : "Copy",
        },
        {
          label: "JavaScript",
          code: 'const message = "Hello";',
          filename: "example.js",
          copyLabel: locale === "ja" ? "コピー" : "Copy",
        },
      ]}
    />
  );
}
