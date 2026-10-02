/*
 * Service worker for the Pride Center kiosk.
 *
 * - Same-origin files (the app itself): network first, always revalidated, so a
 *   config.js or index.html change reaches the iPad on the next open. If the
 *   network is down, the last good copy is served, so the app still opens.
 * - Google Fonts: served from cache immediately, refreshed in the background.
 * - POSTs (check-ins to the Apps Script) are never touched; index.html queues
 *   them in localStorage when offline.
 */
const VERSION = "ppc-shell-v6";
const SHELL = [
  "./",
  "index.html",
  "staff.html",
  "feedback.html",
  "config.js",
  "ds.css",
  "icons.js",
  "manifest.webmanifest",
  "assets/parchment-logo.png",
  "assets/icon-192.png",
  "assets/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Videos stream in byte ranges; leave them to the browser, never cache them.
  if (/\.(mp4|webm|mov)$/i.test(url.pathname) || req.headers.has("range")) return;

  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(req));
  } else if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    event.respondWith(staleWhileRevalidate(req));
  }
});

async function networkFirst(req) {
  const cache = await caches.open(VERSION);
  try {
    // cache: "no-cache" forces a conditional request past the HTTP cache, so
    // GitHub Pages' 10-minute max-age and Safari's heuristics don't serve stale files.
    const res = await fetch(req, { cache: "no-cache" });
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;
    if (req.mode === "navigate") {
      const shell = await cache.match("index.html");
      if (shell) return shell;
    }
    throw err;
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(req);
  const network = fetch(req)
    .then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; })
    .catch(() => cached);
  return cached || network;
}
