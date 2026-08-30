const CACHE_NAME = "shadecode-shell-v5";
const OFFLINE_URL = "/offline.html";
const ASSET_RE = /\.(?:js|css|svg|png|jpg|jpeg|gif|webp|ico|woff2?)$/i;
const NEVER_CACHE_DOCUMENTS = new Set(["/", "/auth", "/auth/login", "/auth/signup", "/auth/register"]);

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("shadecode-") && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache API/auth/RSC responses. They are user-specific and can become
  // stale enough to break authentication or application navigation.
  if (url.pathname.startsWith("/api/") || request.headers.has("authorization") || url.searchParams.has("_rsc")) return;

  if (request.mode === "navigate") {
    // The landing and auth documents must never become an offline snapshot.
    // Authenticated users should not be sent back to a stale marketing page.
    if (NEVER_CACHE_DOCUMENTS.has(url.pathname)) {
      event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL).then((r) => r || Response.error())));
      return;
    }

    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        return (await caches.match(request)) || (await caches.match(OFFLINE_URL)) || Response.error();
      }
    })());
    return;
  }

  if (!ASSET_RE.test(url.pathname)) return;
  event.respondWith((async () => {
    const cached = await caches.match(request);
    try {
      const response = await fetch(request);
      if (response.ok && response.type === "basic") {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    } catch {
      return cached || Response.error();
    }
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});