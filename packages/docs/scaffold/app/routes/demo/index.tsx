import { Hono } from "hono";
import { isSSGContext } from "hono/ssg";

const demo = new Hono();
demo.use("*", async (c, next) => {
  if (isSSGContext(c)) throw new Error("The live demo is a Worker route and is not pre-rendered.");
  c.header("Cache-Control", "no-store");
  await next();
});
demo.get("/clock", (c) =>
  c.html(
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Live Worker demo</title>
        <link rel="stylesheet" href="/style.css" />
      </head>
      <body class="demo-document">
        <p class="demo-eyebrow">Live response</p>
        <h1>Worker clock</h1>
        <time>{new Date().toISOString()}</time>
        <p>This timestamp is generated for each request.</p>
      </body>
    </html>,
  ),
);
demo.get("/status", (c) => c.json({ runtime: "Hono Worker", now: Date.now() }));

export default demo;
