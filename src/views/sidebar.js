// Panneau latéral : liste des salles de l'aventure, filtrable, avec l'état « visitée ».

import { h } from '../dom.js';
import { icon } from '../icons.js';
import { store } from '../store.js';
import { navigate, roomPath, advPath, listPath } from '../router.js';
import { closeDrawer } from './shell.js';
import { roomStatus, statusTally, ROOM_STATUSES } from '../progress.js';

let filterText = '';
let filterAdv = null;

function norm(s) { return String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

export function roomSidebar(adv, currentId) {
  if (filterAdv !== adv.id) { filterAdv = adv.id; filterText = ''; }

  const list = h('div');
  const input = h('input', {
    class: 'input', type: 'search', placeholder: 'N° ou nom de salle…', value: filterText,
    oninput: (e) => { filterText = e.target.value; build(); },
  });

  function go(path) { closeDrawer(); navigate(path); }

  function build() {
    list.replaceChildren();
    const q = norm(filterText.trim());
    const match = (r) => !q || norm(r.number).startsWith(q) || norm(r.name).includes(q) || (r.tags || []).some((t) => norm(t).includes(q));

    list.append(h('button', { class: 'side-room' + (currentId === null ? ' is-current' : ''), onclick: () => go(advPath(adv.id)) },
      h('span', { class: 'num' }, icon('map')), h('span', { class: 'name' }, 'Vue d’ensemble')));
    list.append(h('button', { class: 'side-room' + (currentId === 'liste' ? ' is-current' : ''), onclick: () => go(listPath(adv.id)) },
      h('span', { class: 'num' }, icon('list')), h('span', { class: 'name' }, 'Liste des salles'),
      h('span', { class: 'tallies small' }, ROOM_STATUSES.map(([k, label, cls]) =>
        h('span', { class: 'tally ' + cls, title: label }, String(statusTally(adv)[k]))))));

    const orphans = adv.roomOrder.filter((r) => !adv.sectionById.has(r.section));
    const groups = [...adv.sections.map((s) => ({ title: s.title, rooms: (s.rooms || []).map((id) => adv.roomById.get(id)).filter(Boolean) }))];
    if (orphans.length) groups.push({ title: 'Autres salles', rooms: orphans });

    for (const g of groups) {
      const rooms = g.rooms.filter(match);
      if (!rooms.length) continue;
      list.append(h('div', { class: 'side-section' },
        h('div', { class: 'side-section-title' }, g.title),
        rooms.map((r) => h('button', { class: 'side-room' + (r.id === currentId ? ' is-current' : ''), onclick: () => go(roomPath(adv.id, r.id)) },
          h('span', { class: 'num' }, r.number ?? '•'),
          h('span', { class: 'name' }, r.name),
          h('span', { class: 'dot ' + roomStatus(adv.id, r).cls })))));
    }
  }
  build();

  return h('div', null, h('div', { class: 'search' }, icon('search'), input), list);
}
