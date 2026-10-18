<script>
import Callout from "../../../app/markdown/Callout" with { component: "static" };
import Cards from "../../../app/markdown/Cards" with { component: "static" };
import Card from "../../../app/markdown/Card" with { component: "static" };
import Properties from "../../../app/markdown/Properties" with { component: "static" };
import CodeSamples from "../../../app/markdown/CodeSamples" with { island: "load" };
</script>

---

title: コード例
locale: ja
slug: examples
href: /docs/ja/examples
order: 2
interactive: true
---

# コード例

:::component Callout title="注意"
静的な内容はHTMLとCSSで表示します。
:::

::::component Cards
:::component Card title="使い方"

## 準備

部品は**TSX**で編集できます。
:::
::::

## プロパティ

<Properties />

<CodeSamples />
