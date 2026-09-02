// Liste plate de toutes les salles, triée par numéro : accès rapide + cases « faite ».

import { h } from '../dom.js';
import { icon } from '../icons.js';
import { loadAdventure } from '../data.js';
import { store } from '../store.js';
import { navigate, roomPath, advPath } from '../router.js';
import { shell } from './shell.js';
import { roomSidebar } from './sidebar.js';
import { slug, compareRoomNumbers } from '../util.js';

let query = '';
let hideDone = false;
let queryAdv = null;

function norm(s) { return String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

export async function roomListView(route) {
  const adv = await loadAdventure(route.adv);
  if (queryAdv !== adv.id) { queryAdv = adv.id; query = ''; hideDone = false; }

  const rooms = [...adv.rooms].sort((a, b) => compareRoomNumbers(a.number, b.number));
  const total = rooms.length;
  const done = store.doneCount(adv.id);

  const list = h('div');
  const input = h('input', {
    class: 'input', type: 'search', placeholder: 'N°, nom, étiquette…', value: query,
    oninput: (e) => { query = e.target.value; build(); },
  });
  const hideBtn = h('button', { class: 'btn' + (hideDone ? ' is-on' : ''), onclick: () => { hideDone = !hideDone; hideBtn.classList.toggle('is-on', hideDone); build(); } },
    icon('eyeOff'), 'Cacher les faites');

  function build() {
    list.replaceChildren();
    const q = norm(query.trim());
    const match = (r) => !q || norm(r.number).startsWith(q) || norm(r.name).includes(q) || (r.tags || []).some((t) => norm(t).includes(q)) || norm(adv.sectionById.get(r.section)?.title).includes(q);
    const shown = rooms.filter((r) => match(r) && !(hideDone && store.isDone(adv.id, r.id)));
    if (!shown.length) { list.append(h('div', { class: 'empty' }, 'Aucune salle ne correspond.')); return; }
    for (const r of shown) {
      const isDone = store.isDone(adv.id, r.id);
      const section = adv.sectionById.get(r.section);
      list.append(h('div', { class: 'list-row' + (isDone ? ' is-done' : '') },
        h('button', { class: 'list-main', onclick: () => navigate(roomPath(adv.id, r.id)) },
          h('span', { class: 'num' }, r.number ?? '•'),
          h('span', { class: 'text' },
            h('span', { class: 'name' }, r.name),
            h('span', { class: 'sec' }, [section?.title, (r.tags || []).join(' · ')].filter(Boolean).join(' — '))),
          h('span', { class: 'tags' }, (r.tags || []).slice(0, 3).map((t) => h('span', { class: 'tag ' + slug(t) }, t)))),
        h('button', {
          class: 'btn btn-icon check' + (isDone ? ' is-done' : ''),
          'aria-label': isDone ? 'Décocher la salle' : 'Cocher la salle',
          onclick: () => store.toggleDone(adv.id, r.id),
        }, icon('check'))));
    }
  }
  build();

  const main = h('div', null,
    h('div', { class: 'hero' },
      h('h1', null, 'Liste des salles'),
      h('p', null, `${done} / ${total} salles faites · appuie sur la coche pour marquer une salle, sur la ligne pour l’ouvrir.`)),
    h('div', { class: 'toolbar', style: { marginBottom: '14px' } },
      h('div', { class: 'search', style: { flex: '1', minWidth: '220px' } }, icon('search'), input),
      hideBtn),
    list);

  return shell({ title: adv.title, subtitle: 'Liste des salles', back: advPath(adv.id), sidebar: roomSidebar(adv, 'liste'), main });
}
