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
  './src/glossary.js',
  './src/icons.js',
  './src/markup.js',
  './src/progress.js',
  './src/router.js',
  './src/store.js',
  './src/util.js',
  './src/ui/popup.js',
  './src/ui/toast.js',
  './src/ui/sortable.js',
  './src/components/block.js',
  './src/components/card.js',
  './src/components/connections.js',
  './src/components/map.js',
  './src/components/monster.js',
  './src/components/npc.js',
  './src/components/npcstatus.js',
  './src/components/treasure.js',
  './src/views/adventure.js',
  './src/views/bestiary.js',
  './src/views/glossary.js',
  './src/views/home.js',
  './src/views/room.js',
  './src/views/roomlist.js',
  './src/views/settings.js',
  './src/views/shell.js',
  './src/views/sidebar.js',
  './src/loot/generator.js',
  './src/loot/ui.js',
  './src/encounters/generator.js',
  './src/encounters/ui.js',
  './data/maps.json',
  './data/glossary/undermountain.json',
];

// Les images de carte sont listées dans data/maps.json : on les met aussi hors-ligne.
async function precache() {
  const cache = await caches.open(CACHE);
  await cache.addAll(SHELL);
  try {
    const res = await fetch('./data/maps.json', { cache: 'no-cache' });
    if (res.ok) {
      const files = (await res.json()).files || [];
      await Promise.all(files.map((f) => cache.add('./' + f).catch(() => {})));
    }
  } catch (e) {
    // sans cartes, l'application reste utilisable
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
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
