import { defineWranglerConfig } from "wrangler/experimental-config";

export default defineWranglerConfig({
  dev: { ip: "127.0.0.1", port: 8793 },
  types: {
    generate: false,
  },
  assetsDirectory: "./dist/public",
});
