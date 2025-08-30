const CACHE_NAME = "baco-bjj-cache-v5"; // ↑ aumente a versão sempre que atualizar
const urlsToCache = [
  "./",
  "./index.html",
  "./manifest.json",
  "./style.css",
  "./script.js",
  "./logo.png",
  "./equipe1.jpg",
  "./alunos.json"
];

// Instala e adiciona arquivos no cache
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Ativa e remove caches antigos
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Estratégia: Network First, fallback cache (mesma origem)
self.addEventListener("fetch", event => {
  const reqUrl = new URL(event.request.url);
  // Para mesma origem: network-first
  if (reqUrl.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  }
  // Para CDNs/libs externas, deixa seguir comportamento padrão (network)
});
