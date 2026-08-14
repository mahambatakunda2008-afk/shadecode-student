// Shadecode Student Service Worker
// Offline-first app shell + low-bandwidth caching.

const CACHE_VERSION = "v2";
const STATIC_CACHE_NAME = `shadecode-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE_NAME = `shadecode-dynamic-${CACHE_VERSION}`;
const LOW_BANDWIDTH_CACHE_NAME = `shadecode-low-bandwidth-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  "/",
  "/offline",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

const CACHE_ROUTES = [
  "/dashboard",
  "/curriculum",
  "/learn",
  "/tasks",
  "/timetable",
  "/offline",
];

const API_CACHE_ROUTES = [
  "/api/tasks",
  "/api/learn",
  "/api/timetable",
  "/api/achievements",
];

let lowBandwidthMode = false;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => ![
            STATIC_CACHE_NAME,
            DYNAMIC_CACHE_NAME,
            LOW_BANDWIDTH_CACHE_NAME,
          ].includes(cacheName))
          .map((cacheName) => caches.delete(cacheName))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SET_LOW_BANDWIDTH_MODE") {
    lowBandwidthMode = Boolean(event.data.enabled);
  }

  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isLowBandwidthRequest = request.headers.get("X-Low-Bandwidth") === "true";

  // A document navigation should never become a dead-end offline error.
  // Serve the dedicated offline hub when the requested page is unavailable.
  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (CACHE_ROUTES.some((route) => url.pathname.startsWith(route))) {
    event.respondWith(networkFirstStrategy(request, isLowBandwidthRequest));
    return;
  }

  if (API_CACHE_ROUTES.some((route) => url.pathname.startsWith(route))) {
    event.respondWith(staleWhileRevalidateStrategy(request));
    return;
  }

  if (STATIC_ASSETS.some((asset) => url.pathname === asset)) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  event.respondWith(networkFirstStrategy(request, isLowBandwidthRequest));
});

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const dynamic = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedPage = await dynamic.match(request);
    if (cachedPage) return cachedPage;

    const staticCache = await caches.open(STATIC_CACHE_NAME);
    const offlinePage = await staticCache.match("/offline");
    if (offlinePage) return offlinePage;

    throw new Error("Offline and no cached app shell is available");
  }
}

async function networkFirstStrategy(request, isLowBandwidth = false) {
  const cacheName = isLowBandwidth || lowBandwidthMode
    ? LOW_BANDWIDTH_CACHE_NAME
    : DYNAMIC_CACHE_NAME;
  const cache = await caches.open(cacheName);

  if (isLowBandwidth || lowBandwidthMode) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const contentLength = networkResponse.headers.get("content-length");
      const isSmall = !contentLength || Number.parseInt(contentLength, 10) < 100 * 1024;
      if (!lowBandwidthMode || isSmall) {
        await cache.put(request, networkResponse.clone());
      }
    }
    return networkResponse;
  } catch {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) return cachedResponse;
    throw new Error("Network request failed and no cached response exists");
  }
}

async function cacheFirstStrategy(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  if (cachedResponse) return cachedResponse;

  const networkResponse = await fetch(request);
  if (networkResponse.ok) await cache.put(request, networkResponse.clone());
  return networkResponse;
}

async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  const networkPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        return cache.put(request, networkResponse.clone()).then(() => networkResponse);
      }
      return networkResponse;
    })
    .catch(() => null);

  if (cachedResponse) return cachedResponse;
  const networkResponse = await networkPromise;
  if (networkResponse) return networkResponse;
  throw new Error("No cached or network response exists");
}

self.addEventListener("push", (event) => {
  const options = {
    body: event.data ? event.data.text() : "New notification from Shadecode Student",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [100, 50, 100],
    data: { dateOfArrival: Date.now() },
  };

  event.waitUntil(
    self.registration.showNotification("Shadecode Student", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow("/"));
});
