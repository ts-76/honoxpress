import { docsOnlyPlugin as createDocsOnlyPlugin } from "honoxpress/build";
import docsSite from "../app/docs.config";

const locales = Object.keys(docsSite.localeLabels);

export const docsOnlyPlugin = () => createDocsOnlyPlugin({ locales, defaultLocale: "en" });
