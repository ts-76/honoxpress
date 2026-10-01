import { createClient } from 'honox/client'
createClient().then(() => {
  document.documentElement.dataset.islandsReady = 'true'
})
