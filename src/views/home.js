import { h } from '../dom.js';
import { icon } from '../icons.js';
import { getIndex, loadAdventure } from '../data.js';
import { store } from '../store.js';
import { navigate, advPath, roomPath, listPath } from '../router.js';
import { shell } from './shell.js';
import { openEncounterPopup } from '../encounters/ui.js';

export async function homeView() {
  const advs = getIndex().adventures || [];
  const main = h('div', null,
    h('div', { class: 'hero' }, h('h1', null, 'Compagnon D&D')),
    advs.length ? advs.map(adventureCard) : h('div', { class: 'empty' }, 'Aucune aventure dans data/index.json.'),
    h('div', { class: 'toolbar', style: { marginTop: '18px' } },
      h('button', { class: 'btn', onclick: () => navigate('index') }, icon('book'), 'Index'),
      h('button', { class: 'btn', onclick: () => navigate('bestiaire') }, icon('skull'), 'Bestiaire'),
      h('button', { class: 'btn', onclick: () => openEncounterPopup({}) }, icon('dice'), 'Rencontre'),
      h('button', { class: 'btn btn-icon', 'aria-label': 'Réglages', onclick: () => navigate('reglages') }, icon('settings'))));

  return shell({ title: 'Compagnon D&D', main });
}

function adventureCard(a) {
  const resume = store.flag(a.id) || store.lastRoom(a.id);
  const flagged = !!store.flag(a.id);
  const done = store.doneCount(a.id);
  return h('div', { class: 'adv-card' },
    h('div', { class: 'adv-line' },
      h('h2', null, a.title),
      a.levels ? h('span', { class: 'pill accent' }, `Niv. ${a.levels}`) : null,
      done ? h('span', { class: 'pill ok' }, icon('check'), `${done} faites`) : null),
    h('div', { class: 'toolbar' },
      h('button', { class: 'btn btn-primary', onclick: () => navigate(advPath(a.id)) }, icon('map'), 'Ouvrir'),
      h('button', { class: 'btn', onclick: () => navigate(listPath(a.id)) }, icon('list'), 'Salles'),
      resume ? h('button', { class: 'btn' + (flagged ? ' is-flag' : ''), onclick: () => navigate(roomPath(a.id, resume)) }, icon(flagged ? 'flag' : 'forward'), 'Reprendre') : null));
}
