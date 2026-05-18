const PREFIXO_CACHE = 'controle-combustivel-controladoria-';
const CACHE_NAME = PREFIXO_CACHE + 'v37';

const ARQUIVOS_FIXOS = [
  './',
  './index.html',
  './manifest.json',
  './sw.js',
  './base_dados_wm.js',
  './base_dados_wm.js?v=37',
  './base_dados_2_nao_wm.js',
  './base_dados_2_nao_wm.js?v=37',
  './base_senhas.js',
  './base_senhas.js?v=37',
  './LOGOTIPO.jpg',
  './controladoria.jpg',
  './Captura%20de%20tela%202026-02-13%20132630.jpg',
  './Captura de tela 2026-02-13 132630.jpg',
  './OLHOABERTO_V2.png',
  './OLHOFECHADO_V2.png',
  './OLHOABERTO.png',
  './OLHOFECHADO.png',
  './icone_principal_v14.png',
  './icone_principal_v14.png?v=37',
  './icone_atalho_v14.png',
  './icone_atalho_v14.png?v=37',
  './icone_combustível_v1.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
];

async function salvarNoCache(cache, arquivo) {
  try {
    const ehExterno = arquivo.startsWith('http');
    const resposta = await fetch(arquivo, {
      cache: 'reload',
      mode: ehExterno ? 'no-cors' : 'same-origin'
    });

    if (resposta && (resposta.ok || resposta.type === 'opaque')) {
      await cache.put(arquivo, resposta.clone());
    }
  } catch (erro) {
    console.warn('Não foi possível cachear:', arquivo, erro);
  }
}

self.addEventListener('install', evento => {
  evento.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.allSettled(ARQUIVOS_FIXOS.map(arquivo => salvarNoCache(cache, arquivo))))
      .then(() => self.skipWaiting())
  );
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
    }).then(() => self.clients.claim())
  );
});

async function responderNavegacao(evento) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const respostaRede = await fetch(evento.request);
    if (respostaRede && (respostaRede.ok || respostaRede.type === 'opaque')) {
      await cache.put('./index.html', respostaRede.clone());
      await cache.put(evento.request, respostaRede.clone());
    }
    return respostaRede;
  } catch (erro) {
    return (
      await caches.match('./index.html', { ignoreSearch: true }) ||
      await caches.match('./', { ignoreSearch: true }) ||
      new Response('App offline indisponível. Abra uma vez com internet para instalar o cache.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      })
    );
  }
}

async function responderArquivo(evento) {
  const cache = await caches.open(CACHE_NAME);
  const respostaCache = await caches.match(evento.request, { ignoreSearch: true });

  if (respostaCache) {
    fetch(evento.request)
      .then(respostaRede => {
        if (respostaRede && (respostaRede.ok || respostaRede.type === 'opaque') && evento.request.method === 'GET') {
          cache.put(evento.request, respostaRede.clone());
        }
      })
      .catch(() => {});
    return respostaCache;
  }

  try {
    const respostaRede = await fetch(evento.request);
    if (respostaRede && (respostaRede.ok || respostaRede.type === 'opaque') && evento.request.method === 'GET') {
      await cache.put(evento.request, respostaRede.clone());
    }
    return respostaRede;
  } catch (erro) {
    if (evento.request.mode === 'navigate' || evento.request.destination === 'document') {
      return caches.match('./index.html', { ignoreSearch: true });
    }
    return new Response('', { status: 504, statusText: 'Offline e arquivo não disponível no cache' });
  }
}

self.addEventListener('fetch', evento => {
  if (evento.request.method !== 'GET') return;

  if (evento.request.mode === 'navigate') {
    evento.respondWith(responderNavegacao(evento));
    return;
  }

  evento.respondWith(responderArquivo(evento));
});
