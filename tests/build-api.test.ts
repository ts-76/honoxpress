import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { EventEmitter } from "node:events";
import { test, expect, vi } from "vite-plus/test";
import type { ViteDevServer } from "vite-plus";
import { docsMetadataPlugin, docsOnlyPlugin, remarkDocsHeadings } from "honoxpress/build";
import { resolveClientScript } from "honoxpress";

test("docs hook excludes dynamic routes before execution and supports caller locale prefixes", () => {
  const report = { accepted: [] as string[], skipped: [] as string[] };
  const plugin = docsOnlyPlugin({ locales: ["en", "fr"], defaultLocale: "en" }, report);
  for (const path of [
    "/",
    "/demo/:name",
    "/docs/:slug",
    "/ja/docs/a",
    "/docs-other/a",
    "/fr/docs/*",
  ])
    expect(plugin.beforeRequestHook?.(new Request(`https://local.test${path}`))).toBe(false);
  for (const path of ["/docs", "/docs/nested/page", "/fr/docs/nested/page"])
    expect(plugin.beforeRequestHook?.(new Request(`https://local.test${path}`))).toBeInstanceOf(
      Request,
    );
  expect(report.accepted).toEqual(["/docs", "/docs/nested/page", "/fr/docs/nested/page"]);
});
test("TOC anchors preserve Unicode and avoid collisions with repeated and suffixed headings", () => {
  const heading = (value: string) => ({
    type: "heading",
    depth: 2,
    children: [{ type: "text", value }],
  });
  const root = {
    type: "root",
    children: [heading("Hello"), heading("Hello"), heading("Hello-1"), heading("日本語の見出し")],
  };
  remarkDocsHeadings()(root);
  expect(
    root.children
      .slice(0, 4)
      .map((node) => (node as { data?: { hProperties: { id: string } } }).data?.hProperties.id),
  ).toEqual(["hello", "hello-1", "hello-1-1", "日本語の見出し"]);
  expect(root.children.at(-1)?.type).toBe("mdxjsEsm");
});
test("expression-only headings fail instead of inventing misleading TOC text", () => {
  expect(() =>
    remarkDocsHeadings()({ type: "root", children: [{ type: "heading", depth: 2, children: [] }] }),
  ).toThrow("static text");
});
test("client manifest helper rejects missing or unsafe assets", () => {
  expect(
    resolveClientScript({ "app/client.ts": { file: "static/client-test.js" } }, "app/client.ts"),
  ).toBe("/static/client-test.js");
  for (const file of ["/absolute.js", "../escape.js", "https://remote/script.js", "static/a.css"])
    expect(() => resolveClientScript({ entry: { file } }, "entry")).toThrow();
  expect(() => resolveClientScript(undefined, "entry")).toThrow("Build client before SSG");
});

test("metadata discovery follows HonoX exclusions and Worker never discovers files", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "honoxpress-discovery-"));
  try {
    const routes = [
      "docs/visible.mdx",
      "docs/_partial.mdx",
      "docs/-hidden.mdx",
      "docs/$loader.mdx",
      "docs/-partials/example.mdx",
      "docs/.hidden/example.mdx",
      "docs/_group/visible.mdx",
    ];
    for (const route of routes) {
      const file = path.join(root, "app/routes", route);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, "uncompiled fixture");
    }
    const load = async (worker: boolean) => {
      const plugin = docsMetadataPlugin({ locales: ["en"], defaultLocale: "en", worker });
      const resolved = plugin.configResolved as (config: { root: string }) => void;
      resolved({ root });
      const hook = plugin.load as (
        this: { addWatchFile(file: string): void },
        id: string,
      ) => Promise<string>;
      return hook.call(
        {
          addWatchFile() {
            if (worker) throw new Error("Worker touched routes");
          },
        },
        "\0virtual:honoxpress/catalog",
      );
    };
    const source = await load(false);
    expect(source).toContain("docs/visible.mdx");
    expect(source).toContain("docs/_group/visible.mdx");
    for (const route of routes.slice(1, 6)) expect(source).not.toContain(route);
    expect(await load(true)).not.toContain(".mdx");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("route restarts suppress eager-router reloads and saves that overlap the restart", async () => {
  const plugin = docsMetadataPlugin({ locales: ["en"], defaultLocale: "en", worker: false });
  const configure = plugin.configResolved as (config: { root: string }) => void;
  configure({ root: "/fixture" });
  const hook = plugin.hotUpdate;
  if (!hook || typeof hook === "function") throw new Error("Expected the ordered update hook");
  expect(hook.order).toBe("post");
  const update = hook.handler;
  const watcher = new EventEmitter();
  const deferred = <T>() => {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((done) => {
      resolve = done;
    });
    return { promise, resolve };
  };
  const restarting = deferred<void>();
  const reading = deferred<string>();
  const send = vi.fn();
  const invalidateModule = vi.fn();
  const module = {};
  const server = {
    watcher,
    restart: vi.fn(() => restarting.promise),
    ws: { send },
  } as unknown as ViteDevServer;
  const configureServer = plugin.configureServer as (server: ViteDevServer) => void;
  configureServer(server);
  const context = (name: string) =>
    ({
      environment: {
        name,
        moduleGraph: { getModuleById: () => module, invalidateModule },
      },
    }) as unknown as ThisParameterType<typeof update>;
  const change = (type: "create" | "update" | "delete", read = async () => "MDX") => ({
    type,
    file: "/fixture/app/routes/docs/page.mdx",
    server,
    read,
    timestamp: 0,
    modules: [],
  });
  // Even without a save, import-glob's eager router would send an SSR reload
  // for create/delete. Returning no modules prevents that premature reload.
  for (const type of ["create", "delete"] as const)
    for (const environment of ["client", "ssr"])
      expect(await update.call(context(environment), change(type))).toEqual([]);
  expect(send).not.toHaveBeenCalled();
  // A save can start reading before the add event begins its restart.
  const save = update.call(
    context("client"),
    change("update", () => reading.promise),
  );
  watcher.emit("add", "/fixture/app/routes/docs/new.mdx");
  reading.resolve("MDX");
  expect(await save).toEqual([]);
  expect(send).not.toHaveBeenCalled();
  restarting.resolve();
  await restarting.promise;
  // A restart can also finish before a save's asynchronous read finishes.
  const lateRead = deferred<string>();
  const lateSave = update.call(
    context("client"),
    change("update", () => lateRead.promise),
  );
  watcher.emit("unlink", "/fixture/app/routes/docs/new.mdx");
  await restarting.promise;
  lateRead.resolve("MDX");
  expect(await lateSave).toEqual([]);
  expect(send).not.toHaveBeenCalled();
  // Ordinary saves still invalidate both catalogs and send just one reload.
  for (const environment of ["client", "ssr"])
    expect(await update.call(context(environment), change("update"))).toEqual([]);
  expect(invalidateModule).toHaveBeenCalledTimes(2);
  expect(send).toHaveBeenCalledExactlyOnceWith({ type: "full-reload" });
});
