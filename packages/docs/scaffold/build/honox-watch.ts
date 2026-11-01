import honox from "honox/vite";
import { resolve, sep } from "node:path";
import type { Plugin } from "vite-plus";

// Register a concrete app directory because the pinned Vite runtime disables
// HonoX's glob watcher. MDX route restarts are handled by docsMetadataPlugin.
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
        const routeRoot = resolve(server.config.root, "app/routes") + sep;
        const restart = (file: string) => {
          if (file.startsWith(routeRoot) && file.endsWith(".mdx")) return;
          void server.restart();
        };
        server.watcher.on("add", restart);
        server.watcher.on("unlink", restart);
      },
    } satisfies Plugin;
  });
}
