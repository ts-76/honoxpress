import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const registry = "https://registry.npmjs.org/";
export const repository = "https://github.com/ts-76/honoxpress.git";
export const npmVersion = "11.21.0";
const semver =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
export const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
export const json = async (file) => JSON.parse(await readFile(file, "utf8"));

export function hasReleaseNotes(changelog, version) {
  return changelog.split("\n").some((line) => {
    const heading = line.match(
      /^## (?:\[([^\]]+)\]\([^)]+\)|([^\s]+))(?: \(\d{4}-\d{2}-\d{2}\))?$/,
    );
    return heading && (heading[1] || heading[2]) === version;
  });
}

export function approvedMetadataBlockers(pkg, policy, { licenseText = "", changelog = "" } = {}) {
  const blockers = [];
  if (pkg.name !== "honoxpress") blockers.push("package-name");
  if (!semver.test(pkg.version) || pkg.version === "0.0.0" || pkg.version !== policy.version)
    blockers.push("owner-version");
  if (
    !policy.license ||
    pkg.license !== policy.license ||
    pkg.license === "UNLICENSED" ||
    !licenseText.trim()
  )
    blockers.push("owner-license");
  if (!policy.npmOwner || !/^[a-z0-9][a-z0-9._-]*$/.test(policy.npmOwner))
    blockers.push("npm-owner");
  if (!policy.distTag || !/^[A-Za-z][A-Za-z0-9_-]*$/.test(policy.distTag))
    blockers.push("dist-tag");
  if (semver.test(pkg.version) && pkg.version.includes("-") && policy.distTag === "latest")
    blockers.push("prerelease-latest");
  if (pkg.repository?.url !== repository) blockers.push("repository-url");
  if (pkg.publishConfig && Object.keys(pkg.publishConfig).length)
    blockers.push("publish-config-override");
  if (!hasReleaseNotes(changelog, pkg.version)) blockers.push("release-notes");
  return blockers;
}

export function metadataBlockers(pkg, policy, texts = {}) {
  const blockers = approvedMetadataBlockers(pkg, policy, texts);
  if (policy.stageEnabled !== true) blockers.push("staging-disabled");
  if (pkg.private !== false) blockers.push("package-private");
  if (typeof policy.provenance !== "boolean") blockers.push("provenance-decision");
  return blockers;
}

export async function inspectArtifact({ root = process.cwd(), artifactRoot = root, commit }) {
  const evidence = await json(path.join(artifactRoot, "packages/docs/evidence/consumer.json"));
  assert.match(evidence.tarball.filename, /^honoxpress-[0-9A-Za-z.+-]+\.tgz$/);
  const tarball = path.join(artifactRoot, "artifacts/package", evidence.tarball.filename);
  const bytes = await readFile(tarball);
  assert.equal(sha256(bytes), evidence.tarball.sha256, "Verified tarball SHA256 changed");
  assert.equal(evidence.commit, commit, "Consumer evidence belongs to a different commit");
  const packed = JSON.parse(
    execFileSync("tar", ["-xOzf", tarball, "package/package.json"], { encoding: "utf8" }),
  );
  const pkg = await json(path.join(root, "packages/docs/package.json"));
  assert.deepEqual(packed, pkg, "Packed metadata differs from the verified source commit");
  if (pkg.license) {
    const packedLicense = execFileSync("tar", ["-xOzf", tarball, "package/LICENSE"], {
      encoding: "utf8",
    });
    assert.equal(
      packedLicense,
      await readFile(path.join(root, "packages/docs/LICENSE"), "utf8"),
      "Packed license differs from approved source",
    );
  }
  assert.equal(packed.name, evidence.package.name);
  assert.equal(packed.version, evidence.package.version);
  assert.equal(packed.private, evidence.package.private);
  assert.equal(evidence.externalConsumer.outsideRepository, true);
  assert.equal(evidence.externalConsumer.packageInstalledFromTarball, true);
  assert.equal(evidence.externalConsumer.workspaceOrSourceLinks, false);
  assert.equal(evidence.externalConsumer.packageStaleOutputRemoved, true);
  assert.equal(evidence.validation.buildTests, 5);
  assert.equal(evidence.validation.browserTests, 6);
  assert.equal(evidence.validation.clientSSGWorker, "passed");
  assert.equal(evidence.validation.cfBuild, "passed");
  for (const target of ["worker", "client"])
    assert.deepEqual(evidence.graphs[target].docsCompilerOrBuildModules, []);
  const unit = await json(path.join(artifactRoot, "artifacts/package-tests.json"));
  assert.equal(unit.success, true);
  assert.equal(unit.numPassedTests, 15);
  assert.equal(unit.numFailedTests, 0);
  return {
    pkg,
    tarball,
    sha256: sha256(bytes),
    integrity: `sha512-${createHash("sha512").update(bytes).digest("base64")}`,
  };
}

export async function createPlan({ root = process.cwd(), artifactRoot = root, commit, ref }) {
  const artifact = await inspectArtifact({ root, artifactRoot, commit });
  const policy = await json(path.join(root, "release-policy.json"));
  const optionalText = async (file) =>
    readFile(path.join(root, file), "utf8").catch((e) => {
      if (e.code === "ENOENT") return "";
      throw e;
    });
  const blockers = metadataBlockers(artifact.pkg, policy, {
    licenseText: await optionalText("packages/docs/LICENSE"),
    changelog: await optionalText("CHANGELOG.md"),
  });
  if (ref !== `refs/tags/v${artifact.pkg.version}`) blockers.push("version-tag");
  return {
    status: blockers.length ? "blocked" : "ready",
    blockers,
    commit,
    ref,
    package: { name: artifact.pkg.name, version: artifact.pkg.version },
    tarball: {
      filename: path.basename(artifact.tarball),
      sha256: artifact.sha256,
      integrity: artifact.integrity,
    },
    distTag: policy.distTag,
    provenance: policy.provenance,
    npmOwner: policy.npmOwner,
    npmVersion,
    registry,
    stage: "not executed",
    approval: "npm maintainer review and 2FA; never automated",
  };
}

export async function registryPreflight(pkg, fetchImpl = fetch) {
  const query = async (suffix) => {
    const response = await fetchImpl(`${registry}${encodeURIComponent(pkg.name)}${suffix}`, {
      signal: AbortSignal.timeout(15000),
    });
    if (response.status === 404) return null;
    assert.equal(response.status, 200, `Registry preflight failed: HTTP ${response.status}`);
    return response.json();
  };
  assert.equal(
    await query(`/${encodeURIComponent(pkg.version)}`),
    null,
    "Version already published; no restaging",
  );
  const existing = await query("");
  assert.ok(
    existing,
    "Initial authenticated stage bootstrap required; Trusted Publishing needs an existing package",
  );
  return existing;
}

export function requireEnvironmentReview(environment, deploymentPolicies) {
  assert.equal(environment.name, "npm-stage", "Expected the npm-stage environment");
  assert.equal(environment.can_admins_bypass, false, "Environment approval must not be bypassable");
  assert.ok(
    environment.protection_rules?.some(
      (rule) =>
        rule.type === "required_reviewers" &&
        rule.prevent_self_review === false &&
        rule.reviewers?.length === 1 &&
        rule.reviewers[0].type === "User" &&
        rule.reviewers[0].reviewer?.login === "ts-76" &&
        rule.reviewers[0].reviewer?.id === 108617014,
    ),
    "npm-stage must require owner ts-76 approval and allow self-review",
  );
  assert.ok(
    environment.deployment_branch_policy?.custom_branch_policies === true &&
      environment.deployment_branch_policy?.protected_branches === false &&
      deploymentPolicies?.branch_policies?.length === 1 &&
      deploymentPolicies.branch_policies[0].type === "tag" &&
      deploymentPolicies.branch_policies[0].name === "v*",
    "npm-stage must permit only v* tags",
  );
}

export function stageArguments(plan, tarball) {
  assert.equal(plan.status, "ready", `Release blocked: ${plan.blockers.join(", ")}`);
  return [
    "stage",
    "publish",
    path.resolve(tarball),
    "--ignore-scripts",
    "--json",
    "--registry",
    registry,
    "--access",
    "public",
    "--tag",
    plan.distTag,
    `--provenance=${plan.provenance}`,
  ];
}

export function stageReceipt(stdout, plan) {
  const parsed = JSON.parse(stdout);
  assert.deepEqual(Object.keys(parsed), [plan.package.name], "Unexpected npm receipt package");
  const result = parsed[plan.package.name];
  assert.equal(result.integrity, plan.tarball.integrity, "Stage receipt integrity changed");
  assert.equal(
    typeof result.stageId,
    "string",
    "Stage receipt missing; inspect npm before retrying",
  );
  assert.ok(result.stageId.length > 0, "Stage receipt missing; inspect npm before retrying");
  return result;
}
