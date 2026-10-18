import { FileTree, Folder, File } from "@components/file-tree";
import { TypeTable } from "@components/type-table";
import { copy, type Locale } from "../../integration/site";

export default function Reference({ locale }: { locale: Locale }) {
  const t = copy[locale];
  return (
    <>
      <h1>{t.reference}</h1>
      <p>{t.referenceIntro}</p>
      <h2 id="files">{t.files}</h2>
      <FileTree label={t.files}>
        <File name="void.config.ts" />
        <Folder name="pages">
          <Folder name="[locale]">
            <File name="index.tsx" highlighted />
            <File name="reference.tsx" />
          </Folder>
        </Folder>
        <Folder name="components">
          <File name="docs-content.tsx" />
        </Folder>
      </FileTree>
      <h2 id="properties">{t.properties}</h2>
      <TypeTable
        caption={t.properties}
        properties={[
          {
            name: "locale",
            type: '"en" | "ja"',
            required: true,
            description:
              locale === "ja"
                ? "表示言語。ページの見出しとナビゲーションに適用します。"
                : "The language used by page headings and navigation.",
          },
          {
            name: "theme",
            type: '"light" | "dark" | "system"',
            defaultValue: '"system"',
            description:
              locale === "ja"
                ? "利用者の表示設定を保持します。"
                : "Preserves the reader’s preferred appearance.",
          },
          {
            name: "longComponentPropertyIdentifier",
            type: "Readonly<Record<string, ComponentConfiguration>>",
            description: t.propertyText,
          },
        ]}
      />
      <p>
        {locale === "ja"
          ? "インラインコードと日本語も確認します："
          : "Inline code and adjacent text: "}
        <code>/decks/honox/presentation</code> {locale === "ja" ? "と" : "and"}{" "}
        <code>docs.config.ts</code>。
      </p>
    </>
  );
}
