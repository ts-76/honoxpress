import { createClient } from "honox/client";
void createClient().then(() => {
  document.documentElement.dataset.islandsReady = "true";
});
