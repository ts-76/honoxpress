import assert from "node:assert/strict";
import { test } from "node:test";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  createPlan,
  inspectArtifact,
  metadataBlockers,
  approvedMetadataBlockers,
  registryPreflight,
  requireEnvironmentReview,
  stageArguments,
  sha256,
  repository,
  stageReceipt,
  hasReleaseNotes,
} from "./release-gate.mjs";
import { dryRunTarball } from "./release-dry-run.mjs";

const pkg = {
  name: "honoxpress",
  version: "7.8.9",
  private: false,
  license: "SEE LICENSE IN LICENSE",
  repository: { type: "git", url: repository },
};
const policy = {
  stageEnabled: true,
  npmOwner: "test-owner",
  version: pkg.version,
  license: pkg.license,
  distTag: "test-only",
  provenance: false,
};
const texts = {
  licenseText: "Synthetic test fixture; no project license decision",
  changelog: `## ${pkg.version}`,
};
const fixture = async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "honoxpress-release-fixture-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const directory of ["packages/docs/evidence", "artifacts/package", "package"])
    await mkdir(path.join(root, directory), { recursive: true });
  const save = (file, value) => writeFile(path.join(root, file), JSON.stringify(value, null, 2));
  await save("packages/docs/package.json", pkg);
  await save("package/package.json", pkg);
  await writeFile(path.join(root, "package/LICENSE"), texts.licenseText);
  await writeFile(path.join(root, "packages/docs/LICENSE"), texts.licenseText);
  await writeFile(path.join(root, "CHANGELOG.md"), texts.changelog);
  await save("release-policy.json", policy);
  const tarball = path.join(root, "artifacts/package", `honoxpress-${pkg.version}.tgz`);
  execFileSync("pnpm", ["pack", "--pack-destination", path.join(root, "artifacts/package")], {
    cwd: path.join(root, "package"),
    stdio: "pipe",
  });
  await save("packages/docs/evidence/consumer.json", {
    commit: "fixture-commit",
    package: pkg,
    tarball: { filename: path.basename(tarball), sha256: sha256(await readFile(tarball)) },
    externalConsumer: {
      outsideRepository: true,
      packageInstalledFromTarball: true,
      workspaceOrSourceLinks: false,
      packageStaleOutputRemoved: true,
    },
    validation: { buildTests: 5, browserTests: 6, clientSSGWorker: "passed", cfBuild: "passed" },
    graphs: {
      worker: { docsCompilerOrBuildModules: [] },
      client: { docsCompilerOrBuildModules: [] },
    },
  });
  await save("artifacts/package-tests.json", {
    success: true,
    numPassedTests: 15,
    numFailedTests: 0,
  });
  return { root, tarball, commit: "fixture-commit", ref: `refs/tags/v${pkg.version}` };
};

await test("current private metadata cannot be made publishable by a CI switch", () => {
  assert.ok(
    metadataBlockers(
      { ...pkg, private: true, version: "0.0.0", license: undefined },
      policy,
      texts,
    ).includes("package-private"),
  );
  assert.ok(
    metadataBlockers(pkg, { ...policy, stageEnabled: false }, texts).includes("staging-disabled"),
  );
});
await test("license, owner, provenance and release notes require explicit decisions", () => {
  assert.deepEqual(metadataBlockers(pkg, policy, texts), []);
  for (const [field, blocker] of [
    ["npmOwner", "npm-owner"],
    ["license", "owner-license"],
    ["provenance", "provenance-decision"],
  ])
    assert.ok(metadataBlockers(pkg, { ...policy, [field]: null }, texts).includes(blocker));
  assert.ok(metadataBlockers(pkg, policy, { ...texts, changelog: "" }).includes("release-notes"));
  assert.ok(
    metadataBlockers(
      { ...pkg, publishConfig: { registry: "https://example.invalid" } },
      policy,
      texts,
    ).includes("publish-config-override"),
  );
});
await test("strict version and tag rules reject typo versions and prerelease latest", () => {
  assert.ok(
    metadataBlockers({ ...pkg, version: "07.8.9" }, policy, texts).includes("owner-version"),
  );
  assert.ok(
    metadataBlockers(
      { ...pkg, version: "7.8.9-beta.1" },
      { ...policy, version: "7.8.9-beta.1", distTag: "latest" },
      texts,
    ).includes("prerelease-latest"),
  );
});
await test("only matching release tag and byte-identical consumer artifact become ready", async (t) => {
  const input = await fixture(t);
  const plan = await createPlan(input);
  assert.equal(plan.status, "ready");
  const blocked = await createPlan({ ...input, ref: "refs/tags/v7.8.8" });
  assert.ok(blocked.blockers.includes("version-tag"));
  assert.throws(() => stageArguments(blocked, input.tarball), /Release blocked/);
  assert.equal(stageArguments(plan, input.tarball)[2], input.tarball);
});
await test("modified bytes, stale commit and unsuccessful quality evidence fail closed", async (t) => {
  const input = await fixture(t);
  await assert.rejects(inspectArtifact({ ...input, commit: "other-commit" }), /different commit/);
  await writeFile(path.join(input.root, "packages/docs/LICENSE"), "changed license");
  await assert.rejects(inspectArtifact(input), /Packed license differs/);
  await writeFile(path.join(input.root, "packages/docs/LICENSE"), texts.licenseText);

  await writeFile(
    path.join(input.root, "artifacts/package-tests.json"),
    JSON.stringify({ success: false }),
  );
  await assert.rejects(inspectArtifact(input));
  await writeFile(input.tarball, "changed tarball");
  await assert.rejects(inspectArtifact(input), /SHA256 changed/);
});
await test("published duplicate, new-package bootstrap and registry outage stop OIDC stage", async () => {
  const response = (status, value = {}) => ({ status, json: async () => value });
  await assert.rejects(
    registryPreflight(pkg, async () => response(200)),
    /already published/,
  );
  await assert.rejects(
    registryPreflight(pkg, async () => response(404)),
    /bootstrap required/,
  );
  await assert.rejects(
    registryPreflight(pkg, async () => response(503)),
    /HTTP 503/,
  );
  const urls = [];
  const existing = await registryPreflight(pkg, async (url) => {
    urls.push(url);
    return response(url.endsWith(`/${pkg.version}`) ? 404 : 200, {
      maintainers: [{ name: policy.npmOwner }],
    });
  });
  assert.equal(existing.maintainers[0].name, policy.npmOwner);
  assert.ok(urls.every((url) => url.startsWith("https://registry.npmjs.org/")));
});
await test("environment names cannot substitute for an independent approval gate", () => {
  assert.throws(
    () => requireEnvironmentReview({ name: "npm-stage", protection_rules: [] }),
    /required reviewers/,
  );
  assert.throws(() =>
    requireEnvironmentReview({
      protection_rules: [
        { type: "required_reviewers", reviewers: [{}], prevent_self_review: false },
      ],
    }),
  );
  requireEnvironmentReview({
    protection_rules: [{ type: "required_reviewers", reviewers: [{}], prevent_self_review: true }],
  });
});
await test("pinned npm stage dry-run uses exact tarball and makes no registry writes", async (t) => {
  const input = await fixture(t);
  const integrity = `sha512-${createHash("sha512")
    .update(await readFile(input.tarball))
    .digest("base64")}`;
  const result = await dryRunTarball(
    input.tarball,
    integrity,
    path.resolve("node_modules/npm/bin/npm-cli.js"),
  );
  assert.equal(result.writeRequests, 0);
  assert.equal(result.inheritedCredentialsOrOIDC, false);
});

await test("stage receipt must identify the approved package and exact verified bytes", () => {
  const plan = { package: { name: "honoxpress" }, tarball: { integrity: "sha512-test" } };
  assert.equal(
    stageReceipt(
      JSON.stringify({ honoxpress: { integrity: "sha512-test", stageId: "test-stage-id" } }),
      plan,
    ).stageId,
    "test-stage-id",
  );
  assert.throws(() =>
    stageReceipt(
      JSON.stringify({ honoxpress: { integrity: "sha512-other", stageId: "test-stage-id" } }),
      plan,
    ),
  );
  assert.throws(() =>
    stageReceipt(JSON.stringify({ honoxpress: { integrity: "sha512-test" } }), plan),
  );
  assert.throws(() =>
    stageReceipt(
      JSON.stringify({ unrelated: { integrity: "sha512-test", stageId: "test-stage-id" } }),
      plan,
    ),
  );
});

await test("current public MIT candidate remains staging-disabled with provenance undecided", async () => {
  const approvedPackage = JSON.parse(await readFile("packages/docs/package.json", "utf8"));
  const approvedPolicy = JSON.parse(await readFile("release-policy.json", "utf8"));
  const licenseText = await readFile("packages/docs/LICENSE", "utf8");
  const changelog = await readFile("CHANGELOG.md", "utf8");
  assert.equal(approvedPackage.name, "honoxpress");
  assert.equal(approvedPackage.version, approvedPolicy.version);
  assert.equal(approvedPackage.license, "MIT");
  assert.equal(approvedPolicy.npmOwner, "ts-76");
  assert.equal(approvedPackage.private, false);
  assert.equal(approvedPolicy.stageEnabled, false);
  assert.equal(approvedPolicy.provenance, null);
  assert.equal(licenseText, await readFile("LICENSE", "utf8"));
  assert.deepEqual(
    approvedMetadataBlockers(approvedPackage, approvedPolicy, { licenseText, changelog }),
    [],
  );
  const blockers = metadataBlockers(approvedPackage, approvedPolicy, { licenseText, changelog });
  assert.deepEqual(blockers.sort(), ["staging-disabled", "provenance-decision"].sort());
  assert.throws(
    () =>
      stageArguments({ status: "blocked", blockers }, `honoxpress-${approvedPackage.version}.tgz`),
    /Release blocked/,
  );
});

await test("release notes accept release-please compare headings and reject another version", () => {
  for (const heading of [
    "## 0.1.1",
    "## 0.1.1 (2026-10-03)",
    "## [0.1.1](https://github.com/ts-76/honoxpress/compare/v0.1.0...v0.1.1) (2026-10-03)",
  ])
    assert.equal(hasReleaseNotes(heading, "0.1.1"), true);
  for (const heading of [
    "## 0.1.10",
    "## [0.1.10](https://example.invalid) (2026-10-03)",
    "A sentence mentions 0.1.1",
    "### 0.1.1",
  ])
    assert.equal(hasReleaseNotes(heading, "0.1.1"), false);
});
