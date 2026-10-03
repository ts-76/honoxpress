import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

// Tests edit only this disposable app. The installed registry package stays intact.
const id = randomUUID();
const root = await mkdtemp(join(tmpdir(), "honoxpress-hmr-"));
for (const name of ["app", "build", "public", "vite.config.ts", "tsconfig.json"])
  await cp(name, join(root, name), { recursive: true });
// The packed consumer has its own config; the repository example inherits one.
const workspace = await readFile("pnpm-workspace.yaml", "utf8").catch(() =>
  readFile("../../pnpm-workspace.yaml", "utf8"),
);
await writeFile(
  join(root, "pnpm-workspace.yaml"),
  workspace.replace(/^packages:\n(?:  - .*\n)+/, "packages:\n  - .\n"),
);
await writeFile(join(root, ".npmrc"), "registry=https://registry.npmjs.org/\n");
// A fixture-only round trip verifies the parent document's HMR channel is live.
const configFile = join(root, "vite.config.ts");
let config = await readFile(configFile, "utf8");
config = config.replace(
  "plugins: lazyPlugins(async () => [",
  `plugins: lazyPlugins(async () => [
  { name: "hmr-test-readiness", configureServer(server) {
    server.watcher.on("all", (event, file) => {
      if (file.endsWith(".mdx")) console.info("[hmr-fixture]", JSON.stringify({ id: ${JSON.stringify(id)}, event, file }));
    });
    server.ws.on("honoxpress:test-ready", (data, client) => {
      const suffix = "/app/routes" + data.pathname + ".mdx";
      const watched = Object.entries(server.watcher.getWatched());
      const paths = watched.flatMap(([dir, names]) => names.map((name) => (dir + "/" + name).split(String.fromCharCode(92)).join("/")));
      const watching = paths.some((file) => file.endsWith(suffix));
      if (!watching) console.info("[hmr-watch-not-ready]", JSON.stringify({ id: ${JSON.stringify(id)}, root: server.config.root,
        suffix, mdx: paths.filter((file) => file.endsWith(".mdx")), directories: watched.length,
        sample: watched.slice(0, 8).map(([dir]) => dir), options: { cwd: server.config.server.watch?.cwd, usePolling: server.config.server.watch?.usePolling } }));
      client.send({ type: "custom", event: "honoxpress:test-ready-ack", data: { id: ${JSON.stringify(id)}, watching, diagnostics: { root: server.config.root, suffix, mdx: paths.filter((file) => file.endsWith(".mdx")), directories: watched.length, sample: watched.slice(0, 8).map(([dir]) => dir), watchOptions: server.config.server.watch, bundledDev: server.config.experimental.bundledDev } } });
    });
  } },`,
);
await writeFile(configFile, config);
const pkg = JSON.parse(await readFile("package.json", "utf8"));
pkg.scripts.dev = pkg.scripts.dev.replace(/--port \d+/, "--port 5195");
await writeFile(join(root, "package.json"), JSON.stringify(pkg));
await symlink(resolve("node_modules"), join(root, "node_modules"), "dir");
await mkdir("dist/evidence", { recursive: true });
await writeFile("dist/evidence/hmr-root.json", JSON.stringify({ root, id }));
// Remain in Playwright's process group so teardown also stops Vite descendants.
const child = spawn("pnpm", ["dev"], { cwd: root, stdio: "inherit" });
let stopping = false;
const stop = async (code = 0) => {
  if (stopping) return;
  stopping = true;
  if (child.pid) {
    child.kill("SIGTERM");
  }
  await rm(root, { recursive: true, force: true });
  process.exit(code);
};
process.on("SIGTERM", () => void stop());
process.on("SIGINT", () => void stop());
child.on("error", (e) => {
  console.error(e);
  void stop(1);
});
child.on("exit", (code) => void stop(code ?? 1));
