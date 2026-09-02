// Mise à jour de l'application installée sur l'écran d'accueil.
//
// Sur iPad, refermer puis rouvrir l'app ne recharge pas forcément la page : iOS la
// restaure telle quelle. Il faut donc chercher activement les nouvelles versions et
// recharger nous-mêmes. Rien de tout cela ne touche aux données du MJ : notes,
// coches, annotations et statuts vivent dans localStorage, que ni le cache ni le
// service worker n'effacent.

import { h } from './dom.js';
import { icon } from './icons.js';

const CHECK_INTERVAL = 30 * 1000;   // anti-rebond : un aller-retour rapide ne relance pas la vérification
let registration = null;
let lastCheck = 0;
let banner = null;
let reloading = false;

export function currentVersion() { return self.APP_VERSION; }

/** Version affichée : « 0.12 » plutôt que « 0.12.0 », mais « 0.12.1 » sur un correctif. */
export function shortVersion(v = self.APP_VERSION) {
  return String(v ?? '').replace(/^(\d+\.\d+)\.0$/, '$1');
}

/** Version publiée, lue sans passer par le moindre cache. */
async function publishedVersion() {
  try {
    const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()).version || null;
  } catch { return null; }
}

function reloadOnce() {
  if (reloading) return;
  reloading = true;
  location.reload();
}

/** Affiche la barre « nouvelle version », une seule fois. */
function showBanner(version) {
  if (banner) return;
  banner = h('div', { class: 'update-bar' },
    icon('refresh'),
    h('span', null, version ? `Version ${version} disponible` : 'Nouvelle version disponible'),
    h('button', { class: 'btn btn-sm btn-primary', onclick: () => applyUpdate() }, 'Mettre à jour'),
    h('button', { class: 'btn btn-sm btn-icon btn-ghost', 'aria-label': 'Plus tard', onclick: () => { banner.remove(); banner = null; } }, icon('x')));
  document.body.append(banner);
}

/**
 * Applique la mise à jour : on laisse la main au service worker en attente, et
 * s'il ne se manifeste pas, on vide le cache et on recharge. Les données restent.
 */
export async function applyUpdate() {
  if (banner) banner.querySelector('button').textContent = 'Mise à jour…';
  const reg = registration || (await navigator.serviceWorker?.getRegistration?.());
  reg?.waiting?.postMessage({ type: 'SKIP_WAITING' });

  // Filet : si le service worker ne prend pas la main, on force le rechargement.
  setTimeout(async () => {
    try {
      for (const key of await caches.keys()) await caches.delete(key);
      await reg?.update();
    } catch { /* on recharge quand même */ }
    reloadOnce();
  }, 1500);
}

/** Cherche une nouvelle version : service worker, puis comparaison des numéros. */
export async function checkForUpdate({ force = false } = {}) {
  if (!force && Date.now() - lastCheck < CHECK_INTERVAL) return null;
  lastCheck = Date.now();

  try { await registration?.update(); } catch { /* hors-ligne : on réessaiera */ }

  const published = await publishedVersion();
  if (published && published !== currentVersion()) { showBanner(published); return published; }
  if (registration?.waiting) { showBanner(null); return 'waiting'; }
  return null;
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('./sw.js').then((reg) => {
    registration = reg;
    if (reg.waiting && navigator.serviceWorker.controller) showBanner(null);
    reg.addEventListener('updatefound', () => {
      const worker = reg.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) showBanner(null);
      });
    });
  }).catch((e) => console.warn('Service worker non enregistré', e));

  // Un nouveau service worker a remplacé l'ancien : on recharge pour afficher la nouvelle
  // version. La toute première prise de contrôle, elle, ne doit rien recharger.
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController) reloadOnce(); });

  // iOS ne recharge pas l'app quand on la rouvre : on vérifie à chaque retour au premier plan.
  checkForUpdate({ force: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate();
  });
  addEventListener('online', () => checkForUpdate({ force: true }));
}
