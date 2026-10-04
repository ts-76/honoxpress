import type { NotFoundHandler } from "hono";
import docsSite from "../docs.config";

const notFound: NotFoundHandler = (c) =>
  c.html(
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>404 · {docsSite.name}</title>
        <link rel="stylesheet" href={docsSite.stylesheetHref ?? "/style.css"} />
      </head>
      <body>
        <main class="home-main prose">
          <h1>Page not found</h1>
          <p>The page may have moved or the URL may be incorrect.</p>
          <a href="/docs/getting-started">Open the documentation</a>
        </main>
      </body>
    </html>,
    404,
  );

export default notFound;
