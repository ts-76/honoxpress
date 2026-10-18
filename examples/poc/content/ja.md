# Markdown の部品

通常の **Markdown** と `インラインコード` を使います。属性は文字列で指定し、配列などのデータは TSX wrapper に置きます。

:::Callout{title="JavaScript が無効でも読めます"}
この注意書きは、**強調** や `コード` も含めてサーバーで描画します。
:::

## 関連するガイド

::::Cards
:::Card{title="はじめに" href="/ja/docs/getting-started"}
アプリ側で管理するコンポーネントとデザイントークンをそのまま使います。
:::

:::Card{title="API リファレンス" href="/ja/docs/components"}
`aVeryLongPropertyNameThatShouldNeverOverflowTheDocument` のような長い識別子も折り返します。
:::
::::

## 手順

::::Steps
:::Step{title="Markdown を書く"}
段落、リスト、リンク、コードフェンスを通常どおり使います。
:::

:::Step{title="必要な部分を TSX にまとめる"}
配列、オブジェクト、操作の処理は TSX wrapper で管理します。
:::
::::

## プロパティ

::Properties{locale="ja"}

## コードの切り替え

::CodeSamples{locale="ja"}

## 標準の開閉パネル

::::Accordion
:::AccordionItem{title="静的な本文にも island が必要ですか？"}
必要ありません。この開閉パネルや上の本文は、コンポーネントの JavaScript がなくても利用できます。
:::
::::
