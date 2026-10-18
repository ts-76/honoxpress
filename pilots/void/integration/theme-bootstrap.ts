import { themeInitializer } from "../.generated/theme-initializer";

// Keep the published early initialization, storage and system-mode behavior.
// A document event lets a persistent Void layout resync newly rendered selects.
const marker = 'document.addEventListener("DOMContentLoaded", apply, { once: true });';
if (!themeInitializer.includes(marker))
  throw new Error("Published theme lifecycle changed; review the pilot adapter.");
export const themeBootstrap =
  process.env.HX_BASELINE === "1" || process.env.HX_CANDIDATE === "1"
    ? themeInitializer
    : themeInitializer.replace(
        marker,
        marker + '\n  document.addEventListener("hx-pilot:render", apply);',
      );
