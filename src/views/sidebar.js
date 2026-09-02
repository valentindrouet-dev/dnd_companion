// Panneau latéral : liste des salles de l'aventure, filtrable, avec l'état « visitée ».

import { h } from '../dom.js';
import { icon } from '../icons.js';
import { store } from '../store.js';
import { navigate, roomPath, advPath } from '../router.js';
import { closeDrawer } from './shell.js';

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

    list.append(h('button', { class: 'side-room' + (currentId == null ? ' is-current' : ''), onclick: () => go(advPath(adv.id)) },
      h('span', { class: 'num' }, icon('map')), h('span', { class: 'name' }, 'Vue d’ensemble')));

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
          store.isVisited(adv.id, r.id) ? h('span', { class: 'visited' }, icon('check')) : null))));
    }
  }
  build();

  return h('div', null, h('div', { class: 'search' }, icon('search'), input), list);
}
