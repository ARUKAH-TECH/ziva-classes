// Deliberately does no caching — a registered service worker with a fetch
// handler is one of the criteria Chrome/Android checks before offering the
// "install to home screen" prompt, but this app deploys constantly, so
// caching anything here risks serving a stale build. Pure network
// passthrough: installability without any offline/staleness behavior.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // No-op: let the request go to the network as normal.
});
