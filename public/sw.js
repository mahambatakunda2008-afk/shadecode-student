/* Shadecode Student service worker v8. Design notes: docs/OFFLINE_ARCHITECTURE.md
 *
 * - Documents are cached by PATH (not full URL), network-first with a timeout, so a weak connection
 *   falls back to the saved copy instead of hanging.
 * - A page is only cached when it is a real HTML 200 that was NOT redirected (never a login page saved as /dashboard).
 * - WARM_ROUTES lets the app save the learner's permitted destinations and their JavaScript while online.
 * - Authenticated pages and RSC payloads are removed on sign-out and account changes. API calls are never intercepted.
 */
const VERSION = "v8";
const STATIC_CACHE = `shadecode-static-${VERSION}`;
const PAGE_CACHE = `shadecode-pages-${VERSION}`;
const RSC_CACHE = `shadecode-rsc-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const STATIC_RE = /\.(?:js|css|svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$/i;
const NETWORK_TIMEOUT_MS = 6_000;
const MAX_PAGES = 80;
const MAX_RSC = 120;
const WARM_FRESH_MS = 6 * 60 * 60 * 1000;
const WARM_ASSET_CONCURRENCY = 4;
const MAX_WARM_ROUTES = 30;

const isPublicEntry = (pathname) => pathname === "/" || pathname === "/auth" || pathname.startsWith("/auth/");
const normalizePath = (pathname) => (pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname);
const pageKey = (pathname) => self.location.origin + normalizePath(pathname);
const isImmutableAsset = (pathname) => pathname.startsWith("/_next/static/");
const isStaticAsset = (pathname) => isImmutableAsset(pathname) || pathname.startsWith("/_next/image") || STATIC_RE.test(pathname);

function isCacheableDocument(response) {
  if (!response || !response.ok || response.redirected || response.type === "opaque") return false;
  return /text\/html/i.test(response.headers.get("content-type") || "");
}

async function trim(cache, max) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i += 1) await cache.delete(keys[i]);
}

async function offlineFallback() {
  return (await caches.match(OFFLINE_URL)) || Response.error();
}

function fetchWithTimeout(request) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("network timeout")), NETWORK_TIMEOUT_MS);
    fetch(request).then(
      (response) => { clearTimeout(timer); resolve(response); },
      (error) => { clearTimeout(timer); reject(error); }
    );
  });
}

async function savePage(pathname, response) {
  const cache = await caches.open(PAGE_CACHE);
  await cache.put(pageKey(pathname), response);
  await trim(cache, MAX_PAGES);
}

async function matchPage(pathname) {
  const cache = await caches.open(PAGE_CACHE);
  return cache.match(pageKey(pathname), { ignoreVary: true });
}

async function handleNavigation(event, request, url) {
  if (isPublicEntry(url.pathname)) {
    try {
      return await fetchWithTimeout(request);
    } catch {
      if (url.pathname === "/") {
        const home = await matchPage("/dashboard");
        if (home) return home;
      }
      return offlineFallback();
    }
  }

  const cached = await matchPage(url.pathname);
  if (typeof navigator !== "undefined" && navigator.onLine === false) return cached || offlineFallback();
  try {
    const response = await fetchWithTimeout(request);
    if (isCacheableDocument(response)) event.waitUntil(savePage(url.pathname, response.clone()).catch(() => undefined));
    return response;
  } catch {
    return cached || offlineFallback();
  }
}

async function handleRsc(event, request) {
  const cache = await caches.open(RSC_CACHE);
  const cached = await cache.match(request);
  if (typeof navigator !== "undefined" && navigator.onLine === false) return cached || Response.error();
  try {
    const response = await fetchWithTimeout(request);
    if (response && response.ok && !response.redirected) {
      event.waitUntil(cache.put(request, response.clone()).then(() => trim(cache, MAX_RSC)).catch(() => undefined));
    }
    return response;
  } catch {
    return cached || Response.error();
  }
}

async function handleAsset(event, request, url) {
  const cache = await caches.open(STATIC_CACHE);
  const immutable = isImmutableAsset(url.pathname);
  const cached = await cache.match(request, immutable ? { ignoreSearch: true } : undefined);
  if (cached && immutable) return cached;
  try {
    const response = await fetchWithTimeout(request);
    if (response.ok) event.waitUntil(cache.put(request, response.clone()).catch(() => undefined));
    return response;
  } catch {
    return cached || Response.error();
  }
}

function extractAssetUrls(html) {
  const found = new Set();
  const pattern = /(?:\/_next\/)?static\/(?:chunks|css|media)\/[^"'\\\s<>)]*?\.(?:js|css|woff2?)(?:\?[^"'\\\s<>)]*)?/g;
  for (const match of html.matchAll(pattern)) {
    const path = match[0].startsWith("/_next/") ? match[0] : `/_next/${match[0]}`;
    found.add(path);
  }
  return [...found];
}

function safeRoute(route) {
  if (typeof route !== "string" || !route.startsWith("/") || route.startsWith("//") || route.includes("..")) return null;
  const pathname = route.split("?")[0];
  if (pathname.startsWith("/api/") || pathname.startsWith("/_next/") || pathname.startsWith("/admin") || pathname.startsWith("/teacher") || isPublicEntry(pathname)) return null;
  return route.split("#")[0];
}

const isFresh = (response) => {
  const date = Date.parse(response.headers.get("date") || "");
  return Number.isFinite(date) && Date.now() - date < WARM_FRESH_MS;
};

async function runPool(items, size, task) {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(size, queue.length) }, async () => {
    while (queue.length) await task(queue.shift());
  }));
}

async function warmRoutes(routes) {
  const result = { pages: 0, skipped: 0, assets: 0, failed: 0 };
  const pages = await caches.open(PAGE_CACHE);
  const statics = await caches.open(STATIC_CACHE);
  const assetUrls = new Set();

  for (const raw of routes.slice(0, MAX_WARM_ROUTES)) {
    const path = safeRoute(raw);
    if (!path) continue;
    try {
      const existing = await pages.match(pageKey(path), { ignoreVary: true });
      let html;
      if (existing && isFresh(existing)) {
        result.skipped += 1;
        html = await existing.clone().text();
      } else {
        const response = await fetchWithTimeout(new Request(new URL(path, self.location.origin).href, { credentials: "same-origin", headers: { accept: "text/html" }, redirect: "follow" }));
        if (!isCacheableDocument(response)) { result.failed += 1; continue; }
        html = await response.clone().text();
        await pages.put(pageKey(path), response);
        result.pages += 1;
      }
      extractAssetUrls(html).forEach((asset) => assetUrls.add(asset));
    } catch {
      result.failed += 1;
    }
  }
  await trim(pages, MAX_PAGES);

  const missing = [];
  for (const asset of assetUrls) if (!(await statics.match(asset, { ignoreSearch: true }))) missing.push(asset);
  await runPool(missing, WARM_ASSET_CONCURRENCY, async (asset) => {
    try {
      const response = await fetchWithTimeout(asset);
      if (response.ok) { await statics.put(asset, response); result.assets += 1; } else result.failed += 1;
    } catch {
      result.failed += 1;
    }
  });
  return result;
}

async function notifyClients(message) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach((client) => client.postMessage(message));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.add(OFFLINE_URL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  const keep = new Set([STATIC_CACHE, PAGE_CACHE, RSC_CACHE]);
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("shadecode-") && !keep.has(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === "/sw.js" || url.pathname.startsWith("/api/") || request.headers.has("authorization")) return;

  const isRsc = url.searchParams.has("_rsc") || request.headers.get("RSC") === "1";
  const safely = (handler) => handler.catch(() => fetch(request));

  if (request.mode === "navigate") {
    event.respondWith(safely(handleNavigation(event, request, url)));
    return;
  }
  if (isRsc) {
    event.respondWith(safely(handleRsc(event, request)));
    return;
  }
  if (isStaticAsset(url.pathname)) event.respondWith(safely(handleAsset(event, request, url)));
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "SKIP_WAITING") self.skipWaiting();
  if (data.type === "CLEAR_APP_CACHE") {
    event.waitUntil(Promise.all([caches.delete(PAGE_CACHE), caches.delete(RSC_CACHE)]));
  }
  if (data.type === "WARM_ROUTES" && Array.isArray(data.routes)) {
    event.waitUntil(
      warmRoutes(data.routes)
        .then((result) => notifyClients({ type: "WARM_DONE", version: VERSION, ...result }))
        .catch(() => notifyClients({ type: "WARM_DONE", version: VERSION, pages: 0, skipped: 0, assets: 0, failed: 1 }))
    );
  }
});
