import { docsOnlyPlugin as createPlugin } from "@honox-docs-poc/docs/build";
import type { SSGReport } from "@honox-docs-poc/docs/build";

// Keep the adversarial fixture's public hook small and consumer-owned.
export const docsOnlyPlugin = (report: SSGReport) =>
  createPlugin({ locales: ["en", "ja"], defaultLocale: "en" }, report);
