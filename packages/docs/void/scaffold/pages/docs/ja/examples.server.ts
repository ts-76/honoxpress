import { defineHead } from "void";
import docsConfig from "../../../app/docs.config";
export const head = defineHead(() => ({
  title: `コード例 · ${docsConfig.name}`,
  htmlAttrs: { lang: "ja" },
}));
