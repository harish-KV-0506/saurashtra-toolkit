// Service worker: makes the toolkit work offline.
// The deploy step replaces __BUILD__ with the commit SHA so every release refreshes the cache.
const VERSION = 'sk-__BUILD__';
const SHELL = [
  './', 'index.html', 'css/style.css', 'manifest.webmanifest',
  'js/app.js', 'js/tables.js', 'js/translit.js', 'js/dict.js', 'js/ime.js', 'js/config.js',
  'data/dictionary.json', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => Promise.all(SHELL.map((url) => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('sk-') && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Stale-while-revalidate: answer from cache at once, refresh it in the background.
// Covers the app files, the dictionary and the web fonts (Google Fonts CSS and font files).
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!sameOrigin && !fonts) return;

  event.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: false });
      const network = fetch(req)
        .then((res) => { if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()); return res; })
        .catch(() => null);
      if (cached) { network.catch(() => {}); return cached; }
      const res = await network;
      if (res) return res;
      if (req.mode === 'navigate') return (await cache.match('index.html')) || Response.error();
      return Response.error();
    }),
  );
});
