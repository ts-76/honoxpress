<script>
import Callout from "../../../app/markdown/Callout" with { component: "static" };
import Cards from "../../../app/markdown/Cards" with { component: "static" };
import Card from "../../../app/markdown/Card" with { component: "static" };
import Properties from "../../../app/markdown/Properties" with { component: "static" };
import CodeSamples from "../../../app/markdown/CodeSamples" with { island: "load" };
</script>

---

title: Examples
locale: en
slug: examples
href: /docs/en/examples
order: 2
interactive: true
---

# Examples

:::component Callout title="Note"
Static content works with HTML and CSS.
:::

::::component Cards
:::component Card title="Getting started"

## Preparation

Edit components in **TSX**.
:::
::::

## Properties

<Properties />

<CodeSamples />
