import { docsOnlyPlugin as createPlugin } from "honoxpress/build";
import type { SSGReport } from "honoxpress/build";
import docsSite from "../app/docs.config";

// Keep the adversarial fixture's public hook small and consumer-owned.
export const docsOnlyPlugin = (report: SSGReport) =>
  createPlugin(
    {
      locales: Object.keys(docsSite.localeLabels),
      defaultLocale: docsSite.defaultLocale,
    },
    report,
  );
