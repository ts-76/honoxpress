import { test, expect } from "vite-plus/test";
import { Hono } from "hono";
import { Style } from "hono/css";
import { jsx } from "hono/jsx/jsx-runtime";
import { createDocsMarkdownRenderer } from "honoxpress/markdown";
import { Callout, Cards, Card, Steps, Step } from "../packages/docs/templates/docs-content";
import { TypeTable } from "../packages/docs/templates/type-table";

const render = createDocsMarkdownRenderer({
  components: {
    Callout: {
      kind: "static",
      render: ({ attributes, children }) =>
        jsx(Callout, { title: String(attributes.title ?? ""), children }),
    },
    Cards: { kind: "static", render: ({ children }) => jsx(Cards, { children }) },
    Card: {
      kind: "static",
      render: ({ attributes, children }) =>
        jsx(Card, { title: String(attributes.title ?? ""), children }),
    },
    Steps: { kind: "static", render: ({ children }) => jsx(Steps, { children }) },
    Step: { kind: "static", render: ({ children }) => jsx(Step, { children }) },
    Properties: {
      kind: "static",
      render: () => jsx(TypeTable, { properties: [{ name: "src", type: "string" }] }),
    },
    CodeSamples: { kind: "island" },
  },
});

async function document(child: ReturnType<typeof render>, nonce?: string) {
  const app = new Hono().get("/", (c) =>
    c.html(
      jsx("html", {
        children: [jsx("head", { children: jsx(Style, { nonce }) }), child],
      }).toString(),
    ),
  );
  return (await app.request("/")).text();
}

test("Markdown static wrappers retain nested Hono JSX, escaping, SSR CSS and request isolation", async () => {
  const [cards, callout] = await Promise.all([
    document(render("Cards", {}, render("Card", { title: "<Card>" }, "日本語 & English")), "nonce"),
    document(render("Callout", { title: "<Notice>" }, jsx("code", { children: "<script>" }))),
  ]);
  expect(cards).toContain(".hx-card{");
  expect(cards).toContain('nonce="nonce"');
  expect(cards).toContain("&lt;Card&gt;");
  expect(cards).toContain("日本語 &amp; English");
  expect(cards).not.toContain(".hx-callout");
  expect(callout).toContain(".hx-callout{");
  expect(callout).toContain("&lt;Notice&gt;");
  expect(callout).toContain("<code>&lt;script&gt;</code>");
  expect(callout).not.toContain(".hx-card");
  expect(cards + callout).not.toMatch(/<script|island|\[object Promise\]/);
  expect(await document(render("Steps", {}, render("Step", {}, "Read")))).toContain("<ol");
  expect(await document(render("Properties"))).toContain('<th scope="row">');
});

test("Markdown never silently turns an interactive registration into a static component", async () => {
  expect(() => render("CodeSamples")).toThrow("requires the host's renderIsland");
  const calls: string[] = [];
  const island = createDocsMarkdownRenderer({
    components: { CodeSamples: { kind: "island" } },
    renderIsland(name, { attributes, children }) {
      calls.push(name);
      return jsx("div", { "data-host-island": attributes.locale, children });
    },
  });
  const html = await document(island("CodeSamples", { locale: "ja" }, "SSR fallback"));
  expect(calls).toEqual(["CodeSamples"]);
  expect(html).toContain('data-host-island="ja">SSR fallback');
});

test("Markdown rejects unknown names, expressions, reserved props and ambiguous registrations", () => {
  for (const name of ["Unknown", "callout", "toString", "__proto__"])
    expect(() => render(name)).toThrow("Unknown Markdown component");
  for (const attributes of [
    { title: 42 },
    { title: { expression: "run()" } },
    { properties: [] },
    { children: "override" },
    { onclick: "run()" },
    { onChange: "run()" },
    { dangerouslySetInnerHTML: "<b>unsafe</b>" },
    { constructor: "override" },
    { "...spread": "props" },
  ])
    expect(() => render("Callout", attributes as never)).toThrow("Expected a literal");
  expect(() => render("Callout", [] as never)).toThrow("Expected literal");
  expect(() =>
    createDocsMarkdownRenderer({ components: { "Invalid.Name": { kind: "island" } } }),
  ).toThrow("Invalid Markdown component name");
  expect(() =>
    createDocsMarkdownRenderer({ components: { Invalid: { kind: "unknown" } as never } }),
  ).toThrow("Invalid Markdown component registration");
});

// Both entry points intentionally preserve the same function identity.
import { createVoidDocsCatalog as adapterCatalog } from "../packages/docs/src/adapters/void";
import { createHonoMarkdownDocsCatalog } from "../packages/docs/src/adapters/hono-markdown";
import { createVoidDocsCatalog as compatibilityCatalog } from "../packages/docs/src/void";
test("keeps the Void adapter and compatibility API on the neutral metadata mapper", () => {
  expect(adapterCatalog).toBe(createHonoMarkdownDocsCatalog);
  expect(compatibilityCatalog).toBe(adapterCatalog);
});
