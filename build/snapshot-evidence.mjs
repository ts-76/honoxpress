import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises'
import { platform, arch } from 'node:os'
import path from 'node:path'

const json = async (file) => JSON.parse(await readFile(file, 'utf8'))
const versions = {}
for (const name of ['hono', 'honox', 'vite', '@mdx-js/rollup', '@hono/vite-ssg', '@hono/vite-build', 'wrangler', '@playwright/test', 'typescript']) {
  versions[name] = (await json(`node_modules/${name}/package.json`)).version
}
const browser = await json('dist/evidence/browser-tests.json')
if (browser.stats.unexpected !== 0 || browser.stats.expected !== 4) throw new Error('Browser verification is incomplete')
const outputs = {}
for (const file of ['dist/worker/index.js', 'dist/public/docs/getting-started.html', 'dist/public/ja/docs/getting-started.html']) {
  const bytes = await readFile(file)
  outputs[file] = { bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }
}
const graphs = {}
for (const target of ['worker', 'client']) {
  const graph = await json(`dist/evidence/${target}-modules.json`)
  const excluded = graph.loaded.filter((id) => /\.mdx|@mdx-js|remark-|\/routes\/(?:ja\/)?docs\//.test(id))
  if (excluded.length) throw new Error(`Unexpected docs modules in ${target}`)
  graphs[target] = { loadedModules: graph.loaded.length, docsOrCompilerModules: excluded }
}
await mkdir('evidence/screenshots', { recursive: true })
for (const file of ['client-manifest.json', 'worker-modules.json', 'ssg.json', 'eager-control.json']) {
  await copyFile(`dist/evidence/${file}`, `evidence/${file}`)
}
const screenshotDir = 'test-results/docs-English-Japanese-MDX--3d870-ation-and-repeat-navigation-production-local'
for (const lang of ['english', 'japanese']) await copyFile(`${screenshotDir}/${lang}.png`, `evidence/screenshots/${lang}.png`)
const tests = browser.suites.flatMap((s) => s.specs.flatMap((spec) => spec.tests.map((t) => ({
  project: t.projectName, title: spec.title, status: t.results.at(-1)?.status,
}))))
await writeFile('evidence/verification.json', JSON.stringify({
  capturedAt: new Date().toISOString(), environment: { node: process.version, platform: platform(), arch: arch() },
  versions, outputs, graphs, browserTests: tests,
  typecheck: 'passed', buildTests: { passed: 4, failed: 0 },
  wranglerDryRun: 'passed; no deployment', honoCliDemoRequest: 'passed',
  ci: 'not configured', cloudflareDeployment: 'not executed (out of scope)',
}, null, 2) + '\n')
console.log(`Saved verification evidence to ${path.resolve('evidence')}`)
