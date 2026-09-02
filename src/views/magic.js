// Page des objets magiques : toutes les tables du DMG, et le tirage manuel.

import { h } from '../dom.js';
import { icon } from '../icons.js';
import { shell } from './shell.js';
import { band, bandBar, expandAll } from '../components/band.js';
import { openMagicPopup, raritySlug } from '../loot/magic.js';
import { magicTypes, magicRarities, magicItemCount } from '../loot/generator.js';

let query = '';
let rarity = '';

const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const open = new Set();

export async function magicView() {
  const list = h('div');
  const input = h('input', {
    class: 'input', type: 'search', placeholder: 'Nom d’objet…', value: query,
    oninput: (e) => { query = e.target.value; build(); },
  });
  const select = h('select', { class: 'select', style: { width: 'auto' }, onchange: (e) => { rarity = e.target.value; build(); } },
    h('option', { value: '' }, 'Toutes les raretés'),
    magicRarities().map((r) => h('option', { value: r, selected: r === rarity }, r)));

  /** Objets d'un type qui passent la recherche et le filtre, groupés par rareté. */
  function kept(t) {
    const q = norm(query.trim());
    const out = [];
    for (const r of magicRarities()) {
      if (rarity && r !== rarity) continue;
      const items = (t.items[r] || []).filter((i) => !q || norm(i.n).includes(q));
      if (items.length) out.push([r, items]);
    }
    return out;
  }

  function build() {
    const types = magicTypes().map((t) => ({ t, groups: kept(t) })).filter(({ groups }) => groups.length);
    const total = types.reduce((n, { groups }) => n + groups.reduce((m, [, l]) => m + l.length, 0), 0);
    list.replaceChildren(h('div', null,
      bandBar([[total, 'objet(s)'], [types.length, 'catégories'], [magicItemCount(), 'au catalogue']],
        expandAll(types.map(({ t }) => t.id), open, build)),
      types.length ? types.map(row) : h('div', { class: 'empty' }, 'Aucun objet ne correspond.')));
  }

  function row({ t, groups }) {
    const isOpen = open.has(t.id);
    const n = groups.reduce((m, [, l]) => m + l.length, 0);
    return band({
      title: h('span', null, t.emoji + ' ', t.plural),
      open: isOpen,
      onToggle: () => { isOpen ? open.delete(t.id) : open.add(t.id); build(); },
      meta: [
        h('span', null, `${n} objets`),
        h('button', {
          class: 'btn btn-sm', onclick: (e) => { e.stopPropagation(); openMagicPopup({ typeId: t.id }); },
        }, icon('dice'), 'Tirer'),
      ],
      body: () => h('div', null,
        h('p', { class: 'muted small', style: { marginTop: 0 } }, t.description,
          t.generic ? ` Les « ${t.generic}X » génériques ne sortent que 4 fois sur 10.` : ''),
        groups.map(([r, items]) => h('div', { style: { marginBottom: '10px' } },
          h('div', { class: 'block-kind' }, h('span', { class: 'rar rar-' + raritySlug(r) }, r), ` — ${items.length}`),
          h('div', { class: 'loot-list' }, items.map((i) => h('div', { class: 'loot-row' },
            h('span', { class: 'lname' }, i.n),
            h('span', { class: 'mi-variant' }, i.v))))))),
    });
  }
  build();

  const main = h('div', null,
    h('div', { class: 'hero' }, h('h1', null, 'Objets magiques')),
    h('div', { class: 'toolbar', style: { marginBottom: '14px' } },
      h('div', { class: 'search', style: { flex: '1', minWidth: '200px' } }, icon('search'), input),
      select,
      h('button', { class: 'btn btn-primary', onclick: () => openMagicPopup({}) }, icon('wand'), 'Tirer un objet')),
    list);

  return shell({ title: 'Objets magiques', back: '', main });
}
