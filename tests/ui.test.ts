import { Hono } from "hono";
import { test, expect } from "vite-plus/test";
import { LanguageLinks } from "../packages/docs/templates/docs-ui";

test("missing translations render unavailable text and no fabricated link", async () => {
  const app = new Hono().get("/", (c) =>
    c.html(
      LanguageLinks({
        links: [{ locale: "en", href: "/docs/only-en" }, { locale: "ja" }],
        locale: "en",
        labels: { en: "English", ja: "日本語" },
      }),
    ),
  );
  const html = await (await app.request("http://local.test/")).text();
  expect(html).toContain('aria-disabled="true"');
  expect(html).toContain('title="Translation unavailable"');
  expect(html).not.toContain('href="/ja/');
  expect(html).toContain('aria-current="page"');
});
