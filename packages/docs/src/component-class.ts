import { html } from "hono/html";
import type { css } from "hono/css";

/**
 * Compose stable component classes with Hono CSS registration. Awaiting the
 * value retains HTML callbacks for SSR; DOM stringification calls each CSS
 * handle's own toString so it registers rules in the browser's style host.
 * Use only for class attributes, with CSS handles and authored class strings.
 */
export function componentClass(
  strings: TemplateStringsArray,
  ...values: (string | number | ReturnType<typeof css>)[]
) {
  const result = Promise.resolve(html(strings, ...values));
  result.toString = () =>
    strings.reduce(
      // oxlint-disable-next-line typescript/no-base-to-string -- Hono CSS handles intentionally register DOM rules in their custom toString.
      (text, part, index) => text + part + (index < values.length ? String(values[index]) : ""),
      "",
    );
  return result;
}
