import type { Plugin } from "vite";

/** Version-pinned probe, not a supported Void extension point. */
export function ssrCssPilot(): Plugin {
  return {
    name: "honoxpress-void-ssr-css-pilot",
    enforce: "post",
    transform(code, id) {
      if (id !== "\0virtual:void-pages-renderer") return;
      const before = "const appHtml = await jsx(";
      const content = "__html: markup";
      const headCss = "+ assetTags.css + assetTags.preloads";
      if (!code.includes(before) || !code.includes(content) || !code.includes(headCss)) {
        throw new Error("Void renderer changed; review the pilot CSS callback patch.");
      }
      return {
        code:
          `import { resolveCallback, HtmlEscapedCallbackPhase } from 'hono/utils/html';\n` +
          code
            .replace(
              before,
              String.raw`let resolvedMarkup = await resolveCallback(markup, HtmlEscapedCallbackPhase.Stringify, false, {});
  const stylePattern = /<style id="hono-css"(?: nonce="[^"]*")?>[\s\S]*?<\/style>/;
  const componentStyle = resolvedMarkup.match(stylePattern)?.[0];
  if (!componentStyle) throw new Error('Pilot requires one SSR Hono style host.');
  resolvedMarkup = resolvedMarkup.replace(stylePattern, '');
  ` + before,
            )
            .replace(content, "__html: resolvedMarkup")
            .replace(headCss, "+ componentStyle + assetTags.css + assetTags.preloads"),
        map: null,
      };
    },
  };
}
