const CACHE_NAME = "shadecode-shell-v6";
const OFFLINE_URL = "/offline.html";
const ASSET_RE = /\.(?:js|css|svg|png|jpg|jpeg|gif|webp|ico|woff2?)$/i;
const NEVER_CACHE_DOCUMENTS = new Set(["/", "/auth", "/auth/login", "/auth/signup", "/auth/register"]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith("shadecode-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

async function cacheResponse(request, response) {
  if (!response || !response.ok) return response;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || request.headers.has("authorization")) return;

  const isRsc = url.searchParams.has("_rsc") || request.headers.get("RSC") === "1";

  if (request.mode === "navigate") {
    if (NEVER_CACHE_DOCUMENTS.has(url.pathname)) {
      event.respondWith(
        fetch(request).catch(() => caches.match(OFFLINE_URL).then((r) => r || Response.error()))
      );
      return;
    }

    event.respondWith((async () => {
      try {
        return await cacheResponse(request, await fetch(request));
      } catch {
        return (await caches.match(request)) || (await caches.match(OFFLINE_URL)) || Response.error();
      }
    })());
    return;
  }

  // Next.js client navigation relies on RSC requests. Keeping the last successful
  // response makes already-visited authenticated screens usable without a network.
  // API responses remain excluded because they are mutable user data.
  if (isRsc) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      try {
        const response = await fetch(request);
        return await cacheResponse(request, response);
      } catch {
        return cached || Response.error();
      }
    })());
    return;
  }

  if (!ASSET_RE.test(url.pathname)) return;
  event.respondWith((async () => {
    const cached = await caches.match(request);
    try {
      const response = await fetch(request);
      return await cacheResponse(request, response);
    } catch {
      return cached || Response.error();
    }
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data?.type === "CLEAR_APP_CACHE") {
    event.waitUntil(caches.delete(CACHE_NAME));
  }
});