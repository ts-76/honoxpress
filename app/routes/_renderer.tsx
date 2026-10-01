import { jsxRenderer } from 'hono/jsx-renderer'

// HonoX's Script/HasIslands detector does not follow raw MDX imports in 0.1.61.
// The two docs routes always hydrate, so resolve the client entry explicitly.
const manifests = import.meta.glob<{ default: Record<string, { file: string }> }>(
  '/dist/public/.vite/manifest.json', { eager: true },
)
const manifest = Object.values(manifests)[0]?.default

export default jsxRenderer(({ children, frontmatter }, c) => {
  const ja = c.req.path.startsWith('/ja/')
  const docs = /^\/(?:ja\/)?docs\//.test(c.req.path)
  const production = import.meta.env.PROD || import.meta.env.MODE === 'ssg'
  const clientSrc = production ? `/${manifest?.['app/client.ts']?.file ?? ''}` : '/app/client.ts'
  if (docs && production && !manifest?.['app/client.ts']) throw new Error('Build client before SSG')
  return <html lang={ja ? 'ja' : 'en'}>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{frontmatter?.title ?? 'HonoX Docs PoC'}</title>
      {frontmatter && <meta name="description" content={frontmatter.description} />}
      <link rel="stylesheet" href="/style.css" />
      {docs && <script type="module" src={clientSrc} />}
    </head>
    <body>
      <header><a href="/">HonoX Docs PoC</a><nav aria-label="Languages">
        <a href="/docs/getting-started" lang="en">English</a>
        <a href="/ja/docs/getting-started" lang="ja">日本語</a>
      </nav></header>
      <main>{children}</main>
      <footer>Hono JSX · local MDX · static docs + dynamic Worker</footer>
    </body>
  </html>
})
