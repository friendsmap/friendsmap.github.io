// Service Worker — Mapa de amigos
// Estrategia de caché pensada para escala (CDN + offline + actualización en segundo plano)
const CACHE = "friends-map-v73";
const NUCLEO = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

// Instalar: precargar el núcleo para arranque instantáneo y offline
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(NUCLEO)).then(() => self.skipWaiting()));
});

// Activar: borrar cachés viejas y tomar control
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Solo gestionamos nuestro propio origen. Lo externo (Google, APIs) va directo a red.
  if (url.origin !== self.location.origin) return;

  const esHTML = req.mode === "navigate" || req.destination === "document";

  if (esHTML) {
    // HTML: primero red (para traer la última versión), y si no hay conexión, caché.
    e.respondWith(
      fetch(new Request(req.url, { cache: "no-store" }))
        .then(r => { const c = r.clone(); caches.open(CACHE).then(ca => ca.put(req, c)); return r; })
        .catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
    );
    return;
  }

  // Recursos estáticos: caché primero + actualización en segundo plano (no frena al usuario).
  e.respondWith(
    caches.match(req).then(cached => {
      const red = fetch(req).then(r => {
        const c = r.clone(); caches.open(CACHE).then(ca => ca.put(req, c)); return r;
      }).catch(() => cached);
      return cached || red;
    })
  );
});
