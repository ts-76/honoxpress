import { defineHead } from "void";
import docsConfig from "../../../app/docs.config";
export const head = defineHead(() => ({
  title: `ガイド · ${docsConfig.name}`,
  htmlAttrs: { lang: "ja" },
}));
