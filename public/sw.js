// public/sw.js
// Shadecode Student Service Worker
// Handles caching, offline mode, and background sync

const CACHE_NAME = "shadecode-v1";
const OFFLINE_CACHE = "shadecode-offline-v1";

// Pages to cache for offline access
const STATIC_ASSETS = [
  "/",
  "/dashboard",
  "/tasks",
  "/timetable",
  "/exams",
  "/learn",
  "/leaderboard",
  "/settings",
  "/math-checker",
  "/offline",
];

// API routes that can work offline with cached data
const CACHEABLE_APIS = [
  "/api/challenges/today",
];

// ── Install ────────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Caching static assets");
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[SW] Some assets failed to cache:", err);
      });
    })
  );
  self.skipWaiting();
});

// ── Activate ───────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== OFFLINE_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch ──────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and external URLs
  if (request.method !== "GET") return;
  if (url.origin !== location.origin) return;

  // API routes — network first, fall back to cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && CACHEABLE_APIS.some(api => url.pathname.startsWith(api))) {
            const clone = response.clone();
            caches.open(OFFLINE_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Pages and assets — stale while revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => {
        // If offline and no cache — return offline page
        if (request.destination === "document") {
          return caches.match("/offline") || caches.match("/");
        }
      });

      return cached || fetchPromise;
    })
  );
});

// ── Background Sync ────────────────────────────────────────────────────────────
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-tasks") {
    event.waitUntil(syncPendingTasks());
  }
});

async function syncPendingTasks() {
  // Read pending offline actions from IndexedDB and replay them
  console.log("[SW] Syncing pending tasks...");
}

// ── Push Notifications (future) ───────────────────────────────────────────────
self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || "Shadecode Student", {
      body: data.body || "You have a new notification",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
    })
  );
});
