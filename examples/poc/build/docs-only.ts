import { docsOnlyPlugin as createPlugin } from "honoxpress/build";
import type { SSGReport } from "honoxpress/build";

// Keep the adversarial fixture's public hook small and consumer-owned.
export const docsOnlyPlugin = (report: SSGReport) =>
  createPlugin({ locales: ["en", "ja"], defaultLocale: "en" }, report);
