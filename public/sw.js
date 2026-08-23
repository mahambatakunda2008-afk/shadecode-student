const CACHE_NAME = "shadecode-shell-v2";
const APP_SHELL = ["/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Never cache HTML/navigation responses. Authenticated pages contain
  // account-specific RSC/HTML and must always come from the current server
  // session. This also prevents a stale dashboard from becoming the app home.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => new Response(
        "<!doctype html><html><body><h1>Shadecode Student</h1><p>You are offline. Reconnect to continue.</p></body></html>",
        { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 503 }
      ))
    );
    return;
  }

  // Keep static assets network-first with a cache fallback. Dynamic RSC/data
  // requests are deliberately not cached here because Next.js may encode user
  // and route state in them.
  const isStaticAsset = /\.(?:js|css|svg|png|jpg|jpeg|gif|webp|ico|woff2?)$/i.test(url.pathname);
  if (!isStaticAsset) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
      return network.catch(() => cached || Response.error());
    })
  );
});
