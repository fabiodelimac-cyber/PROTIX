// sw.js — APP Service Worker
// CACHE_VERSION é atualizado automaticamente pelo deploy.sh — não edite manualmente
// IMPORTANTE: Este Service Worker NÃO é registrado em localhost (ver index.html)
const CACHE_NAME = 'app-20260505.1615';

// Assets essenciais para funcionar offline (shell do app)
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/images/icon.png',
  '/images/header.png',
  '/images/header-light.png',
  '/images/pros_white.png',
  '/js/app.js',
  '/js/view-overview.js',
  '/js/view-positivacao.js',
  '/js/view-heat-produtos.js',
  '/js/view-performance.js',
  '/js/view-about.js',
  '/js/view-welcome.js',
  '/js/usage-stats.js',
  '/js/services/dataManager.js',
  '/js/services/supabaseClient.js'
];

// ── INSTALL: pré-cacheia o shell ──────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando nova versão:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_ASSETS);
    })
  );
  self.skipWaiting(); // Força ativação imediata
});

// ── ACTIVATE: limpa caches antigos ───────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando nova versão:', CACHE_NAME);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('[SW] Removendo cache antigo:', key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim(); // Assume controle imediato
});

// ── FETCH: Network-first para API Supabase, Cache-first para assets ───────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignora protocolos não-HTTP (chrome-extension, about, data, blob, etc.)
  if (!url.protocol.startsWith('http')) {
    return; // Deixa o browser resolver
  }

  // Bloqueia conexões de dev server (Vite, Webpack, etc.)
  if (url.protocol === 'ws:' || url.protocol === 'wss:' || 
      url.pathname.includes('/__vite') || 
      url.pathname.includes('/webpack-hmr') ||
      url.pathname.includes('/@vite/client') ||
      url.hostname === 'localhost' && url.port !== location.port) {
    return; // Ignora completamente
  }

  // Deixa passar sem cache: Supabase, CDNs externos, Google Fonts
  const bypass = [
    'supabase.co',
    'cdn.jsdelivr.net',
    'cdnjs.cloudflare.com',
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'cdn.tailwindcss.com',
    'accounts.google.com'
  ];

  if (bypass.some((domain) => url.hostname.includes(domain))) {
    return; // Deixa o browser resolver normalmente
  }

  // Para tudo mais: Network-first para JS/HTML (garante versão atualizada),
  // Cache-first para imagens e outros assets estáticos
  event.respondWith(
    (async () => {
      const isCodeOrPage = event.request.url.endsWith('.js') ||
                           event.request.url.endsWith('.html') ||
                           event.request.mode === 'navigate';

      if (isCodeOrPage) {
        // Network-first: tenta a rede, cai no cache se offline
        try {
          const response = await fetch(event.request);
          if (response.ok && response.type === 'basic' && event.request.method === 'GET') {
            const clone = response.clone();
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, clone).catch(() => {});
          }
          return response;
        } catch (e) {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          throw e;
        }
      }

      // Cache-first para imagens e outros assets estáticos
      const cached = await caches.match(event.request);
      if (cached) return cached;

      try {
        const response = await fetch(event.request);
        if (response.ok && response.type === 'basic' && event.request.method === 'GET') {
          const clone = response.clone();
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, clone).catch(() => {});
        }
        return response;
      } catch (e) {
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        throw e;
      }
    })()
  );
});
