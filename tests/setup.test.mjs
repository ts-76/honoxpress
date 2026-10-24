import { isBuildOnlyModule } from "../scripts/runtime-compiler-guard.mjs";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const cli = resolve(dirname(fileURLToPath(import.meta.url)), "../packages/docs/bin/honoxpress.mjs");

function withProject(run) {
  const directory = mkdtempSync(join(tmpdir(), "honoxpress-setup-"));
  try {
    run(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function invoke(directory, ...args) {
  return spawnSync(process.execPath, [cli, ...args, "--cwd", directory], {
    encoding: "utf8",
    timeout: 15_000,
  });
}

void test("init dry-run describes the complete setup without writing files", () => {
  withProject((directory) => {
    const result = invoke(directory, "init", "--dry-run");
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /app\/mdx-components\.ts/);
    assert.match(result.stdout, /public\/style\.css/);
    assert.deepEqual(readdirSync(directory), []);
  });
});

void test("component installation is idempotent and preserves registry extensions", () => {
  withProject((directory) => {
    const first = invoke(directory, "add", "callout");
    assert.equal(first.status, 0, first.stderr);
    const tokensPath = join(directory, "public/tokens.css");
    const tokens = readFileSync(tokensPath, "utf8");
    assert.match(readFileSync(join(directory, "public/components.css"), "utf8"), /tokens\.css/);
    const customTokens = `${tokens}\n:root { --docs-panel-padding: 2rem; }\n`;
    writeFileSync(tokensPath, customTokens);
    const registryPath = join(directory, "app/mdx-components.ts");
    const original = readFileSync(registryPath, "utf8");
    assert.match(original, /import \{ Callout \} from "\.\/components\/docs-content"/);
    assert.doesNotMatch(original, /import \{[^}]*Card/);
    const customized = original.replace(
      "export const components = { ...standardComponents };",
      'export const ProjectCallout = () => "consumer-owned";\nexport const components = { ...standardComponents, Callout: ProjectCallout };',
    );
    assert.notEqual(customized, original);
    writeFileSync(registryPath, customized);

    const addTabs = invoke(directory, "add", "tabs");
    assert.equal(addTabs.status, 0, addTabs.stderr);
    assert.equal(readFileSync(tokensPath, "utf8"), customTokens);
    const extended = readFileSync(registryPath, "utf8");
    assert.match(extended, /export const ProjectCallout = \(\) => "consumer-owned";/);
    assert.match(extended, /\.\.\.standardComponents, Callout: ProjectCallout/);
    assert.match(extended, /import Tabs from "\.\/islands\/tabs";/);
    assert.match(extended, /import \{[^}]*TabPanel[^}]*\} from "\.\/components\/docs-content"/);
    assert.match(extended, /\.\.\.components, \.\.\.overrides/);

    const before = readFileSync(join(directory, ".honoxpress.json"), "utf8");
    const repeat = invoke(directory, "add", "tabs");
    assert.equal(repeat.status, 0, repeat.stderr);
    assert.match(repeat.stdout, /skip \(identical\)/);
    assert.equal(readFileSync(join(directory, ".honoxpress.json"), "utf8"), before);
  });
});

void test("a differing target file reports all conflicts before creating any files", () => {
  withProject((directory) => {
    mkdirSync(join(directory, "app/components"), { recursive: true });
    writeFileSync(join(directory, "app/components/docs-content.tsx"), "consumer-owned content\n");
    const result = invoke(directory, "add", "callout");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /no files were written/);
    assert.equal(existsSync(join(directory, "app/mdx-components.ts")), false);
    assert.equal(existsSync(join(directory, ".honoxpress.json")), false);
    assert.equal(
      readFileSync(join(directory, "app/components/docs-content.tsx"), "utf8"),
      "consumer-owned content\n",
    );
  });
});

void test("an existing managed registry without its manifest fails closed", () => {
  withProject((directory) => {
    mkdirSync(join(directory, "app"), { recursive: true });
    writeFileSync(
      join(directory, "app/mdx-components.ts"),
      `// honoxpress:components:start\nexport const standardComponents = { Callout };\n// honoxpress:components:end\nexport const ProjectCallout = () => "custom";\n`,
    );
    const result = invoke(directory, "add", "tabs");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /\.honoxpress\.json is missing/);
    assert.match(readFileSync(join(directory, "app/mdx-components.ts"), "utf8"), /ProjectCallout/);
    assert.equal(existsSync(join(directory, ".honoxpress.json")), false);
    assert.equal(existsSync(join(directory, "app/islands/tabs.tsx")), false);
  });
});

void test("symbolic-link parents are refused before writing through them", () => {
  withProject((directory) => {
    const outside = mkdtempSync(join(tmpdir(), "honoxpress-outside-"));
    try {
      mkdirSync(join(directory, "app"));
      symlinkSync(outside, join(directory, "app/islands"), "dir");
      const result = invoke(directory, "add", "tabs");
      assert.equal(result.status, 1);
      assert.match(result.stderr, /unsafe parent path/);
      assert.deepEqual(readdirSync(outside), []);
      assert.equal(existsSync(join(directory, "app/components/docs-content.tsx")), false);
      assert.equal(existsSync(join(directory, ".honoxpress.json")), false);
    } finally {
      assert.equal(lstatSync(outside).isDirectory(), true);
      rmSync(outside, { recursive: true, force: true });
    }
  });
});

void test("unknown groups and options fail without changing the project", () => {
  withProject((directory) => {
    for (const args of [
      ["add", "missing"],
      ["init", "--unexpected"],
    ]) {
      const result = invoke(directory, ...args);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /honoxpress:/);
    }
    assert.deepEqual(readdirSync(directory), []);
  });
});

void test("init starter dry-run includes the runnable project scaffold", () => {
  withProject((directory) => {
    const result = invoke(directory, "init", "--starter", "--dry-run");
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /vite\.config\.ts/);
    assert.match(result.stdout, /app\/routes\//);
    assert.deepEqual(readdirSync(directory), []);

    const installed = invoke(directory, "init", "--starter");
    assert.equal(installed.status, 0, installed.stderr);
    const packageVersion = JSON.parse(
      readFileSync(
        resolve(dirname(fileURLToPath(import.meta.url)), "../packages/docs/package.json"),
        "utf8",
      ),
    ).version;
    const generated = JSON.parse(readFileSync(join(directory, "package.json"), "utf8"));
    assert.equal(generated.dependencies.honoxpress, packageVersion);
    assert.ok(existsSync(join(directory, "vite.config.ts")));
    assert.ok(existsSync(join(directory, ".gitignore")));
    assert.ok(existsSync(join(directory, "public/tokens.css")));
    assert.ok(existsSync(join(directory, "app/components/theme-switch.tsx")));
    assert.match(
      readFileSync(join(directory, "app/components/docs-layout.tsx"), "utf8"),
      /<ThemeScript nonce=/,
    );
    assert.match(
      readFileSync(join(directory, "app/components/docs-layout.tsx"), "utf8"),
      /<Style nonce=\{nonce\} \/>/,
    );
  });
});

void test("authoring groups install separate sources and reuse consumer-owned code islands", () => {
  withProject((directory) => {
    assert.equal(invoke(directory, "add", "tabs").status, 0);
    const tabsPath = join(directory, "app/islands/tabs.tsx");
    const customized = readFileSync(tabsPath, "utf8") + "\n// Application customization\n";
    writeFileSync(tabsPath, customized);
    for (const group of [
      "file-tree",
      "type-table",
      "code-group",
      "figure",
      "theme-switch",
      "definition-list",
      "api-reference",
    ]) {
      const result = invoke(directory, "add", group);
      assert.equal(result.status, 0, result.stderr);
      assert.ok(
        existsSync(
          join(directory, `app/${group === "code-group" ? "islands" : "components"}/${group}.tsx`),
        ),
      );
    }
    assert.equal(readFileSync(tabsPath, "utf8"), customized);
    assert.ok(existsSync(join(directory, "app/islands/copy-code.tsx")));
    const registry = readFileSync(join(directory, "app/mdx-components.ts"), "utf8");
    for (const name of [
      "FileTree",
      "File",
      "Folder",
      "TypeTable",
      "CodeGroup",
      "Figure",
      "ThemeSwitch",
      "DefinitionList",
      "APIReference",
      "TabPanel",
      "CodeBlock",
    ])
      assert.match(registry, new RegExp(`\\b${name}\\b`));
    assert.match(
      readFileSync(join(directory, "app/islands/code-group.tsx"), "utf8"),
      /from "\.\/tabs"/,
    );
    const manifest = JSON.parse(readFileSync(join(directory, ".honoxpress.json"), "utf8"));
    assert.ok(manifest.groups.includes("code-block"));
    assert.equal(invoke(directory, "add", "code-group").status, 0);
  });
});

void test("code-group installs its dependencies and styles in an empty app", () => {
  withProject((directory) => {
    const result = invoke(directory, "add", "code-group");
    assert.equal(result.status, 0, result.stderr);
    for (const path of [
      "app/islands/code-group.tsx",
      "app/components/docs-content.tsx",
      "app/islands/tabs.tsx",
      "app/islands/copy-code.tsx",
      "public/components.css",
      "public/tokens.css",
    ])
      assert.ok(existsSync(join(directory, path)), path);
  });
});

void test("Void starter uses the same conflict-safe installer and preserves its framework", () => {
  withProject((directory) => {
    const dry = invoke(directory, "init", "--framework", "void", "--starter", "--dry-run");
    assert.equal(dry.status, 0, dry.stderr);
    assert.match(dry.stdout, /pages\/docs\/en\/guide.md/);
    assert.deepEqual(readdirSync(directory), []);
    const installed = invoke(directory, "init", "--framework", "void", "--starter");
    assert.equal(installed.status, 0, installed.stderr);
    assert.equal(existsSync(join(directory, "app/mdx-components.ts")), false);
    assert.equal(existsSync(join(directory, "app/client.ts")), false);
    assert.match(readFileSync(join(directory, "vite.config.ts"), "utf8"), /voidHonoMarkdown/);
    assert.match(readFileSync(join(directory, "app/void-layout.tsx"), "utf8"), /HonoStyles/);
    assert.equal(
      JSON.parse(readFileSync(join(directory, "package.json"))).dependencies[
        "void-plugin-hono-jsx"
      ],
      "^0.7.0",
    );
    assert.equal(
      JSON.parse(readFileSync(join(directory, "package.json"))).dependencies.void,
      "1.2.1",
    );
    const component = join(directory, "app/markdown/Callout.tsx");
    const custom = readFileSync(component, "utf8") + "// Local customization\n";
    writeFileSync(component, custom);
    assert.equal(invoke(directory, "add", "callout").status, 0);
    assert.equal(readFileSync(component, "utf8"), custom);
    const before = readFileSync(join(directory, ".honoxpress.json"), "utf8");
    const mixed = invoke(directory, "init", "--framework", "honox");
    assert.equal(mixed.status, 1);
    assert.match(mixed.stderr, /different framework/);
    assert.equal(readFileSync(join(directory, ".honoxpress.json"), "utf8"), before);
  });
});

void test("Void additions preserve edited dependencies and reject conflicts and symlinks", () => {
  withProject((directory) => {
    assert.equal(invoke(directory, "add", "callout", "--framework", "void").status, 0);
    const content = join(directory, "app/components/docs-content.tsx");
    const custom = readFileSync(content, "utf8") + "// Custom\n";
    writeFileSync(content, custom);
    assert.equal(invoke(directory, "add", "cards").status, 0);
    assert.equal(readFileSync(content, "utf8"), custom);
    assert.match(readFileSync(join(directory, "app/markdown/Card.tsx"), "utf8"), /Card as default/);
    const conflicting = join(directory, "vite.config.ts");
    writeFileSync(conflicting, "// Application config\n");
    assert.equal(invoke(directory, "init", "--framework", "void", "--starter").status, 1);
    assert.equal(existsSync(join(directory, "pages")), false);
    assert.equal(readFileSync(conflicting, "utf8"), "// Application config\n");
  });
  withProject((directory) => {
    mkdirSync(join(directory, "app"));
    const outside = mkdtempSync(join(tmpdir(), "honoxpress-void-outside-"));
    try {
      symlinkSync(outside, join(directory, "app/markdown"), "dir");
      const result = invoke(directory, "add", "callout", "--framework", "void");
      assert.equal(result.status, 1);
      assert.match(result.stderr, /unsafe parent/);
      assert.deepEqual(readdirSync(outside), []);
      assert.equal(existsSync(join(directory, ".honoxpress.json")), false);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });
});

await test("Void catalog template retains the existing package entry", () => {
  const content = readFileSync(
    new URL("../packages/docs/void/integration/app/docs-catalog.ts", import.meta.url),
    "utf8",
  );
  assert.match(content, /from "honoxpress\/void"/);
  assert.doesNotMatch(content, /honoxpress\/adapters/);
});

await test("runtime graph guard distinguishes metadata adapters from compilers", () => {
  for (const path of [
    "node_modules/void-plugin-hono-jsx/dist/plugins/hono-markdown.js",
    "node_modules/@ts-76/hono-markdown/dist/compiler/static-markdown.js",
    "node_modules/@babel/parser/lib/index.js",
    "node_modules/honoxpress/dist/build.js",
  ])
    assert.equal(isBuildOnlyModule(path), true, path);
  for (const path of [
    "node_modules/honoxpress/dist/adapters/hono-markdown.js",
    "node_modules/@ts-76/hono-markdown/dist/runtime/markdown.js",
  ])
    assert.equal(isBuildOnlyModule(path), false, path);
});
