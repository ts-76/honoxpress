#!/usr/bin/env node
import { frameworkPresets } from "./framework-presets.mjs";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageVersion = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8")).version;
const starterRoot = join(packageRoot, "starter");
const templateRoot = join(packageRoot, "templates");
const manifestName = ".honoxpress.json";
const begin = "// honoxpress:components:start";
const end = "// honoxpress:components:end";
const groups = {
  callout: { files: ["components/docs-content.tsx"], names: ["Callout"] },
  cards: { files: ["components/docs-content.tsx"], names: ["Card", "Cards"] },
  steps: { files: ["components/docs-content.tsx"], names: ["Steps", "Step"] },
  accordion: { files: ["components/docs-content.tsx"], names: ["Accordion", "AccordionItem"] },
  tabs: { files: ["components/docs-content.tsx", "islands/tabs.tsx"], names: ["Tabs", "TabPanel"] },
  "code-block": { files: ["islands/copy-code.tsx"], names: ["CodeBlock"] },
  "demo-frame": { files: ["components/demo-frame.tsx"], names: ["DemoFrame"] },
  "file-tree": { files: ["components/file-tree.tsx"], names: ["FileTree", "File", "Folder"] },
  "type-table": { files: ["components/type-table.tsx"], names: ["TypeTable"] },
  "code-group": {
    files: ["islands/code-group.tsx"],
    names: ["CodeGroup"],
    dependencies: ["tabs", "code-block"],
  },
  figure: { files: ["components/figure.tsx"], names: ["Figure"] },
  "theme-switch": { files: ["components/theme-switch.tsx"], names: ["ThemeSwitch"] },
  "definition-list": { files: ["components/definition-list.tsx"], names: ["DefinitionList"] },
  "api-reference": { files: ["components/api-reference.tsx"], names: ["APIReference"] },
  layout: {
    dependencies: ["theme-switch"],
    files: [
      "components/docs-ui.tsx",
      "components/docs-layout.tsx",
      "docs.config.ts",
      "client.ts",
      "docs-virtual.d.ts",
    ],
    names: [],
  },
};
const allGroups = Object.keys(groups);

function parseArgs(args) {
  const command = args[0];
  let target;
  const options = {
    cwd: process.cwd(),
    dryRun: false,
    starter: false,
    help: false,
    framework: undefined,
  };
  let i = 1;
  if (command === "add") target = args[i++];
  for (; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--cwd") {
      if (!args[i + 1]) throw new Error("--cwd requires a directory");
      options.cwd = resolve(args[++i]);
    } else if (arg === "--framework") {
      options.framework = args[++i];
      if (!["honox", "void"].includes(options.framework))
        throw new Error("--framework must be honox or void");
    } else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--starter" && command === "init") options.starter = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`unknown option ${arg}`);
  }
  if (command === "--help" || command === "-h") options.help = true;
  if (!options.help && !["init", "add", "list"].includes(command))
    throw new Error(`unknown command ${command ?? ""}`);
  if (!options.help && command === "add" && !target)
    throw new Error("add requires a component name");
  return { command, target, ...options };
}

function help() {
  console.log(`honoxpress — consumer-owned Hono JSX documentation components

Usage:
  honoxpress init [--framework honox|void] [--cwd directory] [--dry-run]
  honoxpress init --starter [--framework honox|void] [--cwd directory] [--dry-run]
  honoxpress add <${allGroups.join("|")}|all> [--cwd directory] [--dry-run]
  honoxpress list

init installs the complete component set, framework integration, layout, and CSS.
init --starter also installs a runnable project scaffold (HonoX by default).
--framework void installs Void Markdown wrappers and a content-only layout.
Later add commands inherit the framework from .honoxpress.json.
add installs a component group and registers its MDX tags. User-owned files are
never overwritten; differing files stop the plan. honoxpress only updates its
marked registry block and its own installation manifest.

For an existing HonoX app, connect MDX with providerImportSource:
  providerImportSource: "/app/mdx-components"
and remarkDocsComponents using Object.keys(components) from that registry.
Import docsMetadataPlugin, remarkDocsHeadings, and remarkDocsCode from "honoxpress/build" in Vite,
and mount DocsLayout in your renderer. Keep defaultLocale, localeLabels, site name,
links, and theme controls in app/docs.config.ts; share its language settings with
Vite and the docs-only SSG filter. The starter already connects these settings.

The CLI does not edit existing routes or Vite config, install dependencies, run
scripts, access credentials, or deploy.`);
}

function safeRoot(path) {
  const abs = resolve(path);
  const stat = lstatSync(abs);
  if (!stat.isDirectory() || stat.isSymbolicLink())
    throw new Error(`--cwd must be a real directory: ${abs}`);
  // Canonicalize aliases such as /tmp; symlinks beneath the chosen root are
  // still rejected individually by inspectPath before any file is read/written.
  return realpathSync(abs);
}

function statIfPresent(path) {
  try {
    return lstatSync(path);
  } catch (error) {
    if (error.code === "ENOENT") return undefined;
    throw error;
  }
}

function inspectPath(root, target) {
  const absolute = resolve(root, target);
  const rel = relative(root, absolute);
  if (!rel || rel.startsWith(`..${sep}`) || rel === ".." || relative(root, absolute) !== rel) {
    throw new Error(`unsafe destination path: ${target}`);
  }
  let cursor = root;
  const parts = rel.split(sep);
  for (const part of parts.slice(0, -1)) {
    cursor = join(cursor, part);
    const stat = statIfPresent(cursor);
    if (stat) {
      if (stat.isSymbolicLink() || !stat.isDirectory())
        throw new Error(`unsafe parent path: ${cursor}`);
    }
  }
  const targetStat = statIfPresent(absolute);
  if (targetStat) {
    if (targetStat.isSymbolicLink() || !targetStat.isFile())
      throw new Error(`destination is not a regular file: ${absolute}`);
  }
  return absolute;
}

const hash = (content) => createHash("sha256").update(content).digest("hex");

function registryBlock(names) {
  const imports = [];
  const contentNames = names.filter((name) =>
    [
      "Callout",
      "Card",
      "Cards",
      "Steps",
      "Step",
      "Accordion",
      "AccordionItem",
      "TabPanel",
    ].includes(name),
  );
  if (contentNames.length) {
    imports.push(`import { ${contentNames.join(", ")} } from "./components/docs-content";`);
  }
  if (names.some((name) => name === "Tabs" || name === "TabPanel")) {
    imports.push('import Tabs from "./islands/tabs";');
  }
  if (names.includes("CodeBlock")) imports.push('import CodeBlock from "./islands/copy-code";');
  if (names.includes("DemoFrame")) imports.push('import DemoFrame from "./components/demo-frame";');
  const fileNames = names.filter((name) => ["FileTree", "File", "Folder"].includes(name));
  if (fileNames.length)
    imports.push(`import { ${fileNames.join(", ")} } from "./components/file-tree";`);
  for (const [name, file] of [
    ["TypeTable", "type-table"],
    ["Figure", "figure"],
    ["ThemeSwitch", "theme-switch"],
    ["DefinitionList", "definition-list"],
    ["APIReference", "api-reference"],
  ]) {
    if (names.includes(name)) imports.push(`import { ${name} } from "./components/${file}";`);
  }
  if (names.includes("CodeGroup")) imports.push('import CodeGroup from "./islands/code-group";');
  return `${begin}\n${imports.join("\n")}\nexport const standardComponents = {\n${[
    ...new Set(names),
  ]
    .sort((a, b) => a.localeCompare(b))
    .map((name) => `  ${name},`)
    .join("\n")}\n};\n${end}`;
}

function makeRegistry(names) {
  return `type MDXComponents = Record<string, unknown>;\n\n${registryBlock(names)}\n\nexport const components = { ...standardComponents };\n\nexport function useMDXComponents(overrides: MDXComponents = {}): MDXComponents {\n  return { ...components, ...overrides };\n}\n`;
}

function updateRegistry(current, names) {
  const start = current.indexOf(begin);
  const finish = current.indexOf(end);
  if (start < 0 && finish < 0)
    throw new Error("app/mdx-components.ts exists without honoxpress managed markers");
  if (start < 0 || finish < start)
    throw new Error("app/mdx-components.ts has incomplete honoxpress markers");
  return `${current.slice(0, start)}${registryBlock(names)}${current.slice(finish + end.length)}`;
}

function listFiles(directory, prefix = "") {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) throw new Error(`scaffold contains a symbolic link: ${rel}`);
    if (entry.isDirectory()) return listFiles(join(directory, entry.name), rel);
    if (!entry.isFile()) throw new Error(`unsupported scaffold entry: ${rel}`);
    return [rel];
  });
}

function readManifest(root) {
  const file = inspectPath(root, manifestName);
  if (!existsSync(file)) return { groups: [] };
  const value = JSON.parse(readFileSync(file, "utf8"));
  if (
    value.version !== 1 ||
    (value.framework !== undefined && !["honox", "void"].includes(value.framework)) ||
    !Array.isArray(value.groups) ||
    value.groups.some((name) => !groups[name]) ||
    (value.files !== undefined &&
      (!value.files || typeof value.files !== "object" || Array.isArray(value.files)))
  ) {
    throw new Error(`${manifestName} is invalid; inspect it before continuing`);
  }
  return { ...value, original: readFileSync(file, "utf8") };
}

function install({ command, target, cwd, dryRun, starter, framework: selectedFramework }) {
  const root = safeRoot(cwd);
  let requested = command === "init" ? allGroups : target === "all" ? allGroups : [target];
  for (const group of requested)
    if (!groups[group])
      throw new Error(`unknown group ${group}; choose ${allGroups.join(", ")} or all`);
  const includeDependencies = (name) => [
    name,
    ...(groups[name].dependencies ?? []).flatMap(includeDependencies),
  ];
  requested = [...new Set(requested.flatMap(includeDependencies))];
  const previous = readManifest(root);
  const framework = selectedFramework ?? previous.framework ?? "honox";
  if (previous.original && framework !== (previous.framework ?? "honox"))
    throw new Error(
      "existing honoxpress installation uses a different framework; choose a separate directory",
    );
  const isVoid = framework === "void";
  const preset = frameworkPresets[framework];
  const projectScaffold = join(packageRoot, preset.scaffold);
  const added = requested.filter((name) => !previous.groups.includes(name));
  const installedGroups = [...new Set([...previous.groups, ...requested])].sort((a, b) =>
    a.localeCompare(b),
  );
  const names = installedGroups.flatMap((name) => groups[name].names);
  const files = new Map();
  let originalRegistry;
  const addSource = (source, destination) => {
    let content = readFileSync(source);
    if (source === join(templateRoot, "tabs.tsx")) {
      content = Buffer.from(
        content.toString("utf8").replaceAll('"./docs-content"', '"../components/docs-content"'),
      );
    }
    if (source === join(templateRoot, "code-group.tsx")) {
      content = Buffer.from(
        content
          .toString("utf8")
          .replace('from "./docs-content"', 'from "../components/docs-content"'),
      );
    }
    if (source.startsWith(`${projectScaffold}${sep}`) && source.endsWith(`${sep}package.json`)) {
      content = Buffer.from(
        content.toString("utf8").replaceAll("__HONOXPRESS_VERSION__", packageVersion),
      );
    }
    if (isVoid && source === join(templateRoot, "site-config.ts")) {
      content = Buffer.from(
        content.toString("utf8").replace('"/docs/getting-started"', '"/docs/en/guide"'),
      );
    }
    files.set(destination, { source: null, content });
  };
  const contentInstalled = previous.groups.some((name) =>
    ["callout", "cards", "steps", "accordion", "tabs"].includes(name),
  );
  const visualGroups = [
    "callout",
    "cards",
    "steps",
    "accordion",
    "tabs",
    "code-block",
    "demo-frame",
    "layout",
    "file-tree",
    "type-table",
    "code-group",
    "figure",
    "theme-switch",
    "definition-list",
    "api-reference",
  ];
  const visualsAlreadyInstalled = previous.groups.some((name) => visualGroups.includes(name));
  for (const name of added) {
    for (const rel of groups[name].files) {
      if (isVoid && ["client.ts", "docs-virtual.d.ts"].includes(rel)) continue;
      // The content primitives share one consumer-owned source file. Copy it once;
      // later groups only extend the registry so local edits remain untouched.
      if (rel === "components/docs-content.tsx" && contentInstalled) continue;
      if (rel === "components/docs-content.tsx") {
        if (!contentInstalled) addSource(join(templateRoot, "docs-content.tsx"), `app/${rel}`);
        continue;
      }
      // Dependencies already owned by the app must not be recopied on later additions.
      if (rel === "islands/tabs.tsx") addSource(join(templateRoot, "tabs.tsx"), `app/${rel}`);
      else if (rel === "islands/copy-code.tsx")
        addSource(join(templateRoot, "copy-code.tsx"), `app/${rel}`);
      else if (rel === "components/demo-frame.tsx")
        addSource(join(templateRoot, "demo-frame.tsx"), `app/${rel}`);
      else if (rel === "islands/code-group.tsx")
        addSource(join(templateRoot, "code-group.tsx"), `app/${rel}`);
      else if (
        [
          "file-tree",
          "type-table",
          "figure",
          "theme-switch",
          "definition-list",
          "api-reference",
        ].some((file) => rel === `components/${file}.tsx`)
      )
        addSource(join(templateRoot, rel.slice("components/".length)), `app/${rel}`);
      else if (rel === "components/docs-ui.tsx")
        addSource(join(templateRoot, "docs-ui.tsx"), `app/${rel}`);
      else if (rel === "components/docs-layout.tsx")
        addSource(join(templateRoot, "docs-layout.tsx"), `app/${rel}`);
      else if (rel === "docs.config.ts")
        addSource(join(templateRoot, "site-config.ts"), `app/${rel}`);
      else if (rel === "docs.css" || rel === "components.css")
        addSource(join(templateRoot, rel), `public/${rel === "docs.css" ? "style.css" : rel}`);
      else addSource(join(starterRoot, rel), `app/${rel}`);
    }
  }
  if (added.some((name) => visualGroups.includes(name)) && !visualsAlreadyInstalled) {
    addSource(join(templateRoot, "components.css"), "public/components.css");
    addSource(join(templateRoot, "tokens.css"), "public/tokens.css");
  }
  if (added.includes("layout")) {
    addSource(join(templateRoot, "docs.css"), "public/style.css");
  }
  if (isVoid) {
    const wrappers = {
      DemoFrame: "demo-frame",
      Callout: "docs-content",
      Cards: "docs-content",
      Card: "docs-content",
      Steps: "docs-content",
      Step: "docs-content",
      Accordion: "docs-content",
      AccordionItem: "docs-content",
      TabPanel: "docs-content",
      FileTree: "file-tree",
      File: "file-tree",
      Folder: "file-tree",
      TypeTable: "type-table",
      Figure: "figure",
      ThemeSwitch: "theme-switch",
      DefinitionList: "definition-list",
      APIReference: "api-reference",
    };
    for (const name of added.flatMap((group) => groups[group].names)) {
      const source = wrappers[name];
      const path = source
        ? `../components/${source}`
        : `../islands/${{ Tabs: "tabs", CodeBlock: "copy-code", CodeGroup: "code-group" }[name]}`;
      files.set(`app/markdown/${name}.tsx`, {
        source: null,
        content: Buffer.from(
          `export { ${source && name !== "DemoFrame" ? name : "default"} as default } from "${path}";\n`,
        ),
      });
    }
    if (added.includes("layout"))
      for (const rel of listFiles(join(packageRoot, preset.integration)))
        addSource(join(packageRoot, preset.integration, rel), rel);
  }
  if (starter) {
    if (!existsSync(projectScaffold))
      throw new Error("starter scaffold is missing from this honoxpress package");
    const generatedByInit = new Set([
      "app/client.ts",
      "app/docs-virtual.d.ts",
      "app/mdx-components.ts",
      "app/docs.config.ts",
      "app/components/docs-content.tsx",
      "app/components/docs-ui.tsx",
      "app/components/docs-layout.tsx",
      "app/components/demo-frame.tsx",
      "app/components/file-tree.tsx",
      "app/components/type-table.tsx",
      "app/islands/code-group.tsx",
      "app/components/figure.tsx",
      "app/components/theme-switch.tsx",
      "app/components/definition-list.tsx",
      "app/components/api-reference.tsx",
      "app/islands/tabs.tsx",
      "app/islands/copy-code.tsx",
      "public/style.css",
      "public/components.css",
      "public/tokens.css",
    ]);
    for (const rel of listFiles(projectScaffold)) {
      if (generatedByInit.has(rel)) continue;
      addSource(join(projectScaffold, rel), rel === "gitignore" ? ".gitignore" : rel);
    }
  }

  const registryRel = "app/mdx-components.ts";
  if (!isVoid) {
    const registryAbs = inspectPath(root, registryRel);
    if (existsSync(registryAbs)) {
      if (!previous.original) {
        throw new Error(
          `${registryRel} exists but ${manifestName} is missing; restore the installation record before updating its managed registry`,
        );
      }
      const current = readFileSync(registryAbs, "utf8");
      originalRegistry = current;
      files.set(registryRel, {
        source: null,
        content: Buffer.from(updateRegistry(current, names)),
      });
    } else
      files.set(registryRel, {
        source: null,
        content: Buffer.from(makeRegistry(names)),
      });
  }

  const manifest = {
    version: 1,
    ...(isVoid ? { framework } : {}),
    groups: installedGroups,
    files: Object.assign({}, previous.files),
  };
  for (const [destination, item] of files) manifest.files[destination] = hash(item.content);
  files.set(manifestName, {
    source: null,
    content: Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`),
  });

  const plan = [];
  const conflicts = [];
  for (const [destination, item] of files) {
    const absolute = inspectPath(root, destination);
    if (!existsSync(absolute)) plan.push({ destination, action: "create" });
    else {
      const existing = readFileSync(absolute);
      if (existing.equals(item.content)) plan.push({ destination, action: "skip (identical)" });
      else if (destination === registryRel || destination === manifestName)
        plan.push({
          destination,
          action: `update ${destination === registryRel ? "managed registry" : "installation record"}`,
        });
      else conflicts.push(`${destination}: exists with different content`);
    }
  }
  if (conflicts.length)
    throw new Error(
      `no files were written; resolve conflicts and retry:\n${conflicts.map((item) => `  • ${item}`).join("\n")}`,
    );
  console.log(dryRun ? "Dry run:" : "Install plan:");
  for (const { destination, action } of plan) console.log(`  ${action.padEnd(24)} ${destination}`);
  if (dryRun) return;

  // All destinations and conflicts were checked above. Create directories and
  // use exclusive writes so a concurrent user file is never overwritten.
  for (const [destination, item] of files) {
    const absolute = inspectPath(root, destination);
    if (existsSync(absolute)) {
      if (readFileSync(absolute).equals(item.content)) continue;
      if (destination !== registryRel && destination !== manifestName) continue;
      const temporary = `${absolute}.honoxpress-tmp-${process.pid}`;
      writeFileSync(temporary, item.content, { flag: "wx" });
      const expected = destination === registryRel ? originalRegistry : previous.original;
      if (readFileSync(absolute, "utf8") !== expected) {
        throw new Error(
          `${destination} changed during installation; temporary file retained at ${temporary}`,
        );
      }
      renameSync(temporary, absolute);
      continue;
    }
    let parent = dirname(absolute);
    const missing = [];
    while (!existsSync(parent)) {
      missing.push(parent);
      parent = dirname(parent);
    }
    for (const directory of missing.reverse()) mkdirSync(directory);
    if (item.source) copyFileSync(item.source, absolute, 1);
    else writeFileSync(absolute, item.content, { flag: "wx" });
  }
  console.log(
    "\nInstalled consumer-owned files. Existing routes and Vite config were left to you.",
  );
  console.log(
    isVoid
      ? "Use app/void-layout.tsx with Void Markdown; see docs/void.md."
      : "Static components need <Style /> from hono/css once in <head>, before your stylesheets; DocsLayout includes it.",
  );
  if (starter)
    console.log(
      isVoid
        ? "The scaffold is ready; install its declared dependencies and follow docs/void.md."
        : "The scaffold is ready; install its declared dependencies and follow docs/components.md.",
    );
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options.command) help();
  else if (options.command === "list") console.log(allGroups.join("\n"));
  else install(options);
} catch (error) {
  console.error(`honoxpress: ${error.message}`);
  process.exitCode = 1;
}
