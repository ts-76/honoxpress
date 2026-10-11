import { createClient } from "honox/client";

// Keep discovery in app source: a prebundled honox/client can cache an old file map.
const islandFiles = Object.fromEntries(
  Object.entries({
    ...import.meta.glob("/app/islands/**/*.tsx"),
    ...import.meta.glob("/app/**/*.island.tsx"),
    ...import.meta.glob("/app/**/$*.tsx"),
  }).filter(([file]) =>
    [/\/[a-zA-Z0-9-]+\.tsx$/, /\/_[a-zA-Z0-9-]+\.island\.tsx$/, /\/\$[a-zA-Z0-9-]+\.tsx$/].some(
      (pattern) => pattern.test(file),
    ),
  ),
);

void createClient({ ISLAND_FILES: islandFiles }).then(() => {
  document.documentElement.dataset.islandsReady = "true";
});
