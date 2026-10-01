import type { NotFoundHandler } from 'hono'
const notFound: NotFoundHandler = (c) => c.html(
  <html lang="en"><head><title>404 · HonoX Docs PoC</title></head>
    <body><h1>404 — Page not found</h1><a href="/docs/getting-started">English docs</a>
      <a href="/ja/docs/getting-started">日本語ドキュメント</a></body></html>, 404,
)
export default notFound
