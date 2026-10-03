import assert from "node:assert/strict";
import { test } from "node:test";
import { dispatchReleaseWorkflows } from "./dispatch-release.mjs";

const pr = {
  number: 99,
  state: "open",
  base: { ref: "main", repo: { full_name: "ts-76/honoxpress" } },
  head: {
    ref: "release-please--branches--main",
    sha: "a".repeat(40),
    repo: { full_name: "ts-76/honoxpress" },
  },
};
function run(pullRequest, { tag = "", pullRequests = [{ number: 99 }] } = {}) {
  const writes = [];
  const invoke = () =>
    dispatchReleaseWorkflows({
      pullRequests,
      tag,
      gh: (args) => {
        if (args[0] === "api") return JSON.stringify(pullRequest);
        writes.push(args);
        return "";
      },
    });
  return { invoke, writes };
}

await test("bot PR CI receives the actual API head SHA and GitHub release prepares the same tag", () => {
  const { invoke, writes } = run(pr, { tag: "v0.1.1" });
  invoke();
  assert.equal(writes.length, 2);
  assert.ok(writes[0].includes(`expected-sha=${pr.head.sha}`));
  assert.equal(writes[0][2], "verify.yml");
  assert.equal(writes[1][2], "npm-stage.yml");
  assert.equal(writes[1].at(-1), "v0.1.1");
});
await test("forks, ordinary branches, merged PRs and mismatched API identities cause zero dispatches", () => {
  for (const invalid of [
    { ...pr, number: 100 },
    { ...pr, state: "closed" },
    { ...pr, base: { ...pr.base, ref: "other" } },
    { ...pr, head: { ...pr.head, ref: "ordinary-feature" } },
    { ...pr, head: { ...pr.head, sha: "bad" } },
    { ...pr, head: { ...pr.head, repo: { full_name: "someone/fork" } } },
  ]) {
    const { invoke, writes } = run(invalid, { tag: "v0.1.1" });
    assert.throws(invoke);
    assert.deepEqual(writes, []);
  }
});
await test("malformed tags cannot partially dispatch even an otherwise valid PR", () => {
  for (const tag of ["main", "v01.1.1", "v0.1.1; publish", "v0.1.1-beta.1"]) {
    const { invoke, writes } = run(pr, { tag });
    assert.throws(invoke);
    assert.deepEqual(writes, []);
  }
});
await test("no release output makes no API calls or dispatches", () => {
  const { invoke, writes } = run(pr, { pullRequests: [] });
  assert.deepEqual(invoke(), []);
  assert.deepEqual(writes, []);
});
