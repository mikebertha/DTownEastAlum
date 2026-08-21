const CACHE_NAME = "dtown-east-alum-v5";
const PRECACHE_URLS = [
    "./",
    "index.html",
    "css/styles.css",
    "js/data.js",
    "js/app.js",
    "manifest.json",
    "assets/icons/icon-192.png",
    "assets/icons/icon-512.png",
  ];

self.addEventListener("install", (event) => {
    event.waitUntil(
          caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
        );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
          caches.keys().then((keys) =>
                  Promise.all(
                            keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
                          )
                                 )
        );
    self.clients.claim();
});

// Network-first everywhere: always try to fetch the latest deploy first, and
// only fall back to the cache when the network is unavailable (offline).
// Previously this was cache-first for same-origin requests, which meant a
// device that had ever loaded the app kept serving that exact snapshot
// forever - future deploys (like new nav links) would never show up until
// someone manually cleared the cache. Network-first fixes that permanently.
self.addEventListener("fetch", (event) => {
    event.respondWith(
          fetch(event.request)
            .then((response) => {
                      const clone = response.clone();
                      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                      return response;
            })
            .catch(() => caches.match(event.request))
        );
});
