import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// WCAG 2.2 relative luminance, and the Oklab transforms described in CSS Color 4.
// https://www.w3.org/TR/WCAG22/#dfn-relative-luminance
// https://www.w3.org/TR/css-color-4/#ok-lab
const source = await readFile(
  new URL("../packages/docs/templates/tokens.css", import.meta.url),
  "utf8",
);
const [light, rest] = source.split("@media (prefers-color-scheme: dark)");
const [dark] = rest.split("@media (forced-colors: active)");
const colors = (css) =>
  Object.fromEntries(
    [...css.matchAll(/--docs-([a-z-]+): (#[\da-f]{6});/g)].map((m) => [m[1], m[2]]),
  );
const rgb = (hex) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255);
const linear = (value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
const luminance = (color) => {
  const [r, g, b] = color.map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};
const round = (value, precision = 4) => Number(value.toFixed(precision));
const metrics = (hex) => {
  const [r, g, b] = rgb(hex).map(linear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bAxis = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const chroma = Math.hypot(a, bAxis);
  return {
    hex,
    lightness: round(L),
    chroma: round(chroma),
    hue: chroma < 0.00001 ? null : round(((Math.atan2(bAxis, a) * 180) / Math.PI + 360) % 360, 2),
    relativeLuminance: round(luminance(rgb(hex))),
  };
};

const report = {};
for (const [name, palette] of Object.entries({ light: colors(light), dark: colors(dark) })) {
  const checks = [];
  const check = (label, foreground, background, minimum = 4.5) => {
    const ratio = contrast(foreground, background);
    assert.ok(ratio >= minimum, `${name} ${label}: ${ratio.toFixed(2)} < ${minimum}`);
    checks.push({ label, ratio: round(ratio, 2), minimum });
  };
  for (const surface of ["bg", "panel", "surface"]) {
    for (const foreground of ["text", "muted", "accent", "danger"]) {
      check(`${foreground} on ${surface}`, rgb(palette[foreground]), rgb(palette[surface]));
    }
    check(`focus on ${surface}`, rgb(palette.accent), rgb(palette[surface]), 3);
  }
  check("selected text on tint", rgb(palette.accent), rgb(palette.tint));
  check("focus on tint", rgb(palette.accent), rgb(palette.tint), 3);
  for (const semantic of ["info", "tip", "warning", "danger"]) {
    // The standard Callout uses color-mix(in srgb, semantic 4%, panel).
    const fill = rgb(palette[semantic]).map(
      (channel, i) => channel * 0.04 + rgb(palette.panel)[i] * 0.96,
    );
    check(`callout text on ${semantic} fill`, rgb(palette.text), fill);
  }
  report[name] = {
    colors: Object.fromEntries(Object.entries(palette).map(([role, hex]) => [role, metrics(hex)])),
    checks,
    minimumTextContrast: round(
      Math.min(...checks.filter((c) => c.minimum === 4.5).map((c) => c.ratio)),
      2,
    ),
  };
}
console.log(
  JSON.stringify(
    { basis: "Shipped sRGB tokens; not a complete accessibility audit", ...report },
    null,
    2,
  ),
);
