import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import {
  createPlan,
  inspectArtifact,
  registryPreflight,
  requireEnvironmentReview,
  stageArguments,
  npmVersion,
  stageReceipt,
} from "./release-gate.mjs";

assert.equal(process.env.GITHUB_ACTIONS, "true", "Staging is restricted to the reviewed workflow");
assert.equal(process.env.NPM_STAGE_AUTHORIZATION, "protected-environment");
assert.equal(process.env.GITHUB_REPOSITORY, "ts-76/honoxpress");
assert.equal(process.env.GITHUB_REF_TYPE, "tag");
const commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
assert.equal(commit, process.env.GITHUB_SHA);
assert.equal(
  execFileSync("git", ["rev-parse", `${process.env.GITHUB_REF}^{commit}`], {
    encoding: "utf8",
  }).trim(),
  commit,
  "Git release tag must resolve to the accepted commit",
);
execFileSync("git", ["merge-base", "--is-ancestor", commit, "origin/main"], { stdio: "pipe" });
const artifactRoot = process.env.RELEASE_ARTIFACT_ROOT;
assert.ok(artifactRoot);
const plan = await createPlan({ commit, ref: process.env.GITHUB_REF, artifactRoot });
assert.equal(plan.status, "ready", `Release blocked: ${plan.blockers.join(", ")}`);
const headers = {
  Authorization: `Bearer ${process.env.GH_TOKEN}`,
  Accept: "application/vnd.github+json",
};
const envResponse = await fetch(
  "https://api.github.com/repos/ts-76/honoxpress/environments/npm-stage",
  { headers, signal: AbortSignal.timeout(15000) },
);
assert.equal(envResponse.status, 200, "Cannot verify protected environment");
requireEnvironmentReview(await envResponse.json());
const repoResponse = await fetch("https://api.github.com/repos/ts-76/honoxpress", {
  headers,
  signal: AbortSignal.timeout(15000),
});
assert.equal(repoResponse.status, 200);
assert.ok(
  !plan.provenance || (await repoResponse.json()).private === false,
  "npm provenance requires a public repository",
);
const existing = await registryPreflight(plan.package);
assert.ok(
  existing.maintainers?.some((maintainer) => maintainer.name === plan.npmOwner),
  "Approved npm owner is not a listed maintainer",
);
const artifact = await inspectArtifact({ commit, artifactRoot });
const npmCli = process.env.NPM_RELEASE_CLI;
assert.ok(npmCli);
assert.equal(
  execFileSync(process.execPath, [npmCli, "--version"], { encoding: "utf8" }).trim(),
  npmVersion,
);
const result = stageReceipt(
  execFileSync(process.execPath, [npmCli, ...stageArguments(plan, artifact.tarball)], {
    encoding: "utf8",
    timeout: 120000,
  }),
  plan,
);
await writeFile(
  path.resolve("stage-receipt.json"),
  JSON.stringify(
    { ...plan, stage: "submitted; awaiting npm maintainer 2FA", stageId: result.stageId },
    null,
    2,
  ) + "\n",
);
console.log(
  `Stage ${result.stageId} submitted. Review/download it in npm; approval with 2FA is manual.`,
);
