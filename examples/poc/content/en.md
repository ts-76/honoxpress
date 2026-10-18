# Markdown components

Write ordinary **Markdown** and `inline code`. Component attributes are literal strings; structured data stays in a TSX wrapper.

:::Callout{title="Readable without JavaScript"}
The server renders this note, including **emphasis** and `code`.
:::

## Related guides

::::Cards
:::Card{title="Getting started" href="/docs/getting-started"}
Keep your application's components and design tokens.
:::

:::Card{title="API reference" href="/docs/components"}
Long identifiers such as `aVeryLongPropertyNameThatShouldNeverOverflowTheDocument` remain readable.
:::
::::

## Workflow

::::Steps
:::Step{title="Write Markdown"}
Use paragraphs, lists, links and code fences as usual.
:::

:::Step{title="Add a wrapper when needed"}
Keep arrays, objects and interactive behavior in TSX.
:::
::::

## Properties

::Properties{locale="en"}

## Interactive code samples

::CodeSamples{locale="en"}

## Native disclosure

::::Accordion
:::AccordionItem{title="Does static content need an island?"}
No. This disclosure and the content above work without component JavaScript.
:::
::::
