const CACHE_NAME = "shadecode-v2";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Only cache static assets, never pages or API calls
  const url = new URL(event.request.url);
  
  if (
    event.request.method !== "GET" ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/") ||
    url.origin !== location.origin
  ) {
    return;
  }

  // Network first for everything
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
