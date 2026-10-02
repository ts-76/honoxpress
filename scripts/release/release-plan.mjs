import { execFileSync } from "node:child_process";
import { mkdir, writeFile, appendFile } from "node:fs/promises";
import { createPlan } from "./release-gate.mjs";

const commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const plan = await createPlan({
  commit,
  ref: process.env.GITHUB_REF || process.env.RELEASE_REF || "local-preparation",
});
await mkdir("artifacts/release", { recursive: true });
await writeFile("artifacts/release/plan.json", JSON.stringify(plan, null, 2) + "\n");
if (process.env.GITHUB_OUTPUT)
  await appendFile(process.env.GITHUB_OUTPUT, `ready=${plan.status === "ready"}\n`);
console.log(JSON.stringify(plan, null, 2));
