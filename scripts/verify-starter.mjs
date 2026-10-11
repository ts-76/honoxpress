import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import net from "node:net";

async function filesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesBelow(absolute)));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

async function availablePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return address.port;
}

async function smokeDevServer(directory, port, configuration) {
  const docsPath = configuration?.docsHref ?? "/docs/getting-started";
  const defaultLocale = configuration?.defaultLocale ?? "en";
  const child = spawn("pnpm", ["dev"], {
    cwd: directory,
    env: process.env,
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk;
  });
  child.stderr.on("data", (chunk) => {
    output += chunk;
  });
  try {
    const deadline = Date.now() + 45_000;
    let docsResponse;
    while (Date.now() < deadline) {
      if (child.exitCode !== null)
        throw new Error(`starter dev server exited early:\n${output.slice(-6000)}`);
      try {
        docsResponse = await fetch(`http://127.0.0.1:${port}${docsPath}`, {
          signal: AbortSignal.timeout(2_000),
        });
        if (docsResponse.status === 200) break;
      } catch {
        // Vite needs a moment to start and transform the MDX route.
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    assert.equal(
      docsResponse?.status,
      200,
      `starter docs route did not return HTTP 200:\n${output.slice(-6000)}`,
    );
    const docsHtml = await docsResponse.text();
    assert.match(docsHtml, /Getting started/);
    assert.match(docsHtml, /hx-callout/);
    assert.ok(
      docsHtml.includes(`<html lang="${defaultLocale}"`),
      "default document language must follow site config",
    );
    if (configuration) {
      assert.ok(docsHtml.includes(`· ${configuration.name}</title>`));
      assert.ok(docsHtml.includes(configuration.footer));
      assert.ok(!docsHtml.includes("data-hx-theme-switch"), "themeSwitch=false must omit controls");
      assert.ok(docsHtml.includes('href="/custom.css"'));
      for (const locale of ["en", "fr"]) {
        const pathname = `/${locale}${docsPath}`;
        assert.ok(
          docsHtml.includes(`href="${pathname}"`),
          "language links must follow defaultLocale",
        );
        const response = await fetch(`http://127.0.0.1:${port}${pathname}`);
        assert.equal(response.status, 200);
        const translated = await response.text();
        assert.ok(translated.includes(`<html lang="${locale}"`));
        assert.ok(translated.includes(`href="${docsPath}"`));
      }
      const home = await (await fetch(`http://127.0.0.1:${port}/`)).text();
      assert.ok(home.includes(`<html lang="${defaultLocale}"`));
      assert.ok(home.includes(`<h1>${configuration.name}</h1>`));
      assert.ok(home.includes(`href="${docsPath}"`));
      const missing = await fetch(`http://127.0.0.1:${port}/fr/missing`);
      assert.equal(missing.status, 404);
      const missingHtml = await missing.text();
      assert.ok(missingHtml.includes('<html lang="fr"'));
      assert.ok(missingHtml.includes(`href="${docsPath}"`));
      assert.ok(missingHtml.includes(`404 · ${configuration.name}</title>`));
      assert.ok(missingHtml.includes('href="/custom.css"'));
    }
    const demoResponse = await fetch(`http://127.0.0.1:${port}/demo/clock`, {
      signal: AbortSignal.timeout(5_000),
    });
    assert.equal(demoResponse.status, 200, `dynamic demo route failed:\n${output.slice(-6000)}`);
    assert.match(await demoResponse.text(), /Worker clock/);
    return { docsStatus: docsResponse.status, demoStatus: demoResponse.status };
  } finally {
    if (child.pid && child.exitCode === null) {
      if (process.platform === "win32") child.kill("SIGTERM");
      else process.kill(-child.pid, "SIGTERM");
    }
    if (child.exitCode === null) {
      await Promise.race([
        new Promise((resolve) => child.once("close", resolve)),
        new Promise((resolve) => setTimeout(resolve, 5_000)),
      ]);
    }
  }
}

/**
 * Verify the published package's actual bin and starter scaffold in a clean
 * consumer outside the repository.
 */
export async function verifyStarter({ tarball, run, artifacts }) {
  assert.equal(typeof run, "function", "verifyStarter requires the shared command runner");
  await mkdir(artifacts, { recursive: true });
  const absoluteTarball = await realpath(tarball);
  const repository = await realpath(process.cwd());
  const fixture = await mkdtemp(path.join(tmpdir(), "honoxpress-starter-"));
  assert.ok(
    !(await realpath(fixture)).startsWith(repository),
    "starter fixture must be outside the repository",
  );
  const bootstrap = path.join(fixture, "bootstrap");
  const project = path.join(fixture, "project");
  await mkdir(bootstrap);
  await mkdir(project);
  let succeeded = false;
  const evidence = {
    packageInstalledFromTarball: false,
    cliInitStarter: false,
    frozenInstall: false,
    formattingAndLint: false,
    typecheck: false,
    fullBuild: false,
    staticDocsAndComponents: false,
    workerCompilerIsolation: false,
    cloudflareDryRun: false,
    developmentHttp: null,
    siteConfiguration: false,
    temporaryFixtureRemoved: false,
  };

  try {
    await writeFile(
      path.join(bootstrap, "package.json"),
      `${JSON.stringify({ private: true, type: "module", dependencies: { honoxpress: `file:${absoluteTarball}` } }, null, 2)}\n`,
    );
    await run("pnpm", ["install"], bootstrap);
    await run("pnpm", ["exec", "honoxpress", "init", "--starter", "--cwd", project], bootstrap);
    evidence.cliInitStarter = true;

    const packagePath = path.join(project, "package.json");
    const manifest = JSON.parse(await readFile(packagePath, "utf8"));
    const installedPackage = JSON.parse(
      await readFile(path.join(bootstrap, "node_modules/honoxpress/package.json"), "utf8"),
    );
    assert.equal(
      manifest.dependencies?.honoxpress,
      installedPackage.version,
      "CLI must replace the scaffold package placeholder with the installed honoxpress version",
    );
    manifest.dependencies.honoxpress = `file:${absoluteTarball}`;
    await writeFile(packagePath, `${JSON.stringify(manifest, null, 2)}\n`);

    for (const expected of [
      "app/routes/docs/getting-started.mdx",
      "app/routes/demo/index.tsx",
      "app/mdx-components.ts",
      "app/components/docs-layout.tsx",
      "public/style.css",
      "vite.config.ts",
    ])
      await access(path.join(project, expected));

    await run("pnpm", ["install"], project);
    await run("pnpm", ["install", "--frozen-lockfile"], project);
    evidence.frozenInstall = true;
    const projectPackageRoot = await realpath(path.join(project, "node_modules/honoxpress"));
    assert.notEqual(projectPackageRoot, await realpath(path.resolve("packages/docs")));
    assert.ok(
      projectPackageRoot.includes("node_modules"),
      "starter resolved honoxpress through node_modules",
    );
    evidence.packageInstalledFromTarball = true;

    await run("pnpm", ["fmt"], project);
    await run("pnpm", ["check"], project);
    await run("pnpm", ["lint"], project);
    evidence.formattingAndLint = true;
    const scripts = manifest.scripts ?? {};
    if (scripts.typecheck) await run("pnpm", ["typecheck"], project);
    else await run("pnpm", ["exec", "tsc", "--noEmit"], project);
    evidence.typecheck = true;
    await run("pnpm", ["build"], project);
    evidence.fullBuild = true;

    const dist = path.join(project, "dist/public");
    const htmlPaths = (await filesBelow(dist)).filter((file) =>
      /docs[/\\]getting-started(?:[/\\]index)?\.html$/.test(file),
    );
    assert.equal(
      htmlPaths.length,
      1,
      `expected one statically generated getting-started page, found ${htmlPaths.length}`,
    );
    const html = await readFile(htmlPaths[0], "utf8");
    for (const expected of [
      "Getting started",
      "hx-callout",
      "hx-cards",
      "hx-steps",
      "hx-accordion",
      "hx-tabs",
      "code-block",
      "hx-syntax-function",
      "/demo/clock",
    ])
      assert.ok(html.includes(expected), `static docs page is missing ${expected}`);
    assert.ok(
      !(await filesBelow(dist)).some((file) =>
        /[/\\]demo[/\\]clock(?:[/\\]index)?\.html$/.test(file),
      ),
      "dynamic demo was unexpectedly emitted as a static page",
    );
    const workerPath = path.join(project, "dist/worker/index.js");
    const worker = await readFile(workerPath, "utf8");
    assert.match(worker, /Worker clock|demo\/clock/);
    assert.doesNotMatch(
      worker,
      /@mdx-js\/(?:rollup|mdx)|remark-frontmatter|remark-mdx-frontmatter|remarkDocsHeadings|shiki|code-highlight/,
    );
    assert.doesNotMatch(worker, /Write your documentation in MDX/);
    evidence.staticDocsAndComponents = true;
    evidence.workerCompilerIsolation = true;

    await run("pnpm", ["preview:dry-run"], project);
    evidence.cloudflareDryRun = true;

    const port = await availablePort();
    manifest.scripts.dev = (manifest.scripts.dev ?? "").replace(/--port\s+\d+/, `--port ${port}`);
    await writeFile(packagePath, `${JSON.stringify(manifest, null, 2)}\n`);
    evidence.developmentHttp = await smokeDevServer(project, port);
    // Change only site configuration for language/build/layout behavior. Content
    // files remain authored separately and follow the chosen URL convention.
    const siteConfigPath = path.join(project, "app/docs.config.ts");
    const siteConfig = await readFile(siteConfigPath, "utf8");
    await writeFile(
      siteConfigPath,
      siteConfig
        .replace('name: "Your project"', 'name: "Configured documentation"')
        .replace('defaultLocale: "en"', 'defaultLocale: "ja"')
        .replace('docsHref: "/docs/getting-started"', 'docsHref: "/docs/welcome"')
        .replace('stylesheetHref: "/style.css"', 'stylesheetHref: "/custom.css"')
        .replace("themeSwitch: true", "themeSwitch: false")
        .replace('en: "English",', 'en: "English", fr: "Français",')
        .replace('footer: "Documentation maintained by your team."', 'footer: "Configured footer"'),
    );
    await rename(
      path.join(project, "app/routes/docs/getting-started.mdx"),
      path.join(project, "app/routes/docs/welcome.mdx"),
    );
    for (const locale of ["en", "fr"]) {
      await mkdir(path.join(project, `app/routes/${locale}/docs`), { recursive: true });
      await writeFile(
        path.join(project, `app/routes/${locale}/docs/welcome.mdx`),
        `---\ntitle: ${locale} translation\n---\n\n# ${locale} translation\n\nTranslated documentation.\n`,
      );
    }
    await writeFile(
      path.join(project, "public/custom.css"),
      await readFile(path.join(project, "public/style.css")),
    );
    await run("pnpm", ["typecheck"], project);
    await run("pnpm", ["build"], project);
    const configuredHtmlPaths = [];
    for (const [relative, locale] of [
      ["docs", "ja"],
      ["en/docs", "en"],
      ["fr/docs", "fr"],
    ]) {
      const generated = (await filesBelow(dist)).filter(
        (file) => path.relative(dist, file).replaceAll("\\", "/") === `${relative}/welcome.html`,
      );
      assert.equal(generated.length, 1, `missing configured ${locale} SSG page`);
      configuredHtmlPaths.push(generated[0]);
      const generatedHtml = await readFile(generated[0], "utf8");
      assert.ok(generatedHtml.includes(`<html lang="${locale}"`));
      assert.ok(generatedHtml.includes("Configured documentation"));
    }
    await smokeDevServer(project, port, {
      docsHref: "/docs/welcome",
      defaultLocale: "ja",
      name: "Configured documentation",
      footer: "Configured footer",
    });
    evidence.siteConfiguration = true;
    evidence.packageName = manifest.name;
    evidence.packageVersion = installedPackage.version;
    evidence.starterLockfileSha256 = createHash("sha256")
      .update(await readFile(path.join(project, "pnpm-lock.yaml")))
      .digest("hex");
    evidence.buildOutputPages = configuredHtmlPaths.map((file) => path.relative(project, file));
    succeeded = true;
    console.log("Packed HonoXpress starter verification passed");
    return evidence;
  } catch (error) {
    evidence.failure = error.message;
    evidence.retainedFixture = fixture;
    await writeFile(
      path.join(artifacts, "starter-verification-failure.json"),
      `${JSON.stringify(evidence, null, 2)}\n`,
    );
    throw error;
  } finally {
    if (succeeded) {
      await rm(fixture, { recursive: true, force: true });
      await access(fixture).then(
        () => {
          throw new Error("starter fixture cleanup failed");
        },
        () => {},
      );
      evidence.temporaryFixtureRemoved = true;
    }
  }
}
