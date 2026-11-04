import { defineDecksConfig } from "hono-decks";

// Temporary until hono-decks includes transparent idle mobile controls.
// Attribute selectors also override the scoped embedded viewer defaults.
const mobileNavigationStyle = `
[data-hono-decks-viewer] .hono-decks-mobile-navigation,
[data-hono-decks-viewer][data-hono-decks-embed] .hono-decks-mobile-navigation {
  background: transparent;
  color: transparent;
}
[data-hono-decks-viewer] .hono-decks-mobile-navigation:focus-visible,
[data-hono-decks-viewer][data-hono-decks-embed] .hono-decks-mobile-navigation:focus-visible {
  background: rgba(15, 23, 42, .28);
  color: #eef2ff;
  opacity: 1;
}
[data-hono-decks-viewer] .hono-decks-mobile-navigation:active,
[data-hono-decks-viewer][data-hono-decks-embed] .hono-decks-mobile-navigation:active {
  background: rgba(15, 23, 42, .28);
  color: #eef2ff;
  opacity: 1;
}
@media (hover: hover) and (pointer: fine) {
  [data-hono-decks-viewer] .hono-decks-mobile-navigation:hover,
  [data-hono-decks-viewer][data-hono-decks-embed] .hono-decks-mobile-navigation:hover {
    background: rgba(15, 23, 42, .28);
    color: #eef2ff;
    opacity: 1;
  }
}
`;

export default defineDecksConfig({
  mountPath: "/slides",
  build: { root: "decks", outDir: "lib/generated" },
  router: {
    viewer: { style: mobileNavigationStyle },
    embed: { viewer: { style: mobileNavigationStyle }, frameAncestors: ["'self'", "https://hono-decks.com"], robots: false },
    pages: { index: false, viewer: true, print: false, presentation: false, presenter: false },
    presenter: false,
  },
});
