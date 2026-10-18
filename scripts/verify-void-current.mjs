import { cp, mkdir, mkdtemp, readdir, symlink, writeFile } from "node:fs/promises";
import { execFileSync, spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const pilot = join(root, "pilots/void");
const consumer = await mkdtemp(join(tmpdir(), "honoxpress-void-current-"));
const artifacts = join(root, "artifacts/void-current");
await mkdir(artifacts, { recursive: true });
const env = { ...process.env, HX_CANDIDATE: "1", HX_DEV_PORT: "5295", HX_PREVIEW_PORT: "4295" };
// Reuse the locked pilot dependency installation without modifying it. The
// candidate is physically extracted into its own package directory, so its Hono
// peer resolves through this consumer's dependency graph.
await cp(pilot, consumer, {
  recursive: true,
  filter: (path) =>
    !["node_modules", ".generated", ".void", ".wrangler", "dist", "evidence", ".cloudflare"].some(
      (name) => path === join(pilot, name) || path.startsWith(join(pilot, name) + "/"),
    ),
});
await mkdir(join(consumer, "node_modules"));
for (const entry of await readdir(join(pilot, "node_modules"))) {
  if (entry === "honoxpress" || entry === ".bin" || entry.startsWith(".package")) continue;
  await symlink(join(pilot, "node_modules", entry), join(consumer, "node_modules", entry));
}
const npm = join(root, "node_modules/npm/bin/npm-cli.js");
const packed = JSON.parse(
  execFileSync(
    process.execPath,
    [npm, "pack", join(root, "packages/docs"), "--json", "--pack-destination", artifacts],
    { cwd: root, env, encoding: "utf8" },
  ),
);
const tarball = resolve(artifacts, packed[0].filename);
await mkdir(join(consumer, "node_modules/honoxpress"));
execFileSync("tar", [
  "-xzf",
  tarball,
  "--strip-components=1",
  "-C",
  join(consumer, "node_modules/honoxpress"),
]);
await cp(join(pilot, "candidate/layout.tsx"), join(consumer, "pages/layout.tsx"));
await writeFile(
  join(artifacts, "consumer.json"),
  JSON.stringify(
    {
      consumer,
      tarball,
      packageIntegrity: packed[0].integrity,
      note: "Unreleased working-tree package; installed dependency versions remain those of the locked published pilot.",
    },
    null,
    2,
  ) + "\n",
);
console.log(`Candidate consumer: ${consumer}`);
const child = spawn(process.execPath, ["scripts/verify.mjs"], {
  cwd: consumer,
  env,
  stdio: "inherit",
});
const code = await new Promise((resolve) => child.once("exit", resolve));
await cp(join(consumer, "evidence"), join(artifacts, "evidence"), { recursive: true });
process.exitCode = code ?? 1;
