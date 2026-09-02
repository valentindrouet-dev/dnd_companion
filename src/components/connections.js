// Sorties : boutons compacts, flèche orientée selon la position réelle des salles,
// et alerte quand la porte est fermée, verrouillée, piégée ou secrète.

import { h } from '../dom.js';
import { icon } from '../icons.js';
import { roomLinks } from '../data.js';
import { navigate, roomPath } from '../router.js';
import { roomSpot } from './map.js';
import { direction } from '../util.js';
import { filterVariant, enhancedStar } from '../variant.js';

// Type de porte -> [libellé, classe, icône]
const DOORS = {
  fermee: ['Fermée', 'info', 'door'],
  verrouillee: ['Verrouillée', 'danger', 'lock'],
  barricadee: ['Barricadée', 'danger', 'alert'],
  piegee: ['Piégée', 'danger', 'trap'],
  secrete: ['Secrète', 'accent', 'lock'],
  hermetique: ['Hermétique', 'info', 'water'],
  magique: ['Verrou magique', 'accent', 'wand'],
  double: ['Double battant', '', 'door'],
  effondre: ['Éboulis', '', 'layers'],
  toboggan: ['Toboggan', 'info', 'forward'],
};

function doorKey(v) {
  return String(v ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
}

export function doorPill(c) {
  const k = doorKey(c.door || (c.secret ? 'secrete' : ''));
  const d = DOORS[k];
  if (!d) return null;
  const [label, cls, ico] = d;
  return h('span', { class: 'pill ' + cls }, icon(ico), label);
}

export function connectionCards(adv, room) {
  const { declared, back } = roomLinks(adv, room);
  const all = [...filterVariant(declared).map((c) => ({ ...c, implicit: false })), ...filterVariant(back)];
  if (!all.length) return null;
  const from = roomSpot(adv.map, room.id);

  return h('div', { class: 'exits' }, all.map((c) => {
    const target = adv.roomById.get(c.to);
    if (!target) return h('div', { class: 'exit' }, h('span', { class: 'num' }, '?'), h('span', { class: 'name' }, `Salle inconnue : ${c.to}`));
    const dir = direction(from, roomSpot(adv.map, c.to));
    const pill = doorPill(c);
    return h('button', {
      class: 'exit' + (c.implicit ? ' is-back' : ''),
      onclick: () => navigate(roomPath(adv.id, target.id)),
      title: [c.via, c.note].filter(Boolean).join(' — '),
    },
      dir ? h('span', { class: 'dir', style: { '--a': (90 - dir.angle) + 'deg' }, title: `Vers le ${dir.long}` }, icon('forward'), h('i', null, dir.short)) : h('span', { class: 'dir none' }, icon('door')),
      h('span', { class: 'num' }, target.number ?? '•'),
      h('span', { class: 'name' }, target.name),
      pill,
      enhancedStar(c),
      c.alert ? h('span', { class: 'pill danger', title: c.alert }, icon('alert')) : null);
  }));
}
