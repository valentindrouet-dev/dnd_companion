// Point d'entrée : chargement des données, routeur, rendu des vues, liens internes, service worker.

import { loadIndex, getIndex, loadMonsters, prefetchAll } from './data.js';
import { parseRoute, onRoute, navigate, roomPath } from './router.js';
import { store } from './store.js';
import { h } from './dom.js';
import { homeView } from './views/home.js';
import { adventureView } from './views/adventure.js';
import { roomView } from './views/room.js';
import { roomListView } from './views/roomlist.js';
import { bestiaryView } from './views/bestiary.js';
import { settingsView } from './views/settings.js';
import { openMonsterPopup } from './components/monster.js';
import { closeAllPopups } from './ui/popup.js';
import { loadMaps } from './components/map.js';
import { loadGlossary, setGlossaryScope, linkGlossary, openGlossaryPopup } from './glossary.js';
import { loadLoot } from './loot/generator.js';
import { setTextDecorator } from './markup.js';
import { glossaryView } from './views/glossary.js';
import { lootView } from './views/loot.js';
import { magicView } from './views/magic.js';
import { toast } from './ui/toast.js';
import { registerServiceWorker } from './update.js';

const app = document.getElementById('app');
let renderToken = 0;

/** Portées du glossaire : une par aventure, plus la portée globale sous la clé ''. */
function glossaryScopes() {
  const idx = getIndex();
  const scopes = new Map([['', idx.glossary || []]]);
  for (const a of idx.adventures || []) if (a.glossary) scopes.set(a.id, a.glossary);
  return scopes;
}

function applySettings() {
  const s = store.settings;
  document.documentElement.dataset.theme = s.theme || 'dark';
  document.documentElement.style.setProperty('--fs', `${Math.round(17 * (s.fontScale || 1))}px`);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = s.theme === 'light' ? '#ebe6da' : '#15171b';
}

async function buildView(route) {
  // chaque donjon a son propre index : on bascule dessus avant de rendre quoi que ce soit
  setGlossaryScope(route.adv || null);
  switch (route.name) {
    case 'adventure': return adventureView(route);
    case 'room': return roomView(route);
    case 'roomlist': return roomListView(route);
    case 'bestiary': return bestiaryView(route);
    case 'glossary': return glossaryView(route);
    case 'loot': return lootView(route);
    case 'magic': return magicView(route);
    case 'settings': return settingsView(route);
    default: return homeView(route);
  }
}

function errorView(e) {
  console.error(e);
  return h('div', { class: 'main', style: { padding: '40px' } },
    h('div', { class: 'empty' }, h('b', null, 'Erreur : '), e.message, h('br'), h('a', { href: '#/' }, 'Retour à l’accueil')));
}

async function render({ keepScroll = false } = {}) {
  const token = ++renderToken;
  const route = parseRoute();
  const main = app.querySelector('.main');
  const scroll = keepScroll && main ? main.scrollTop : 0;
  let view;
  try { view = await buildView(route); } catch (e) { view = errorView(e); }
  if (token !== renderToken) return; // une navigation plus récente a eu lieu
  app.replaceChildren(view);
  const m = app.querySelector('.main');
  if (m) m.scrollTop = scroll;
}

// Liens internes du balisage : [[m:id]] ouvre la fiche, [[r:id]] navigue vers la salle.
document.addEventListener('click', (e) => {
  const a = e.target.closest?.('a.ref[data-ref], a.gref[data-ref]');
  if (!a) return;
  e.preventDefault();
  const [type, id] = a.dataset.ref.split(':');
  if (type === 'm') openMonsterPopup(id);
  else if (type === 'g') openGlossaryPopup(id, { adv: parseRoute().adv || null });
  else if (type === 'r') {
    const route = parseRoute();
    if (route.adv) { closeAllPopups(); navigate(roomPath(route.adv, id)); }
  }
});

async function boot() {
  applySettings();
  try {
    await loadIndex();
    await loadMonsters();
    await loadMaps();
    await loadGlossary(glossaryScopes());
    await loadLoot(getIndex().loot || [], getIndex().magicItems || []);
    setTextDecorator(linkGlossary);
  } catch (e) {
    app.replaceChildren(errorView(e));
    return;
  }
  await render();
  onRoute(() => { closeAllPopups(); render(); });
  store.subscribe(() => { applySettings(); render({ keepScroll: true }); });
  registerServiceWorker();
  prefetchAll();
}

boot();
