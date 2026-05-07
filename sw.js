const PREFIXO_CACHE = 'combustivel-funcionario-wm-';
const CACHE_NAME = PREFIXO_CACHE + 'v5';

const arquivosParaGuardar = [
  './',
  './index.html',
  './manifest.json',
  './sw.js',
  './LOGOTIPO.jpg',
  './controladoria.jpg',
  './Captura de tela 2026-02-13 132630.jpg',
  './OLHOABERTO.png',
  './OLHOFECHADO_V2.png',
  './icone_combustivel_v1.png'
];

self.addEventListener('install', evento => {
  evento.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(arquivosParaGuardar))
  );
  self.skipWaiting();
});

self.addEventListener('activate', evento => {
  evento.waitUntil(
    caches.keys().then(nomesCaches => {
      return Promise.all(
        nomesCaches.map(nomeCache => {
          if (nomeCache.startsWith(PREFIXO_CACHE) && nomeCache !== CACHE_NAME) {
            return caches.delete(nomeCache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', evento => {
  evento.respondWith(
    caches.match(evento.request, { ignoreSearch: true })
      .then(respostaCache => {
        if (respostaCache) return respostaCache;

        return fetch(evento.request).then(respostaRede => {
          return caches.open(CACHE_NAME).then(cache => {
            if (
              evento.request.method === 'GET' &&
              respostaRede &&
              respostaRede.status === 200
            ) {
              cache.put(evento.request, respostaRede.clone());
            }
            return respostaRede;
          });
        });
      })
      .catch(() => {
        if (evento.request.mode === 'navigate') {
          return caches.match('./index.html', { ignoreSearch: true });
        }
      })
  );
});
