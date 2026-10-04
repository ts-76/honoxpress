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
  });
});
