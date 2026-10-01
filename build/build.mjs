import { copyFile, rm } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'

// Only this pipeline owns dist. Later stages preserve earlier assets/HTML.
await rm('dist', { recursive: true, force: true })
for (const mode of ['client', 'ssg', 'worker']) {
  const result = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--mode', mode], { stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
  if (mode === 'client') await copyFile('dist/public/.vite/manifest.json', 'dist/evidence/client-manifest.json')
}
// Build metadata remains local in evidence, never a public static asset.
await rm('dist/public/.vite', { recursive: true, force: true })
