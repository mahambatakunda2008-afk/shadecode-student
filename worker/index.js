// Custom service worker additions, bundled into the real (next-pwa
// generated) service worker via next.config.ts's customWorkerSrc
// mechanism -- see the comment there for why this replaces the old
// hand-written public/sw.js instead of editing it directly (next-pwa
// owns and regenerates that file on every build).
//
// Push notification support -- the one genuinely complete, non-stub
// piece of the old service worker, ported here so it keeps working.

self.addEventListener("push", (event) => {
  const options = {
    body: event.data ? event.data.text() : "New notification from Shadecode Student",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [100, 50, 100],
    data: { dateOfArrival: Date.now(), primaryKey: 1 },
  };

  event.waitUntil(self.registration.showNotification("Shadecode Student", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow("/"));
});
