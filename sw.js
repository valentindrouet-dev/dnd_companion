// Service worker : rend l'application utilisable hors-ligne sur l'iPad.
// Stratégie : réseau d'abord (pour recevoir les mises à jour), cache en secours.
// La liste SHELL est vérifiée par `npm run validate` (tous les fichiers de src/ doivent y figurer).

importScripts('./version.js');

const CACHE = 'dnd-companion-' + self.APP_VERSION;

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './version.js',
  './styles/app.css',
  './assets/icons/icon.svg',
  './assets/icons/icon-180.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './data/index.json',
  './src/app.js',
  './src/data.js',
  './src/dom.js',
  './src/icons.js',
  './src/markup.js',
  './src/router.js',
  './src/store.js',
  './src/util.js',
  './src/ui/popup.js',
  './src/ui/toast.js',
  './src/components/block.js',
  './src/components/card.js',
  './src/components/connections.js',
  './src/components/monster.js',
  './src/components/npc.js',
  './src/components/treasure.js',
  './src/views/adventure.js',
  './src/views/bestiary.js',
  './src/views/home.js',
  './src/views/room.js',
  './src/views/settings.js',
  './src/views/shell.js',
  './src/views/sidebar.js',
  './src/loot/generator.js',
  './src/loot/ui.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  event.respondWith(
    fetch(req).then((res) => {
      if (res && res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
      return res;
    }).catch(async () => {
      const cached = await caches.match(req, { ignoreSearch: true });
      if (cached) return cached;
      if (req.mode === 'navigate') return caches.match('./index.html');
      return new Response('Hors-ligne', { status: 503, statusText: 'Offline' });
    }));
});
