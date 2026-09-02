import { h } from '../dom.js';
import { icon } from '../icons.js';
import { getIndex } from '../data.js';
import { store } from '../store.js';
import { navigate, advPath, roomPath } from '../router.js';
import { shell } from './shell.js';

export async function homeView() {
  const index = getIndex();
  const advs = index.adventures || [];

  const main = h('div', null,
    h('div', { class: 'hero' },
      h('h1', null, 'Compagnon de table'),
      h('p', null, 'D&D 5e (2024) — salles, créatures, dialogues et trésors, à portée de doigt.')),
    advs.length ? advs.map((a) => adventureCard(a)) : h('div', { class: 'empty' }, 'Aucune aventure dans data/index.json.'),
    h('hr', { class: 'sep' }),
    h('div', { class: 'toolbar' },
      h('button', { class: 'btn', onclick: () => navigate('bestiaire') }, icon('skull'), 'Bestiaire'),
      h('button', { class: 'btn', onclick: () => navigate('reglages') }, icon('settings'), 'Réglages')),
    h('p', { class: 'muted small', style: { marginTop: '24px' } }, `Version ${self.APP_VERSION}`));

  return shell({ title: 'Compagnon D&D', main });
}

function adventureCard(a) {
  const last = store.lastRoom(a.id);
  return h('div', { class: 'adv-card' },
    h('h2', null, a.title),
    h('div', { class: 'sub' }, [a.levels ? `Niveaux ${a.levels}` : null, a.source].filter(Boolean).join(' · ')),
    a.summary ? h('p', null, a.summary) : null,
    h('div', { class: 'toolbar' },
      h('button', { class: 'btn btn-primary', onclick: () => navigate(advPath(a.id)) }, icon('map'), 'Ouvrir'),
      last ? h('button', { class: 'btn', onclick: () => navigate(roomPath(a.id, last)) }, icon('flag'), 'Reprendre à la dernière salle') : null));
}
