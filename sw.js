/**
 * AnesPilot - Offline-First Service Worker
 * Ensures 100% offline availability in ORs without signal.
 */

const CACHE_NAME = "anespilot-v1.3.2";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./standalone.html",
  "./manifest.json",
  "./css/app.css",
  "./js/app.js",
  "./js/services/cloudSync.js",
  "./js/data/drugData.js",
  "./js/data/asraData.js",
  "./js/engines/dosing.js",
  "./js/engines/crisis.js",
  "./js/engines/toxicity.js",
  "./js/engines/infusion.js",
  "./js/engines/scores.js",
  "https://cdn.tailwindcss.com"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[ServiceWorker] Pre-caching offline assets v1.3.2");
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn("[ServiceWorker] Pre-caching note:", err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[ServiceWorker] Purging outdated cache:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Network-First with Offline Cache Fallback
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Offline fallback
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
        });
      })
  );
});
