import assert from "node:assert/strict";
import { readFile, realpath } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const resolved = await realpath(fileURLToPath(import.meta.resolve("honoxpress")));
assert.ok(resolved.includes("/node_modules/.pnpm/honoxpress@0.1.3"), resolved);
assert.ok(!resolved.includes("/packages/docs/"), "pilot must not resolve repository source");
const installed = JSON.parse(await readFile("node_modules/honoxpress/package.json", "utf8"));
assert.equal(installed.version, "0.1.3");
assert.equal(installed.private, false);
const lock = await readFile("pnpm-lock.yaml", "utf8");
assert.match(lock, /honoxpress@0\.1\.3:\n\s+resolution: \{integrity: sha512-/);
assert.equal(
  /(?:specifier|version): ['"]?(?:link:|workspace:|file:)/m.test(lock),
  false,
  "lock must not contain local dependency references",
);
console.log(
  "Registry honoxpress@0.1.3 resolved with integrity lock; no workspace/source dependency",
);
