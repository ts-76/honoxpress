import { test, expect } from "vite-plus/test";
import { remarkDocsComponents } from "honoxpress/build";

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
