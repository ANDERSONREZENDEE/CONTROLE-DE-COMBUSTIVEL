const CACHE_NAME = 'controle-combustivel-controladoria-v21';

const ARQUIVOS_PARA_CACHE = [
  './',
  './index.html',
  './manifest.json?v=21',
  './LOGOTIPO.jpg',
  './controladoria.jpg',
  './Captura de tela 2026-02-13 132630.jpg',
  './OLHOABERTO_V2.png',
  './OLHOFECHADO_V2.png',
  './icone_principal_v14.png',
  './icone_atalho_v14.png',
  './icone_combustível_v1.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.all(
        ARQUIVOS_PARA_CACHE.map(url => cache.add(url).catch(() => null))
      );
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copia = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copia));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  if (url.origin !== self.location.origin && !url.href.startsWith('https://cdnjs.cloudflare.com/')) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request)
        .then(response => {
          if (!response || response.status !== 200) return response;
          const copia = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copia));
          return response;
        })
        .catch(() => {
          if (request.destination === 'document') return caches.match('./index.html');
          return caches.match(request);
        });
    })
  );
});
