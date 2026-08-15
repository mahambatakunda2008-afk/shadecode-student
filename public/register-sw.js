// Shadecode Student PWA service worker registration.
// Kept as a standalone script so PWA crawlers can detect registration immediately.
(function () {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('/sw.js', { scope: '/' })
    .then(function () {
      console.log('[Shadecode PWA] Service worker registered');
    })
    .catch(function (error) {
      console.error('[Shadecode PWA] Service worker registration failed:', error);
    });
})();
