import { defineHead } from "void";
import docsConfig from "../../../app/docs.config";
export const head = defineHead(() => ({
  title: `Examples · ${docsConfig.name}`,
  htmlAttrs: { lang: "en" },
}));
