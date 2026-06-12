// Shadecode Student Service Worker
// Provides offline support and caching strategies with low-bandwidth mode

const CACHE_NAME = 'shadecode-student-v1';
const STATIC_CACHE_NAME = 'shadecode-static-v1';
const DYNAMIC_CACHE_NAME = 'shadecode-dynamic-v1';
const LOW_BANDWIDTH_CACHE_NAME = 'shadecode-low-bandwidth-v1';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// Cache dashboard and curriculum pages
const CACHE_ROUTES = [
  '/dashboard',
  '/curriculum',
  '/learn',
];

// Low-bandwidth mode flag
let lowBandwidthMode = false;

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME && 
                cacheName !== LOW_BANDWIDTH_CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// Listen for messages from clients (e.g., low-bandwidth mode toggle)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_LOW_BANDWIDTH_MODE') {
    lowBandwidthMode = event.data.enabled;
    console.log('[SW] Low-bandwidth mode:', lowBandwidthMode);
  }
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Check for low-bandwidth mode header
  const isLowBandwidthRequest = request.headers.get('X-Low-Bandwidth') === 'true';

  // Cache dashboard and curriculum pages with Network First strategy
  if (CACHE_ROUTES.some(route => url.pathname.startsWith(route))) {
    event.respondWith(networkFirstStrategy(request, isLowBandwidthRequest));
    return;
  }

  // Cache static assets with Cache First strategy
  if (STATIC_ASSETS.some(asset => url.pathname === asset || url.pathname.includes(asset))) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // Default: Network First with fallback
  event.respondWith(networkFirstStrategy(request, isLowBandwidthRequest));
});

// Network First strategy - try network, fallback to cache
async function networkFirstStrategy(request, isLowBandwidth = false) {
  const cacheName = isLowBandwidth ? LOW_BANDWIDTH_CACHE_NAME : DYNAMIC_CACHE_NAME;
  const cache = await caches.open(cacheName);
  
  try {
    // In low-bandwidth mode, try cache first
    if (isLowBandwidth || lowBandwidthMode) {
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        console.log('[SW] Serving from cache (low-bandwidth):', request.url);
        return cachedResponse;
      }
    }

    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      // In low-bandwidth mode, only cache small responses
      const contentLength = networkResponse.headers.get('content-length');
      const isSmall = !contentLength || parseInt(contentLength) < 100 * 1024; // 100KB
      
      if (!isLowBandwidth || isSmall) {
        cache.put(request, networkResponse.clone());
      }
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline shell if no cache
    return new Response('Offline - No cached content available', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain',
      }),
    });
  }
}

// Cache First strategy - try cache, fallback to network
async function cacheFirstStrategy(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed for cache-first:', request.url);
    throw error;
  }
}

// Background sync for progress updates
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-progress') {
    event.waitUntil(syncProgress());
  }
});

async function syncProgress() {
  try {
    // Sync any pending progress updates
    const pendingProgress = await getPendingProgress();
    
    for (const progress of pendingProgress) {
      await syncProgressToServer(progress);
      await removePendingProgress(progress.id);
    }
    
    console.log('[SW] Progress sync completed');
  } catch (error) {
    console.error('[SW] Progress sync failed:', error);
  }
}

// IndexedDB helpers for offline storage
async function getPendingProgress() {
  // This would integrate with IndexedDB to get pending progress
  return [];
}

async function syncProgressToServer(progress) {
  // This would sync progress to the server
  console.log('[SW] Syncing progress:', progress);
}

async function removePendingProgress(id) {
  // This would remove synced progress from IndexedDB
  console.log('[SW] Removing pending progress:', id);
}

// Push notification support
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New notification from Shadecode Student',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
  };

  event.waitUntil(
    self.registration.showNotification('Shadecode Student', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    self.clients.openWindow('/')
  );
});
