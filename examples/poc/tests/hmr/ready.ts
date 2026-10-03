import type { Page, APIRequestContext } from "@playwright/test";

export async function routeStatus(request: APIRequestContext, pathname: string) {
  // Route addition/removal temporarily closes the dev listener during restart.
  return request
    .get(pathname)
    .then((response) => response.status())
    .catch(() => 0);
}

export async function gotoConnected(page: Page, pathname: string) {
  await page.goto(pathname);
  await page.evaluate(async () => {
    const clientUrl = "/@vite/client";
    const { createHotContext } = await import(clientUrl);
    const hot = createHotContext("/honoxpress-hmr-readiness");
    await new Promise<void>((resolve) => {
      const ready = () => {
        hot.off("honoxpress:test-ready-ack", ready);
        resolve();
      };
      hot.on("honoxpress:test-ready-ack", ready);
      hot.send("honoxpress:test-ready", {});
    });
  });
}
