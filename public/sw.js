const CACHE_NAME = "shadecode-assets-v3";
const ASSET_RE = /\.(?:js|css|svg|png|jpg|jpeg|gif|webp|ico|woff2?)$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => key === CACHE_NAME ? Promise.resolve() : caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never intercept documents, RSC requests, APIs, or navigation. Next.js
  // owns all application boot/navigation state. The worker only caches safe
  // immutable-ish static assets.
  if (request.mode === "navigate" || url.pathname.startsWith("/api/") || url.searchParams.has("_rsc")) return;
  if (!ASSET_RE.test(url.pathname)) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((response) => {
        if (response.ok && response.type === "basic") {
          event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone())));
        }
        return response;
      });
      return network.catch(() => cached || Response.error());
    })
  );
});
