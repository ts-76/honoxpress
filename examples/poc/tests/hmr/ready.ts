import { readFile } from "node:fs/promises";
import { expect, type Page, type APIRequestContext } from "@playwright/test";

export async function routeStatus(request: APIRequestContext, pathname: string) {
  // Route addition/removal temporarily closes the dev listener during restart.
  return request
    .get(pathname)
    .then((response) => response.status())
    .catch(() => 0);
}

export async function gotoConnected(page: Page, pathname: string) {
  const { id } = JSON.parse(await readFile("dist/evidence/hmr-root.json", "utf8")) as {
    id: string;
  };
  // Only explicit navigation retries here. Assertions after edits never issue
  // a navigation or reload, so a failed automatic update remains a failure.
  await expect(async () => {
    // A single navigation must time out inside the retry budget. Waiting for the
    // full load also waits on demo iframes unrelated to the parent's HMR channel.
    const response = await page.goto(pathname, { waitUntil: "domcontentloaded", timeout: 3000 });
    expect(response?.status()).toBe(200);
    await assertConnected(page, pathname, id);
  }).toPass({ timeout: 15000 });
}

async function assertConnected(page: Page, pathname: string, id: string, sourcePath?: string) {
  const ack = await page.evaluate(
    async ({ route, sourcePath }) => {
      const clientUrl = "/@vite/client";
      const { createHotContext } = await import(clientUrl);
      const hot = createHotContext("/honoxpress-hmr-readiness");
      return new Promise<{
        id: string;
        ready: boolean;
        watching: boolean;
        sourceWatching: boolean;
        diagnostics: unknown;
      }>((resolve, reject) => {
        const deadline = setTimeout(() => {
          hot.off("honoxpress:test-ready-ack", ready);
          reject(new Error("HMR readiness acknowledgement timed out"));
        }, 3000);
        const ready = (data: {
          id: string;
          ready: boolean;
          watching: boolean;
          sourceWatching: boolean;
          diagnostics: unknown;
        }) => {
          clearTimeout(deadline);
          hot.off("honoxpress:test-ready-ack", ready);
          resolve(data);
        };
        hot.on("honoxpress:test-ready-ack", ready);
        hot.send("honoxpress:test-ready", { pathname: route, sourcePath });
      });
    },
    { route: decodeURI(pathname), sourcePath },
  );
  expect(
    ack.sourceWatching,
    "The new island source must be watched before importing it in MDX",
  ).toBe(true);
  expect(ack.ready, "The restarted filesystem watcher must finish its initial scan").toBe(true);
  expect(ack.id, "HMR browser must connect to the disposable app being edited").toBe(id);
  expect(
    ack.watching,
    `The current MDX must be watched before editing: ${JSON.stringify(ack.diagnostics)}`,
  ).toBe(true);
}

/** Check the current document's connection without issuing a reload/navigation. */
export async function waitConnected(page: Page, pathname: string, sourcePath?: string) {
  const { id } = JSON.parse(await readFile("dist/evidence/hmr-root.json", "utf8")) as {
    id: string;
  };
  await expect(() => assertConnected(page, pathname, id, sourcePath)).toPass({ timeout: 15000 });
}
