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
import { loadGlossary, linkGlossary, openGlossaryPopup } from './glossary.js';
import { setTextDecorator } from './markup.js';
import { glossaryView } from './views/glossary.js';
import { toast } from './ui/toast.js';
import { registerServiceWorker } from './update.js';

const app = document.getElementById('app');
let renderToken = 0;

function applySettings() {
  const s = store.settings;
  document.documentElement.dataset.theme = s.theme || 'dark';
  document.documentElement.style.setProperty('--fs', `${Math.round(17 * (s.fontScale || 1))}px`);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = s.theme === 'light' ? '#ebe6da' : '#15171b';
}

async function buildView(route) {
  switch (route.name) {
    case 'adventure': return adventureView(route);
    case 'room': return roomView(route);
    case 'roomlist': return roomListView(route);
    case 'bestiary': return bestiaryView(route);
    case 'glossary': return glossaryView(route);
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
  else if (type === 'g') openGlossaryPopup(id);
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
    await loadGlossary(getIndex().glossary || []);
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
