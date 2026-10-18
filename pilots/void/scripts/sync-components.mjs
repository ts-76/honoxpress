import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";

// Published, consumer-owned templates; never patch node_modules or the library.
const names = [
  "docs-content.tsx",
  "file-tree.tsx",
  "type-table.tsx",
  "theme-switch.tsx",
  "tabs.tsx",
  "code-group.tsx",
  "copy-code.tsx",
  "docs-layout.tsx",
  "docs-ui.tsx",
];
const candidate = process.env.HX_CANDIDATE === "1";
const hashes = {};
const manifest = JSON.parse(await readFile("node_modules/honoxpress/package.json", "utf8"));
if (manifest.version !== "0.3.0")
  throw new Error("Review the pilot against the new honoxpress version before syncing.");
for (const mode of ["baseline", "adapted", "shared"])
  await mkdir(`.generated/${mode}`, { recursive: true });
for (const name of [...names, "docs.css", "components.css", "tokens.css"]) {
  const source = await readFile(`node_modules/honoxpress/templates/${name}`, "utf8");
  hashes[name] = createHash("sha256").update(source).digest("hex");
  if (name.endsWith(".css")) {
    await writeFile(`.generated/shared/${name}`, source);
    continue;
  }
  await writeFile(`.generated/baseline/${name}`, source);
  // The only component edit: use a renderer-aware class tag, keeping the CSS
  // template, stable selectors, props and markup byte-for-byte otherwise.
  const adapted = candidate ? source : source.replace(
    'import { html } from "hono/html";',
    'import { componentClass as html } from "../../integration/component-class";',
  );
  if (
    ["docs-content.tsx", "file-tree.tsx", "type-table.tsx"].includes(name) &&
    !candidate && adapted === source
  ) {
    throw new Error(`Published class composition changed in ${name}; review the adapter.`);
  }
  await writeFile(`.generated/adapted/${name}`, adapted);
  if (name === "theme-switch.tsx") {
    const match = source.match(/const themeInitializer = String.raw`([\s\S]*?)`;/);
    if (!match) throw new Error("Published theme initializer changed; review sync.");
    await writeFile(
      ".generated/theme-initializer.ts",
      `export const themeInitializer = ${JSON.stringify(match[1])};\n`,
    );
  }
}
await writeFile(".generated/template-hashes.json", JSON.stringify(hashes, null, 2) + "\n");
console.log(candidate
  ? "Synced unreleased candidate templates without class or theme patches."
  : "Synced honoxpress 0.3.0 templates; baseline unchanged, adapted class tag only.");
