import { cp, mkdir, mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
const source = resolve(process.argv[2] ?? ".ci-void-plugin");
const expectedCommit = "743badf8a4153aadf3fbb8a9ab78e6563d3ef555";
const actualCommit = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: source,
  encoding: "utf8",
}).trim();
if (actualCommit !== expectedCommit)
  throw new Error(`Expected adapter ${expectedCommit}, found ${actualCommit}`);
execFileSync("git", ["diff", "--quiet", "HEAD"], { cwd: source });
const destination = resolve("artifacts/void-standard");
await mkdir(destination, { recursive: true });
const candidate = await mkdtemp(join(tmpdir(), "honoxpress-void-dependency-"));
try {
  await cp(join(source, "packages/hono-pages"), candidate, { recursive: true });
  const manifest = JSON.parse(await readFile(join(candidate, "package.json"), "utf8"));
  // This is a candidate tarball, never a claim that the future version is published.
  manifest.version = "0.3.0";
  manifest.private = false;
  await writeFile(join(candidate, "package.json"), JSON.stringify(manifest, null, 2) + "\n");
  const packed = JSON.parse(
    execFileSync(
      "npm",
      ["pack", candidate, "--ignore-scripts", "--json", "--pack-destination", destination],
      { encoding: "utf8" },
    ),
  );
  console.log(join(destination, packed[0].filename));
} finally {
  await rm(candidate, { recursive: true, force: true });
}
