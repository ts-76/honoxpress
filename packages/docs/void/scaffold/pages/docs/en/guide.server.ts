import { defineHead } from "void";
import docsConfig from "../../../app/docs.config";
export const head = defineHead(() => ({
  title: `Guide · ${docsConfig.name}`,
  htmlAttrs: { lang: "en" },
}));
