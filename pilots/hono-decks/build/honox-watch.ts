import honox from "honox/vite";
import { resolve } from "node:path";
import type { Plugin } from "vite-plus";

// Compatibility adapter for pinned HonoX 0.1.61 / Vite Plus 1.0.0.
// Vite disables glob watching; register a real absolute app directory instead.
// Keep HonoX's add/unlink restart behavior and its other plugins unchanged.
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
