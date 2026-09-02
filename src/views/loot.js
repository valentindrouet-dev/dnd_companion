// Page des récoltes : toutes les tables de butin, dépliables, avec leurs probabilités.

import { h } from '../dom.js';
import { icon } from '../icons.js';
import { markup } from '../markup.js';
import { getMonster } from '../data.js';
import { shell } from './shell.js';
import { band, bandBar, expandAll } from '../components/band.js';
import { openLootPopup } from '../loot/ui.js';
import { openMonsterPopup } from '../components/monster.js';
import { lootCreatures, expectedValue, averageRoll, lineValue } from '../loot/generator.js';

const TYPES = [
  ['', 'Toutes les catégories'],
  ['human', 'Humains'], ['humanoid', 'Humanoïdes'], ['beast', 'Bêtes'], ['swarm', 'Nuées'],
  ['monstrosity', 'Monstruosités'], ['aberration', 'Aberrations'], ['undead', 'Morts-vivants'],
  ['fiend', 'Fiélons'], ['celestial', 'Célestes'], ['ooze', 'Vases'], ['plant', 'Plantes'],
  ['construct', 'Créatures artificielles'], ['elemental', 'Élémentaires'], ['giant', 'Géants'],
];
const TYPE_LABEL = Object.fromEntries(TYPES.map(([v, l]) => [v, l.replace(/s$/, '')]));

let query = '';
let type = '';
const open = new Set();

const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export async function lootView() {
  const list = h('div');
  const input = h('input', {
    class: 'input', type: 'search', placeholder: 'Créature, objet, composante…', value: query,
    oninput: (e) => { query = e.target.value; build(); },
  });
  const select = h('select', { class: 'select', style: { width: 'auto' }, onchange: (e) => { type = e.target.value; build(); } },
    TYPES.map(([v, l]) => h('option', { value: v, selected: v === type }, l)));

  function matches(c, q) {
    if (!q) return true;
    return norm(c.name).includes(q) || norm(c.en).includes(q)
      || (c.loot || []).some((l) => norm(l.name).includes(q) || norm(l.en).includes(q) || norm(l.use).includes(q))
      || (c.match || []).some((id) => norm(getMonster(id)?.name).includes(q));
  }

  function build() {
    const q = norm(query.trim());
    const items = lootCreatures().filter((c) => (!type || c.type === type) && matches(c, q));
    // replaceChildren est du DOM natif : il faut lui passer des nœuds, pas un tableau.
    list.replaceChildren(h('div', null,
      bandBar([
        [items.length, 'table(s)'],
        [items.reduce((n, c) => n + c.loot.length, 0), 'lignes de butin'],
        [items.reduce((n, c) => n + (c.match || []).length, 0), 'créatures du bestiaire'],
      ], expandAll(items.map((c) => c.id), open, build)),
      items.length ? items.map(row) : h('div', { class: 'empty' }, 'Aucune table ne correspond.')));
  }

  function row(c) {
    const isOpen = open.has(c.id);
    const ev = expectedValue(c);
    return band({
      tone: c.type,
      title: c.name,
      open: isOpen,
      onToggle: () => { isOpen ? open.delete(c.id) : open.add(c.id); build(); },
      meta: [
        h('span', { class: 'pill info' }, `${c.check.skill} DD ${c.check.dc}`),
        h('span', { class: 'pill' }, c.duration),
        h('span', { class: 'pill accent' }, `≈ ${ev.po} po`),
        h('span', null, `${c.loot.length} lignes`),
      ],
      body: () => details(c, ev),
    });
  }

  function details(c, ev) {
    const covered = (c.match || []).map(getMonster).filter(Boolean);
    return h('div', null,
      h('div', { class: 'block b-read' }, h('div', { class: 'block-body read' }, c.description)),
      h('div', { class: 'loot-list proba' }, c.loot.map(lootLine)),
      h('div', { class: 'block b-danger' },
        h('div', { class: 'block-head' }, h('div', { class: 'block-kind' }, icon('alert'), 'Échec critique (1 naturel)')),
        markup(c.danger, 'div', 'block-body')),
      h('div', { class: 'muted small', style: { margin: '6px 0' } },
        `Gain moyen ≈ ${ev.po} po par cadavre`,
        ev.magic ? ` · ${ev.magic} % de chance d’un objet magique` : '',
        ev.unpriced ? ` · ${ev.unpriced} % d’objets laissés à ta discrétion` : ''),
      h('div', { class: 'toolbar' },
        h('button', { class: 'btn btn-sm btn-primary', onclick: () => openLootPopup({ creatureId: c.id }) }, icon('dice'), 'Fouiller'),
        covered.map((m) => h('button', { class: 'btn btn-sm btn-ghost', onclick: () => openMonsterPopup(m.id) }, icon('skull'), m.name))),
      covered.length ? null : h('div', { class: 'muted small' }, 'Aucune créature du bestiaire n’utilise cette table pour l’instant.'));
  }

  function lootLine(l) {
    const unit = lineValue(l);
    const avg = averageRoll(l.qty);
    return h('div', { class: 'loot-row' + (l.magic ? ' magic' : '') + (l.coin ? ' coins' : '') },
      h('span', { class: 'lname' }, l.emoji ? l.emoji + ' ' : '', l.name,
        l.brokenName ? h('span', { class: 'muted' }, ' · ou ', l.brokenName.toLowerCase()) : null,
        l.magic ? h('span', { class: 'muted' }, ` · table ${l.magic}`) : null),
      h('span', { class: 'lval' }, l.qty, l.value ? ' · ' + l.value : l.coin ? ' · po' : '', l.use ? ' · ' + l.use : ''),
      h('span', { class: 'lp ' + (l.p >= 50 ? 'hi' : l.p >= 30 ? 'mid' : 'lo') }, `${l.p} %`),
      h('span', { class: 'lev muted small' }, unit ? `${Math.round(l.p / 100 * avg * unit)} po` : '—'));
  }

  build();

  const main = h('div', null,
    h('div', { class: 'hero' }, h('h1', null, 'Récoltes')),
    h('div', { class: 'toolbar', style: { marginBottom: '14px' } },
      h('div', { class: 'search', style: { flex: '1', minWidth: '200px' } }, icon('search'), input),
      select,
      h('button', { class: 'btn', onclick: () => openLootPopup({}) }, icon('gem'), 'Fouiller')),
    list);

  return shell({ title: 'Récoltes', back: '', main });
}
