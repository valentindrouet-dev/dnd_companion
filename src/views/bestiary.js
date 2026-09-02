// Bestiaire : recherche rapide dans toutes les fiches de monstres.

import { h } from '../dom.js';
import { icon } from '../icons.js';
import { allMonsters } from '../data.js';
import { shell } from './shell.js';
import { card, pill } from '../components/card.js';
import { openMonsterPopup } from '../components/monster.js';

let query = '';
function norm(s) { return String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

export async function bestiaryView(route) {
  const list = h('div');
  const input = h('input', { class: 'input', type: 'search', placeholder: 'Nom, type, FP…', value: query, oninput: (e) => { query = e.target.value; build(); } });

  function build() {
    list.replaceChildren();
    const q = norm(query.trim());
    const items = allMonsters().filter((m) => !q || norm(m.name).includes(q) || norm(m.nameEn).includes(q) || norm(m.type).includes(q) || norm('fp ' + m.cr) === q || String(m.cr) === q);
    if (!items.length) { list.append(h('div', { class: 'empty' }, 'Aucune créature ne correspond.')); return; }
    list.append(h('div', { class: 'grid-2' }, items.map((m) => card({
      key: 'bestiaire/' + m.id,
      badge: `FP ${m.cr ?? '?'}`,
      badgeClass: 'danger',
      title: m.name,
      pills: [m.nameEn ? pill(m.nameEn) : null],
      sub: [m.size, m.type].filter(Boolean).join(' · '),
      sub2: m.summary?.style,
      noNote: true,
      onOpen: () => openMonsterPopup(m.id),
    }))));
  }
  build();

  if (route.monster) setTimeout(() => openMonsterPopup(route.monster), 0);

  const main = h('div', null,
    h('div', { class: 'hero' }, h('h1', null, 'Bestiaire'), h('p', null, `${allMonsters().length} créatures disponibles hors-ligne.`)),
    h('div', { class: 'search', style: { marginBottom: '16px' } }, icon('search'), input),
    list);

  return shell({ title: 'Bestiaire', back: '', main });
}
