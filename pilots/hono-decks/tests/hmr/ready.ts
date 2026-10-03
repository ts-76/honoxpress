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
    const ack = await page.evaluate(async (route) => {
      const clientUrl = "/@vite/client";
      const { createHotContext } = await import(clientUrl);
      const hot = createHotContext("/honoxpress-hmr-readiness");
      return new Promise<{ id: string; watching: boolean }>((resolve, reject) => {
        const deadline = setTimeout(() => {
          hot.off("honoxpress:test-ready-ack", ready);
          reject(new Error("HMR readiness acknowledgement timed out"));
        }, 3000);
        const ready = (data: { id: string; watching: boolean }) => {
          clearTimeout(deadline);
          hot.off("honoxpress:test-ready-ack", ready);
          resolve(data);
        };
        hot.on("honoxpress:test-ready-ack", ready);
        hot.send("honoxpress:test-ready", { pathname: route });
      });
    }, decodeURI(pathname));
    expect(ack.id, "HMR browser must connect to the disposable app being edited").toBe(id);
    expect(ack.watching, "The current MDX must be watched before editing").toBe(true);
  }).toPass({ timeout: 15000 });
}
