import honox from "honox/vite";
import { resolve } from "node:path";
import type { Plugin } from "vite-plus";

// Register a concrete app directory because the pinned Vite runtime disables
// HonoX's glob watcher. Keep HonoX's normal add/unlink restart handling.
export default function honoxWithAbsoluteWatch(options: Parameters<typeof honox>[0]) {
  return honox(options).map((plugin) => {
    if (
      !plugin ||
      typeof plugin !== "object" ||
      !("name" in plugin) ||
      plugin.name !== "restart-on-add-unlink"
    )
      return plugin;
    return {
      ...plugin,
      configureServer(server) {
        server.watcher.add(resolve(server.config.root, "app"));
        server.watcher.on("add", () => void server.restart());
        server.watcher.on("unlink", () => void server.restart());
      },
    } satisfies Plugin;
  });
}
