// Liste compacte de toutes les salles, sur deux colonnes, triée par numéro :
// accès rapide, pourcentage d'avancement et case « faite ».

import { h } from '../dom.js';
import { icon, tagIcon } from '../icons.js';
import { loadAdventure } from '../data.js';
import { store } from '../store.js';
import { navigate, roomPath, advPath } from '../router.js';
import { shell } from './shell.js';
import { roomSidebar } from './sidebar.js';
import { compareRoomNumbers, slug } from '../util.js';
import { roomProgress } from '../progress.js';

let query = '';
let hideDone = false;
let queryAdv = null;

function norm(s) { return String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

export async function roomListView(route) {
  const adv = await loadAdventure(route.adv);
  if (queryAdv !== adv.id) { queryAdv = adv.id; query = ''; hideDone = false; }

  const rooms = [...adv.rooms].sort((a, b) => compareRoomNumbers(a.number, b.number));
  const list = h('div', { class: 'room-list' });
  const input = h('input', {
    class: 'input', type: 'search', placeholder: 'N°, nom, étiquette…', value: query,
    oninput: (e) => { query = e.target.value; build(); },
  });
  const hideBtn = h('button', {
    class: 'btn btn-sm' + (hideDone ? ' is-on' : ''),
    onclick: () => { hideDone = !hideDone; hideBtn.classList.toggle('is-on', hideDone); build(); },
  }, icon('eyeOff'), 'Masquer faites');
  const counter = h('span', { class: 'pill' });

  function build() {
    list.replaceChildren();
    const q = norm(query.trim());
    const match = (r) => !q || norm(r.number).startsWith(q) || norm(r.name).includes(q)
      || (r.tags || []).some((t) => norm(t).includes(q)) || norm(adv.sectionById.get(r.section)?.title).includes(q);
    const shown = rooms.filter((r) => match(r) && !(hideDone && store.isDone(adv.id, r.id)));
    const done = rooms.filter((r) => store.isDone(adv.id, r.id)).length;
    counter.replaceChildren(document.createTextNode(`${done} / ${rooms.length}`));
    counter.className = 'pill' + (done === rooms.length ? ' ok' : '');
    if (!shown.length) { list.append(h('div', { class: 'empty' }, 'Aucune salle ne correspond.')); return; }
    for (const r of shown) list.append(row(adv, r));
  }
  build();

  const main = h('div', null,
    h('div', { class: 'toolbar list-toolbar' },
      h('div', { class: 'search', style: { flex: '1', minWidth: '180px' } }, icon('search'), input),
      counter, hideBtn),
    list);

  return shell({ title: adv.title, subtitle: 'Salles', back: advPath(adv.id), sidebar: roomSidebar(adv, 'liste'), main });
}

function row(adv, r) {
  const p = roomProgress(adv.id, r);
  const isDone = store.isDone(adv.id, r.id);
  return h('div', { class: 'lrow' + (isDone ? ' is-done' : '') },
    h('button', { class: 'lrow-main', onclick: () => navigate(roomPath(adv.id, r.id)) },
      h('span', { class: 'num' }, r.number ?? '•'),
      h('span', { class: 'name' }, r.name),
      h('span', { class: 'ltags' }, (r.tags || []).slice(0, 3).map((t) => {
        const ico = tagIcon(t);
        return ico ? h('span', { class: 'ltag ' + slug(t), title: t }, icon(ico)) : null;
      })),
      h('span', { class: 'lpct' }, p.total ? `${p.pct}%` : '—'),
      h('span', { class: 'lbar' }, h('i', { style: { width: p.pct + '%' } }))),
    h('button', {
      class: 'lcheck' + (isDone ? ' is-done' : ''),
      'aria-label': isDone ? 'Décocher la salle' : 'Cocher la salle',
      onclick: () => store.toggleDone(adv.id, r.id),
    }, icon('check')));
}
