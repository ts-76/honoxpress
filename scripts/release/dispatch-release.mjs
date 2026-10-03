import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const repository = "ts-76/honoxpress";

export function verificationDispatch(pullRequest) {
  assert.equal(pullRequest.state, "open", "Release PR must still be open");
  assert.equal(pullRequest.base.ref, "main");
  assert.equal(pullRequest.base.repo.full_name, repository);
  assert.equal(pullRequest.head.repo.full_name, repository, "Release PR cannot be a fork");
  assert.match(pullRequest.head.ref, /^release-please--branches--main(?:--[a-zA-Z0-9._-]+)?$/);
  assert.match(pullRequest.head.sha, /^[a-f0-9]{40}$/);
  return [
    "workflow",
    "run",
    "verify.yml",
    "--repo",
    repository,
    "--ref",
    pullRequest.head.ref,
    "-f",
    `expected-sha=${pullRequest.head.sha}`,
  ];
}

export function preparationDispatch(tag) {
  assert.match(tag, /^v(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/);
  return ["workflow", "run", "npm-stage.yml", "--repo", repository, "--ref", tag];
}

export function dispatchReleaseWorkflows({ pullRequests = [], tag = "", gh }) {
  assert.ok(Array.isArray(pullRequests));
  // Validate the entire plan before making any workflow-dispatch writes.
  const commands = pullRequests.map(({ number }) => {
    assert.ok(Number.isSafeInteger(number) && number > 0);
    const pullRequest = JSON.parse(gh(["api", `repos/${repository}/pulls/${number}`]));
    assert.equal(pullRequest.number, number);
    return verificationDispatch(pullRequest);
  });
  if (tag) commands.push(preparationDispatch(tag));
  for (const command of commands) gh(command);
  return commands;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const commands = dispatchReleaseWorkflows({
    pullRequests: JSON.parse(process.env.RELEASE_PULL_REQUESTS || "[]"),
    tag: process.env.RELEASE_TAG || "",
    gh: (args) => execFileSync("gh", args, { encoding: "utf8", timeout: 30000 }),
  });
  console.log(`Requested ${commands.length} exact-source verification/preparation workflow(s).`);
}
