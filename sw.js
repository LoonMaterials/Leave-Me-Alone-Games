const CACHE_NAME = "leave-me-alone-games-v37";
const APP_SHELL = [
  "./",
  "./index.html",
  "./launcher.css?v=20260627-game-sections-1",
  "./launcher.js?v=20260621-settings-2",
  "./i18n.js?v=20260627-more-board-games-1",
  "./manifest.webmanifest?v=20260607-app-1",
  "./games/klondike/",
  "./games/klondike/index.html",
  "./games/klondike/styles.css?v=20260621-controls-1",
  "./games/klondike/app.js?v=20260621-auto-finish-1",
  "./games/freecell/",
  "./games/freecell/index.html",
  "./games/freecell/styles.css?v=20260617-landscape-1",
  "./games/freecell/app.js?v=20260621-auto-finish-1",
  "./games/spider/",
  "./games/spider/index.html",
  "./games/spider/styles.css?v=20260621-controls-1",
  "./games/spider/app.js?v=20260614-spider-4",
  "./games/pyramid/",
  "./games/pyramid/index.html",
  "./games/pyramid/styles.css?v=20260617-landscape-1",
  "./games/pyramid/app.js?v=20260614-pyramid-2",
  "./games/tripeaks/",
  "./games/tripeaks/index.html",
  "./games/tripeaks/styles.css?v=20260617-landscape-1",
  "./games/tripeaks/app.js?v=20260616-tripeaks-1",
  "./games/golf/",
  "./games/golf/index.html",
  "./games/golf/styles.css?v=20260617-landscape-1",
  "./games/golf/app.js?v=20260616-golf-1",
  "./games/yukon/",
  "./games/yukon/index.html",
  "./games/yukon/styles.css?v=20260617-landscape-1",
  "./games/yukon/app.js?v=20260621-auto-finish-1",
  "./games/mahjong/",
  "./games/mahjong/index.html",
  "./games/mahjong/styles.css?v=20260627-mahjong-1",
  "./games/mahjong/app.js?v=20260627-mahjong-1",
  "./games/chess/",
  "./games/chess/index.html",
  "./games/chess/styles.css?v=20260627-chess-2",
  "./games/chess/app.js?v=20260627-chess-1",
  "./games/checkers/",
  "./games/checkers/index.html",
  "./games/checkers/styles.css?v=20260627-checkers-2",
  "./games/checkers/app.js?v=20260627-checkers-1",
  "./games/dominoes/",
  "./games/dominoes/index.html",
  "./games/dominoes/styles.css?v=20260627-dominoes-1",
  "./games/dominoes/app.js?v=20260627-dominoes-1",
  "./games/reversi/",
  "./games/reversi/index.html",
  "./games/reversi/styles.css?v=20260627-reversi-1",
  "./games/reversi/app.js?v=20260627-reversi-2",
  "./games/backgammon/",
  "./games/backgammon/index.html",
  "./games/backgammon/styles.css?v=20260627-backgammon-1",
  "./games/backgammon/app.js?v=20260627-backgammon-1",
  "./games/connect4/",
  "./games/connect4/index.html",
  "./games/connect4/styles.css?v=20260627-connect4-1",
  "./games/connect4/app.js?v=20260627-connect4-1",
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
