import { html } from "hono/html";

/** Pilot only: preserve SSR callbacks and synchronous DOM class serialization. */
export function componentClass(strings: TemplateStringsArray, ...values: unknown[]) {
  if (import.meta.env.SSR) return html(strings, ...values);
  // Hono's css value has a DOM-aware toString which registers global rules.
  // hono/html wraps it in a Promise whose toString loses that behavior.
  return {
    toString: () =>
      strings.reduce(
        (result, part, index) =>
          result + part + (index < values.length ? String(values[index]) : ""),
        "",
      ),
  } as unknown as ReturnType<typeof html>;
}
