const CACHE_NAME = "cardapio-trailer-v1";

const ARQUIVOS_PARA_CACHE = [
  "/index.html",
  "/style.css",
  "/script.js",
  "/supabase-config.js",
  "/manifest.json",
  "/assets/logo.png",
  "/assets/icons/icon-192.png",
  "/assets/icons/icon-512.png"
];

// Quando o service worker é instalado, guarda os arquivos essenciais em cache
self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARQUIVOS_PARA_CACHE))
  );
  self.skipWaiting();
});

// Remove caches antigos quando uma nova versão do service worker assume
self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys().then((nomes) =>
      Promise.all(
        nomes
          .filter((nome) => nome !== CACHE_NAME)
          .map((nome) => caches.delete(nome))
      )
    )
  );
  self.clients.claim();
});

// Estratégia: tenta buscar na internet primeiro; se não conseguir
// (sem internet), usa o que estiver salvo em cache
self.addEventListener("fetch", (evento) => {
  evento.respondWith(
    fetch(evento.request).catch(() => caches.match(evento.request))
  );
});