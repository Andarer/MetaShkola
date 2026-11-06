// MetaШкола 2.2: Service Worker
// Automatically detects base path from self.location.pathname for GitHub Pages (/MetaShkola/) or root (/)
const BASE_PATH = self.location.pathname.substring(0, self.location.pathname.lastIndexOf("/") + 1);
const CACHE_NAME = "metaschool-v2.2.0";

const CORE_ASSETS = [
  BASE_PATH,
  BASE_PATH + "index.html",
  BASE_PATH + "manifest.json",
  BASE_PATH + "favicon.svg",
  BASE_PATH + "icon-192.png",
  BASE_PATH + "icon-512.png",
  BASE_PATH + "icons/icon-192.png",
  BASE_PATH + "icons/icon-512.png",
  BASE_PATH + "icons/apple-touch-icon.png",
  BASE_PATH + "favicon-32x32.png",
  BASE_PATH + "release.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => {
        // Do not force skipWaiting if core asset precaching failed
        console.warn("[MetaSchool SW] Cache pre-fill failed, preserving previous cache:", err);
      })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("metaschool-") && key !== CACHE_NAME)
            .map((key) => {
              console.log("[MetaSchool SW] Pruning legacy cache:", key);
              return caches.delete(key);
            })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Network-only for API calls or telemetry
  if (url.pathname.includes("/api/")) return;

  // Network-First for release.json (always check freshest release metadata when online)
  if (url.pathname.includes("release.json")) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Network-First for HTML navigation with offline fallback
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(BASE_PATH + "index.html").then((fallback) => {
            return fallback || caches.match(BASE_PATH) || caches.match("index.html");
          });
        })
    );
    return;
  }

  // Stale-While-Revalidate for all other static assets (JS, CSS, icons, fonts)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(BASE_PATH);
      }
    })
  );
});
