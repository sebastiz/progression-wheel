// Progression Wheel service worker.
// HTML is served network-first (new builds appear on the next online load); static assets are
// cache-first for speed + offline. CACHE is stamped with the app version at build time, so every
// release invalidates the old cache and installed PWAs re-fetch.
const CACHE = "pw-v4.40.1";
const ASSETS = [
  ".", "index.html", "transcribe.html", "manifest.json", "icon-192.png", "icon-512.png", "apple-touch-icon.png",
  "https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js",
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  // HTML documents go NETWORK-FIRST so a new build shows up on the next online load (falling back to
  // the cached copy offline). Everything else (React, icons) stays CACHE-FIRST for speed + offline.
  const isDoc = req.mode === "navigate" ||
    (sameOrigin && (url.pathname.endsWith(".html") || url.pathname.endsWith("/")));
  if (isDoc) {
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match("index.html"))));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true })
    .then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    })).catch(() => caches.match("index.html")));
});
