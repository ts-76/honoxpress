import { decks } from "../../decks";
import { Hono } from "hono";
import { isSSGContext } from "hono/ssg";

const demo = new Hono();
demo.use("*", async (c, next) => {
  // This is an execution guard, not disableSSG (which runs after the request).
  if (isSSGContext(c)) throw new Error("SSG must never execute /demo");
  c.header("Cache-Control", "no-store");
  c.header("X-Demo-Request", crypto.randomUUID());
  await next();
});
demo.get("/clock", (c) =>
  c.html(
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Dynamic Worker clock</title>
        <link rel="stylesheet" href="/style.css" />
      </head>
      <body class="demo-document">
        <p class="demo-eyebrow">Live response</p>
        <h1>Dynamic Worker clock</h1>
        <time data-testid="demo-time">{new Date().toISOString()}</time>
        <p>Generated for each request by Hono.</p>
      </body>
    </html>,
  ),
);
demo.get("/status", (c) => c.json({ runtime: "Hono Worker", now: Date.now() }));
demo.route("/", decks.router());
export default demo;
