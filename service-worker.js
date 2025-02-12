/**
 * service-worker.js
 * -----------------
 * A simple service worker for offline caching of essential files.
 */

const CACHE_NAME = "pwa-pong-cache-v1";
const URLS_TO_CACHE = [
  "/",              // The root (index.html)
  "/index.html",
  "/css/style.css",
  "/js/client.js",
  "/js/touch.js",
  "/js/game-logic.js",
  "/manifest.json",
  "/icons/icon-192.png"
];

// Install SW and cache files
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[ServiceWorker] Caching app shell");
      return cache.addAll(URLS_TO_CACHE);
    })
  );
});

// Activate SW
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keyList) =>
      Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[ServiceWorker] Removing old cache", key);
            return caches.delete(key);
          }
        })
      )
    )
  );
});

// Fetch interception
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
