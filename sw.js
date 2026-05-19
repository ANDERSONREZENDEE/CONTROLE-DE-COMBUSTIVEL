const PREFIXO_CACHE = 'caixinha-wm-';
const CACHE_NAME = PREFIXO_CACHE + 'v40';

const ARQUIVOS_FIXOS = [
  './',
  './index.html',
  './manifest.json',
  './sw.js',
  './LOGOTIPO.jpg',
  './controladoria.jpg',
  './Captura%20de%20tela%202026-02-13%20132630.jpg',
  './OLHOABERTO.png',
  './OLHOFECHADO_V2.png',
  './icone_principal_v14.png',
  './icone_principal_v14.png?v=40',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
];

function respostaOfflineInstalacao() {
  return new Response(
    `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Caixinha Offline</title>
<style>
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f4f7f6;
    color: #1a233a;
    font-family: Arial, sans-serif;
    padding: 20px;
    box-sizing: border-box;
  }
  .box {
    width: 100%;
    max-width: 420px;
    background: #ffffff;
    border: 4px solid #f39c12;
    border-radius: 14px;
    box-shadow: 0 5px 18px rgba(0,0,0,0.18);
    padding: 22px;
    text-align: center;
  }
  h1 {
    margin: 0 0 10px 0;
    font-size: 22px;
    color: #1a233a;
  }
  p {
    font-size: 14px;
    line-height: 1.45;
    font-weight: bold;
  }
</style>
</head>
<body>
  <div class="box">
    <h1>📴 App offline</h1>
    <p>O cache offline ainda não foi instalado neste aparelho.</p>
    <p>Abra o app uma vez com internet para salvar os arquivos e depois ele funcionará offline.</p>
  </div>
</body>
</html>`,
    {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    }
  );
}

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
    const respostaRede = await fetch(evento.request, { cache: 'no-store' });
    if (respostaRede && (respostaRede.ok || respostaRede.type === 'opaque')) {
      await cache.put('./index.html', respostaRede.clone());
      await cache.put(evento.request, respostaRede.clone());
    }
    return respostaRede;
  } catch (erro) {
    return (
      await caches.match('./index.html', { ignoreSearch: true }) ||
      await caches.match('./', { ignoreSearch: true }) ||
      respostaOfflineInstalacao()
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
      return (
        await caches.match('./index.html', { ignoreSearch: true }) ||
        await caches.match('./', { ignoreSearch: true }) ||
        respostaOfflineInstalacao()
      );
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
