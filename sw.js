const CACHE_NAME = "leave-me-alone-games-v19";
const APP_SHELL = [
  "./",
  "./index.html",
  "./launcher.css?v=20260616-app-3",
  "./launcher.js?v=20260607-app-1",
  "./i18n.js?v=20260616-i18n-2",
  "./manifest.webmanifest?v=20260607-app-1",
  "./games/klondike/",
  "./games/klondike/index.html",
  "./games/klondike/styles.css?v=20260614-klondike-5",
  "./games/klondike/app.js?v=20260614-klondike-5",
  "./games/freecell/",
  "./games/freecell/index.html",
  "./games/freecell/styles.css?v=20260614-freecell-10",
  "./games/freecell/app.js?v=20260614-freecell-10",
  "./games/spider/",
  "./games/spider/index.html",
  "./games/spider/styles.css?v=20260614-spider-4",
  "./games/spider/app.js?v=20260614-spider-4",
  "./games/pyramid/",
  "./games/pyramid/index.html",
  "./games/pyramid/styles.css?v=20260615-pyramid-3",
  "./games/pyramid/app.js?v=20260614-pyramid-2",
  "./games/tripeaks/",
  "./games/tripeaks/index.html",
  "./games/tripeaks/styles.css?v=20260616-tripeaks-1",
  "./games/tripeaks/app.js?v=20260616-tripeaks-1",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const isAppFile = url.pathname.endsWith("/") ||
    url.pathname.endsWith("/index.html") ||
    url.pathname.endsWith("/launcher.css") ||
    url.pathname.endsWith("/launcher.js") ||
    url.pathname.endsWith("/i18n.js") ||
    url.pathname.endsWith("/styles.css") ||
    url.pathname.endsWith("/app.js") ||
    url.pathname.endsWith("/manifest.webmanifest");

  event.respondWith(isAppFile ? networkFirst(event.request) : cacheFirst(event.request));
});

function networkFirst(request) {
  return fetch(request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
    return response;
  }).catch(() =>
    caches.match(request).then((cached) => cached || caches.match("./index.html"))
  );
}

function cacheFirst(request) {
  return caches.match(request).then((cached) =>
    cached || fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      return response;
    }).catch(() => caches.match("./index.html"))
  );
}
