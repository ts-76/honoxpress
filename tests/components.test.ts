import { Hono } from "hono";
import { jsx } from "hono/jsx/jsx-runtime";
import { FileTree, File, Folder } from "../packages/docs/templates/file-tree";
import { TypeTable } from "../packages/docs/templates/type-table";
import { DefinitionList } from "../packages/docs/templates/definition-list";
import { APIReference } from "../packages/docs/templates/api-reference";
import DemoFrame from "../packages/docs/templates/demo-frame";
import { Figure } from "../packages/docs/templates/figure";
import { test, expect } from "vite-plus/test";
import { remarkDocsComponents, remarkDocsCode, highlightDocsCode } from "honoxpress/build";

test("syntax tokens preserve code, aliases, line endings, and literal HTML", async () => {
  const code = 'const value = "</script><script>alert(1)</script>"; // note\r\n';
  const tokens = await highlightDocsCode(code, "ts");
  expect(tokens.map((token) => token.content).join("")).toBe(code);
  expect(tokens.some((token) => token.kind === "keyword")).toBe(true);
  expect(tokens.some((token) => token.kind === "string")).toBe(true);
  expect(tokens.some((token) => token.kind === "comment")).toBe(true);
  expect((await highlightDocsCode("pnpm dev", "bash"))[0].kind).toBe("function");
});

test("unlabelled and unsupported code remains readable plain text", async () => {
  for (const language of [undefined, "text", "unlisted-language"])
    expect(await highlightDocsCode("<not markup>\n", language)).toEqual([
      { content: "<not markup>\n", kind: "plain" },
    ]);
});

test("MDX highlights static props and fences without evaluating dynamic expressions", async () => {
  const staticBlock = {
    type: "mdxJsxFlowElement",
    name: "CodeBlock",
    attributes: [
      { type: "mdxJsxAttribute", name: "code", value: 'const value = "hello"' },
      { type: "mdxJsxAttribute", name: "language", value: "ts" },
    ],
  };
  const dynamicBlock = {
    type: "mdxJsxFlowElement",
    name: "CodeBlock",
    attributes: [
      {
        type: "mdxJsxAttribute",
        name: "code",
        value: { type: "mdxJsxAttributeValueExpression", value: "runSideEffect()" },
      },
    ],
  };
  const spreadBlock = {
    ...staticBlock,
    attributes: [...staticBlock.attributes, { type: "mdxJsxExpressionAttribute", value: "props" }],
  };
  const fence = { type: "code", lang: "js", value: "const value = 1", data: {} };
  await remarkDocsCode()({
    type: "root",
    children: [staticBlock, dynamicBlock, spreadBlock, fence],
  });
  expect(staticBlock.attributes.at(-1)?.name).toBe("tokens");
  expect(dynamicBlock.attributes).toHaveLength(1);
  expect(spreadBlock.attributes.at(-1)?.type).toBe("mdxJsxExpressionAttribute");
  expect(fence.data).toHaveProperty("hChildren");
});

const tag = (name: string) => ({ type: "mdxJsxFlowElement", name });
const root = (...children: ReturnType<typeof tag>[]) => ({ type: "root", children });
const jsxElement = (name: string) => ({
  type: "JSXElement",
  openingElement: {
    type: "JSXOpeningElement",
    name: { type: "JSXIdentifier", name },
    attributes: [],
  },
  closingElement: null,
  children: [],
});
const expressionProgram = (expression: object) => ({
  type: "Program",
  body: [{ type: "ExpressionStatement", expression }],
});

test("shared MDX names are accepted and unregistered components fail before rendering", () => {
  const validate = remarkDocsComponents({ names: ["Callout", "Card", "Tabs"] });
  expect(() => validate(root(tag("Callout"), tag("Card"), tag("Tabs")))).not.toThrow();
  expect(() => validate(root(tag("Missing")))).toThrow("Register Missing");
  for (const name of ["$Missing", "_Missing", "ui.Missing"])
    expect(() => validate(root(tag(name)))).toThrow("Unknown MDX component");
  expect(() => validate(root(tag("section"), tag("my-element")))).not.toThrow();
  expect(() =>
    validate({
      type: "root",
      children: [
        {
          type: "mdxFlowExpression",
          data: {
            estree: expressionProgram({
              type: "ConditionalExpression",
              consequent: jsxElement("Missing"),
              alternate: { type: "Literal", value: null },
            }),
          },
        },
      ],
    }),
  ).toThrow("Unknown MDX component <Missing>");
  expect(() =>
    validate({
      type: "root",
      children: [
        {
          type: "mdxFlowExpression",
          data: {
            estree: expressionProgram({
              type: "ArrowFunctionExpression",
              params: [{ type: "Identifier", name: "LocalView" }],
              body: jsxElement("LocalView"),
            }),
          },
        },
      ],
    }),
  ).not.toThrow();
  expect(() =>
    validate({
      type: "root",
      children: [
        {
          type: "mdxFlowExpression",
          data: {
            estree: expressionProgram({
              type: "ArrowFunctionExpression",
              params: [],
              body: {
                type: "BlockStatement",
                body: [
                  {
                    type: "VariableDeclaration",
                    kind: "const",
                    declarations: [{ id: { type: "Identifier", name: "LocalView" } }],
                  },
                  { type: "ReturnStatement", argument: jsxElement("LocalView") },
                ],
              },
            }),
          },
        },
      ],
    }),
  ).not.toThrow();
});

test("mistyped registered names fail rather than rendering lowercase HTML", () => {
  const validate = remarkDocsComponents({ names: ["Callout"] });
  expect(() => validate(root(tag("callout")))).toThrow("<Callout>");
  expect(() => validate(root(tag("CALLOUT")))).toThrow();
  const importedLowercaseAlias = {
    type: "root",
    children: [
      {
        type: "mdxjsEsm",
        data: {
          estree: {
            body: [
              {
                type: "ImportDeclaration",
                specifiers: [{ local: { type: "Identifier", name: "callout" } }],
              },
            ],
          },
        },
      },
      tag("callout"),
    ],
  };
  expect(() => validate(importedLowercaseAlias)).toThrow("must use the registered name <Callout>");
});

test("page imports and local declarations remain valid registry extensions", () => {
  const validate = remarkDocsComponents({ names: [] });
  const fixture = {
    type: "root",
    children: [
      {
        type: "mdxjsEsm",
        data: {
          estree: {
            body: [
              {
                type: "ImportDeclaration",
                specifiers: [{ local: { type: "Identifier", name: "UI" } }],
              },
              {
                type: "ExportNamedDeclaration",
                declaration: {
                  type: "VariableDeclaration",
                  declarations: [{ id: { type: "Identifier", name: "Custom" } }],
                },
              },
            ],
          },
        },
      },
      tag("UI.Card"),
      tag("Custom"),
    ],
  };
  expect(() => validate(fixture)).not.toThrow();
  expect(() =>
    validate({
      type: "root",
      children: [
        {
          type: "mdxFlowExpression",
          data: {
            estree: expressionProgram({
              type: "ArrowFunctionExpression",
              params: [{ type: "Identifier", name: "LocalView" }],
              body: jsxElement("LocalView"),
            }),
          },
        },
      ],
    }),
  ).not.toThrow();
});

test("invalid registry identifiers are rejected and nested inline tags are validated", () => {
  expect(() => remarkDocsComponents({ names: ["bad-name"] })).toThrow("Invalid MDX registry");
  const validate = remarkDocsComponents({ names: ["Card", "Tabs"] });
  expect(() =>
    validate({
      type: "root",
      children: [
        { type: "paragraph", children: [{ type: "mdxJsxTextElement", name: "Missing" }] },
        {
          type: "mdxJsxFlowElement",
          name: "Tabs",
          attributes: [
            {
              type: "mdxJsxAttribute",
              name: "content",
              value: {
                type: "mdxJsxAttributeValueExpression",
                data: { estree: expressionProgram(jsxElement("Missing")) },
              },
            },
          ],
        },
      ],
    }),
  ).toThrow("Unknown MDX component");
  expect(() =>
    validate({
      type: "root",
      children: [
        {
          type: "mdxJsxFlowElement",
          name: "Tabs",
          attributes: [
            {
              type: "mdxJsxAttribute",
              name: "content",
              value: {
                type: "mdxJsxAttributeValueExpression",
                data: { estree: expressionProgram(jsxElement("Missing")) },
              },
            },
          ],
        },
      ],
    }),
  ).toThrow("Unknown MDX component <Missing>");
});

test("static authoring markup escapes values and preserves image dimensions and table semantics", async () => {
  const app = new Hono().get("/", (c) =>
    c.html(
      jsx("div", {
        children: [
          FileTree({
            label: "Source files",
            children: Folder({
              name: "app",
              open: false,
              children: File({ name: '<script>alert("file")</script>', highlighted: true }),
            }),
          }),
          TypeTable({
            caption: "API props",
            properties: [
              {
                name: "value",
                type: "<T>",
                required: true,
                defaultValue: "",
                deprecated: true,
                description: "<unsafe>",
              },
            ],
          }),
          TypeTable({ properties: [], emptyLabel: "Nothing to configure." }),
          Figure({
            src: "/diagram.svg",
            alt: "<unsafe>",
            width: 720,
            height: 240,
            caption: "Flow",
          }),
        ],
      }).toString(),
    ),
  );
  const html = await (await app.request("http://local.test/")).text();
  expect(html).not.toContain("<script>");
  expect(html).toContain("&lt;script&gt;");
  expect(html).toContain('scope="row"');
  expect(html).toContain("Required · Deprecated");
  expect(html).toContain("Default:");
  expect(html).toContain("Nothing to configure.");
  expect(html).toContain('width="720" height="240" loading="lazy"');
  expect(html).toContain("&lt;unsafe&gt;");
  expect(html).not.toContain("aria-current");
});

test("CodeGroup highlights literal samples and leaves dynamic data, spreads, and supplied tokens untouched", async () => {
  const property = (key: string, value: object) => ({
    type: "Property",
    key: { type: "Identifier", name: key },
    value,
    kind: "init",
    computed: false,
    method: false,
    shorthand: false,
  });
  const literal = (value: string) => ({ type: "Literal", value });
  const sample = {
    type: "ObjectExpression",
    properties: [
      property("label", literal("TypeScript")),
      property("code", literal("const value = 1")),
      property("language", literal("ts")),
    ],
  };
  const makeGroup = (expression: object) => ({
    type: "mdxJsxFlowElement",
    name: "CodeGroup",
    attributes: [
      {
        type: "mdxJsxAttribute",
        name: "samples",
        value: {
          type: "mdxJsxAttributeValueExpression",
          value: "original",
          data: { estree: expressionProgram(expression) },
        },
      },
    ],
  });
  const group = makeGroup({ type: "ArrayExpression", elements: [sample] });
  await remarkDocsCode()({ type: "root", children: [group] });
  const parsed = JSON.parse(group.attributes[0].value.value);
  expect(parsed[0].tokens.map((token: { content: string }) => token.content).join("")).toBe(
    "const value = 1",
  );
  expect(parsed[0].tokens.some((token: { kind: string }) => token.kind === "keyword")).toBe(true);
  for (const expression of [
    { type: "Identifier", name: "samples" },
    {
      type: "ArrayExpression",
      elements: [
        {
          ...sample,
          properties: [
            ...sample.properties,
            { type: "SpreadElement", argument: { type: "CallExpression" } },
          ],
        },
      ],
    },
    {
      type: "ArrayExpression",
      elements: [
        {
          ...sample,
          properties: [
            ...sample.properties,
            property("tokens", { type: "ArrayExpression", elements: [] }),
          ],
        },
      ],
    },
    {
      type: "ArrayExpression",
      elements: [{ ...sample, properties: [property("code", { type: "CallExpression" })] }],
    },
  ]) {
    const dynamic = makeGroup(expression);
    await remarkDocsCode()({ type: "root", children: [dynamic] });
    expect(dynamic.attributes[0].value.value).toBe("original");
  }
});

test("structured references escape content and demo sizing preserves defaults with explicit overrides", () => {
  const html = jsx("div", {
    children: [
      DefinitionList({
        items: [
          { term: "<unsafe>", description: jsx("a", { href: "/guide", children: "Read more" }) },
        ],
      }),
      APIReference({
        name: "<API>",
        importFrom: "pkg",
        usage: "Use it here",
        sourceHref: "/source",
        labels: { usage: "用途", source: "ソース" },
        children: TypeTable({ properties: [{ name: "src", type: "string" }] }),
      }),
      DemoFrame({
        src: "/embed",
        href: "/full",
        aspectRatio: 16 / 9,
        allowFullscreen: true,
        openInNewTab: true,
      }),
    ],
  }).toString();
  expect(html).toContain("<dt>&lt;unsafe&gt;</dt><dd><a");
  expect(html).toContain("&lt;API&gt;");
  expect(html).toContain("用途");
  expect(html).toContain("ソース");
  expect(html).toContain('scope="row"');
  expect(html).toContain('href="/full" target="_blank" rel="noreferrer"');
  expect(html).toContain("aspect-ratio:");
  expect(html).toContain('allow="fullscreen"');
  const defaultFrame = jsx(DemoFrame, { src: "/embed" }).toString();
  expect(defaultFrame).toContain('href="/embed"');
  expect(defaultFrame).toContain('loading="lazy"');
  expect(defaultFrame).not.toContain('target="_blank"');
  expect(defaultFrame).not.toContain("style=");
  const fixed = jsx(DemoFrame, { height: 320, aspectRatio: 16 / 9 }).toString();
  expect(fixed).toContain("height:320px");
  expect(fixed).not.toContain("aspect-ratio:");
  expect(DefinitionList({ items: [] })).toBeNull();
  for (const value of [0, -1, Infinity, NaN]) {
    expect(() => DemoFrame({ height: value })).toThrow(RangeError);
    expect(() => DemoFrame({ aspectRatio: value })).toThrow(RangeError);
  }
});
