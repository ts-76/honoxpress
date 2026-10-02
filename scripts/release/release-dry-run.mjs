import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inspectArtifact, npmVersion, sha256 } from "./release-gate.mjs";

export async function dryRunTarball(tarball, integrity, npmCli) {
  const directory = await mkdtemp(path.join(tmpdir(), "honoxpress-npm-dry-run-"));
  const requests = [];
  const server = createServer((request, response) => {
    requests.push(request.method);
    response.writeHead(request.method === "GET" ? 404 : 405, {
      "Content-Type": "application/json",
    });
    response.end(JSON.stringify({ error: "local dry-run registry tripwire" }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    await writeFile(path.join(directory, "npmrc"), "");
    const bytesBefore = await readFile(tarball);
    const env = {
      PATH: process.env.PATH,
      HOME: directory,
      TMPDIR: directory,
      npm_config_userconfig: path.join(directory, "npmrc"),
      npm_config_globalconfig: path.join(directory, "globalrc"),
      npm_config_cache: path.join(directory, "cache"),
      npm_config_update_notifier: "false",
    };
    await writeFile(env.npm_config_globalconfig, "");
    const run = (args) =>
      new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [npmCli, ...args], { cwd: directory, env });
        let stdout = "",
          stderr = "";
        child.stdout.on("data", (data) => {
          stdout += data;
        });
        child.stderr.on("data", (data) => {
          stderr += data;
        });
        const timer = setTimeout(() => child.kill("SIGTERM"), 30000);
        child.on("error", reject);
        child.on("close", (code) => {
          clearTimeout(timer);
          resolve({ code, stdout, stderr });
        });
      });
    const version = await run(["--version"]);
    assert.equal(version.code, 0, version.stderr);
    assert.equal(version.stdout.trim(), npmVersion, "Use the reviewed job-local npm CLI");
    const result = await run([
      "stage",
      "publish",
      path.resolve(tarball),
      "--dry-run",
      "--ignore-scripts",
      "--json",
      "--registry",
      `http://127.0.0.1:${server.address().port}/`,
      "--tag",
      "dry-run",
      "--access",
      "public",
      "--provenance=false",
      "--fetch-retries=0",
      "--fetch-timeout=5000",
    ]);
    assert.equal(result.code, 0, result.stderr);
    const outputs = Object.values(JSON.parse(result.stdout));
    assert.equal(outputs.length, 1);
    const output = outputs[0];
    assert.equal(output.integrity, integrity, "npm must use exactly the verified tarball bytes");
    assert.equal(output.stageId, undefined, "Dry-run must not create a stage receipt");
    assert.ok(requests.length > 0, "Registry tripwire must observe the CLI preflight");
    assert.ok(
      requests.every((method) => method === "GET"),
      "npm dry-run attempted a network write",
    );
    assert.equal(sha256(await readFile(tarball)), sha256(bytesBefore));
    return {
      npmVersion,
      integrity,
      sha256: sha256(bytesBefore),
      registry: "loopback tripwire only",
      requests,
      writeRequests: 0,
      stage: "not executed",
      inheritedCredentialsOrOIDC: false,
    };
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { execFileSync } = await import("node:child_process");
  const commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const artifact = await inspectArtifact({ commit });
  const result = await dryRunTarball(
    artifact.tarball,
    artifact.integrity,
    path.resolve("node_modules/npm/bin/npm-cli.js"),
  );
  await mkdir("artifacts/release", { recursive: true });
  await writeFile("artifacts/release/dry-run.json", JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result, null, 2));
}
