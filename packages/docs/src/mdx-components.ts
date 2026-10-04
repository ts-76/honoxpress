/** Names are taken from the consumer-owned registry used by providerImportSource. */
export interface DocsComponentsOptions {
  readonly names: readonly string[];
}

interface Node {
  type?: string;
  name?: string;
  children?: Node[];
  attributes?: Node[];
  value?: Node;
  data?: { estree?: Record<string, unknown> };
}

const record = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

function bind(pattern: unknown, names: Set<string>) {
  const node = record(pattern);
  if (!node) return;
  if (node.type === "Identifier" && typeof node.name === "string") names.add(node.name);
  if (node.type === "ObjectPattern" && Array.isArray(node.properties))
    for (const property of node.properties) {
      const p = record(property);
      bind(p?.type === "RestElement" ? p.argument : p?.value, names);
    }
  if (node.type === "ArrayPattern" && Array.isArray(node.elements))
    for (const item of node.elements) bind(item, names);
  if (node.type === "AssignmentPattern") bind(node.left, names);
  if (node.type === "RestElement") bind(node.argument, names);
}

function collectBindings(program: Record<string, unknown>, names: Set<string>) {
  if (!Array.isArray(program.body)) return;
  for (const statement of program.body) {
    const node = record(statement);
    if (!node) continue;
    if (node.type === "ImportDeclaration" && Array.isArray(node.specifiers))
      for (const specifier of node.specifiers) bind(record(specifier)?.local, names);
    const declaration =
      node.type === "ExportNamedDeclaration" || node.type === "ExportDefaultDeclaration"
        ? record(node.declaration)
        : node;
    if (!declaration) continue;
    if (declaration.type === "VariableDeclaration" && Array.isArray(declaration.declarations))
      for (const item of declaration.declarations) bind(record(item)?.id, names);
    if (declaration.type === "FunctionDeclaration" || declaration.type === "ClassDeclaration")
      bind(declaration.id, names);
  }
}

function collectScopeBindings(node: Record<string, unknown>, names: Set<string>) {
  const declarations = Array.isArray(node.body) ? node.body : [];
  for (const statement of declarations) {
    const item = record(statement);
    if (!item) continue;
    if (item.type !== "VariableDeclaration" || item.kind !== "var") bindDeclaration(item, names);
    if (item.type === "FunctionDeclaration" || item.type === "ClassDeclaration")
      bind(item.id, names);
  }
}

function bindDeclaration(value: unknown, names: Set<string>) {
  const node = record(value);
  if (node?.type === "VariableDeclaration" && Array.isArray(node.declarations)) {
    for (const declaration of node.declarations) bind(record(declaration)?.id, names);
  } else bind(value, names);
}

function collectVarBindings(value: unknown, names: Set<string>, root = true) {
  const node = record(value);
  if (!node) {
    if (Array.isArray(value)) for (const child of value) collectVarBindings(child, names, false);
    return;
  }
  if (
    !root &&
    (node.type === "FunctionDeclaration" ||
      node.type === "FunctionExpression" ||
      node.type === "ArrowFunctionExpression")
  )
    return;
  if (node.type === "VariableDeclaration" && node.kind === "var") bindDeclaration(node, names);
  for (const [key, child] of Object.entries(node)) {
    if (key === "loc" || key === "range" || key === "start" || key === "end") continue;
    collectVarBindings(child, names, false);
  }
}

function jsxName(node: unknown): string | undefined {
  const value = record(node);
  if (!value) return;
  if (
    (value.type === "JSXIdentifier" || value.type === "Identifier") &&
    typeof value.name === "string"
  )
    return value.name;
  if (value.type === "JSXMemberExpression") {
    const object = jsxName(value.object);
    const property = jsxName(value.property);
    return object && property ? `${object}.${property}` : undefined;
  }
  return;
}

function validateName(
  name: string,
  registered: Set<string>,
  lowercase: Map<string, string>,
  bound: Set<string>,
) {
  const base = name.split(".")[0];
  if (/^[A-Z]/.test(base) && !registered.has(base) && !bound.has(base))
    throw new Error(
      `Unknown MDX component <${name}>. Register ${base} in app/mdx-components.ts or import it in this page.`,
    );

  const canonical = lowercase.get(name.toLowerCase());
  const isLocalComponentIdentifier = bound.has(name) && /^[A-Z]/.test(name);
  if (canonical && canonical !== name && !registered.has(name) && !isLocalComponentIdentifier)
    throw new Error(`MDX component <${name}> must use the registered name <${canonical}>.`);
}

function walkEstree(
  value: unknown,
  names: Set<string>,
  registered: Set<string>,
  lowercase: Map<string, string>,
) {
  const node = record(value);
  if (!node) {
    if (Array.isArray(value))
      for (const child of value) walkEstree(child, names, registered, lowercase);
    return;
  }

  // Function parameters and block-local declarations are valid component names
  // within their lexical expression scope, but must not leak to sibling nodes.
  const scope = new Set(names);
  if (node.type === "Program" || node.type === "BlockStatement") collectScopeBindings(node, scope);
  if (node.type === "Program") collectVarBindings(node, scope);
  if (
    node.type === "FunctionDeclaration" ||
    node.type === "FunctionExpression" ||
    node.type === "ArrowFunctionExpression"
  ) {
    bind(node.id, scope);
    if (Array.isArray(node.params)) for (const param of node.params) bind(param, scope);
    const body = record(node.body);
    if (body?.type === "BlockStatement") {
      collectScopeBindings(body, scope);
      collectVarBindings(body, scope);
    }
  }
  if (node.type === "CatchClause") bind(node.param, scope);
  if (node.type === "ForStatement") bindDeclaration(node.init, scope);
  if (node.type === "ForInStatement" || node.type === "ForOfStatement")
    bindDeclaration(node.left, scope);
  if (node.type === "SwitchStatement" && Array.isArray(node.cases))
    for (const switchCase of node.cases) {
      const consequent = record(switchCase)?.consequent;
      if (Array.isArray(consequent)) collectScopeBindings({ body: consequent }, scope);
    }

  if (node.type === "JSXOpeningElement" || node.type === "JSXClosingElement") {
    const name = jsxName(node.name);
    if (name) validateName(name, registered, lowercase, scope);
  }

  for (const [key, child] of Object.entries(node)) {
    if (key === "loc" || key === "range" || key === "start" || key === "end") continue;
    walkEstree(child, scope, registered, lowercase);
  }
}

/**
 * Validate MDX tags against the shared registry and page-local bindings.
 * Used with MDX's providerImportSource; this plugin does not execute content,
 * import UI into the runtime entry, or alter standard HonoX file routing.
 */
export function remarkDocsComponents(options: DocsComponentsOptions) {
  const registered = new Set(options.names);
  for (const name of registered)
    if (!/^[A-Za-z_$][\w$]*$/.test(name)) throw new Error(`Invalid MDX registry name: ${name}`);
  const lowercase = new Map([...registered].map((name) => [name.toLowerCase(), name]));
  return (root: Node) => {
    const bound = new Set<string>();
    for (const child of root.children ?? [])
      if (child.type === "mdxjsEsm" && child.data?.estree)
        collectBindings(child.data.estree, bound);
    const walk = (node: Node) => {
      if ((node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") && node.name) {
        validateName(node.name, registered, lowercase, bound);
      }
      if (node.data?.estree) walkEstree(node.data.estree, bound, registered, lowercase);
      for (const child of node.children ?? []) walk(child);
      for (const attribute of node.attributes ?? []) walk(attribute);
      if (node.value) walk(node.value);
    };
    walk(root);
  };
}
