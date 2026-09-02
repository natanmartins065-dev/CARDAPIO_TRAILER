const CACHE_NAME = "painel-admin-trailer-v1";

const ARQUIVOS_PARA_CACHE = [
  "/admin/login.html",
  "/admin/instalar.html",
  "/admin/admin-style.css",
  "/admin/login.js",
  "/admin/manifest.json",
  "/assets/icons/icon-192.png",
  "/assets/icons/icon-512.png"
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ARQUIVOS_PARA_CACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys().then((nomes) =>
      Promise.all(nomes.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (evento) => {
  evento.respondWith(fetch(evento.request).catch(() => caches.match(evento.request)));
});