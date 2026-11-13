// Shared service worker for every game in this repo (scope = whole site).
// Strategy: network-first for pages (always get updates), stale-while-revalidate for everything else
// (engine, Three.js from CDN, fonts) so games load fast and work offline after the first visit.
const CACHE = "gilele-v8";
const CDN = ["cdn.jsdelivr.net", "unpkg.com", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const same = url.origin === location.origin;
  if (!same && !CDN.includes(url.hostname)) return; // analytics, PeerJS signalling etc. go straight to network
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((r) => { const c = r.clone(); caches.open(CACHE).then((ca) => ca.put(req, c)); return r; }).catch(() => caches.match(req)));
    return;
  }
  e.respondWith(caches.open(CACHE).then(async (ca) => {
    const hit = await ca.match(req);
    const net = fetch(req).then((r) => { if (r.ok || r.type === "opaque") ca.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
