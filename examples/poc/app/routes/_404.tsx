import type { NotFoundHandler } from "hono";
import { resolveDocsLocale } from "honoxpress";
import docsSite from "../docs.config";
const notFound: NotFoundHandler = (c) =>
  c.html(
    <html lang={resolveDocsLocale(c.req.path, docsSite)}>
      <head>
        <title>404 · {docsSite.name}</title>
      </head>
      <body>
        <h1>404 — Page not found</h1>
        <a href={docsSite.docsHref ?? "/docs/getting-started"}>Open the documentation</a>
      </body>
    </html>,
    404,
  );
export default notFound;
