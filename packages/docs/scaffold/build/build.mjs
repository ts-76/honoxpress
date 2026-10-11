import { rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

// One pipeline owns dist. Later stages preserve the assets and HTML already emitted.
await rm("dist", { recursive: true, force: true });
for (const mode of ["client", "ssg", "worker"]) {
  const result = spawnSync(resolve("node_modules/.bin/vp"), ["build", "--mode", mode], {
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "production" },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
