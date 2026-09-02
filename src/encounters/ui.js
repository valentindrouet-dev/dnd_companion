// Fenêtre du générateur de rencontres.

import { h } from '../dom.js';
import { icon } from '../icons.js';
import { store } from '../store.js';
import { openPopup } from '../ui/popup.js';
import { toast } from '../ui/toast.js';
import { allMonsters, getMonster } from '../data.js';
import { openMonsterPopup } from '../components/monster.js';
import { generateEncounter, budgetFor, DIFFICULTIES } from './generator.js';

let level = 6;
let party = 4;
let difficulty = 'moderate';
let scope = 'adv';
let last = null;

/** Créatures effectivement utilisées par une aventure. */
function adventurePool(adv) {
  const ids = new Set();
  for (const r of adv?.rooms || []) {
    for (const e of r.enemies || []) if (e.monster) ids.add(e.monster);
    for (const n of r.npcs || []) if (n.monster) ids.add(n.monster);
  }
  return [...ids].map(getMonster).filter(Boolean);
}

export function openEncounterPopup({ adv, room } = {}) {
  if (adv?.levels) level = Number(String(adv.levels).split(/\D+/)[0]) || level;
  openPopup({
    title: 'Rencontre aléatoire',
    subtitle: room ? `${room.number ? room.number + '. ' : ''}${room.name}` : adv?.title,
    size: 'lg',
    render: (api) => {
      const pool = scope === 'adv' && adv ? adventurePool(adv) : allMonsters();
      const budget = budgetFor(level, difficulty, party);
      const field = (label, control) => h('div', { class: 'gen-field' }, h('label', null, label), control);
      const num = (value, min, max, set) => h('input', {
        class: 'input', type: 'number', min, max, value,
        oninput: (e) => { set(Math.max(min, Math.min(max, Number(e.target.value) || min))); api.redraw(); },
      });

      return h('div', null,
        h('div', { class: 'gen-grid' },
          field('Niveau', num(level, 1, 20, (v) => { level = v; })),
          field('Personnages', num(party, 1, 8, (v) => { party = v; })),
          field('Difficulté', h('select', { class: 'select', onchange: (e) => { difficulty = e.target.value; api.redraw(); } },
            DIFFICULTIES.map(([v, l]) => h('option', { value: v, selected: v === difficulty }, l)))),
          field('Créatures', h('select', { class: 'select', onchange: (e) => { scope = e.target.value; api.redraw(); } },
            h('option', { value: 'adv', selected: scope === 'adv' }, 'De l’aventure'),
            h('option', { value: 'all', selected: scope === 'all' }, 'Tout le bestiaire')))),

        h('div', { class: 'budget' },
          h('span', null, 'Budget ', h('b', null, `${budget} PX`)),
          h('span', null, `${pool.length} créatures disponibles`),
          last ? h('span', null, 'Rencontre ', h('b', null, `${last.xp} PX`)) : null),

        h('div', { class: 'toolbar', style: { marginBottom: '14px' } },
          h('button', { class: 'btn btn-primary', onclick: () => { last = generateEncounter({ level, party, difficulty, pool }); api.redraw(); } },
            icon('dice'), last ? 'Relancer' : 'Générer')),

        last ? result(last, adv, room) : h('div', { class: 'empty' }, 'Choisis un niveau et lance le dé.'));
    },
  });
}

function result(r, adv, room) {
  if (!r.groups.length) return h('div', { class: 'empty' }, r.note || 'Rien à proposer.');
  return h('div', null,
    r.hook ? h('div', { class: 'block block-read' }, h('div', { class: 'block-body read' }, r.hook)) : null,
    r.groups.map((g) => h('button', { class: 'card', onclick: () => openMonsterPopup(g.monster.id) },
      h('div', { class: 'card-badge danger' }, `×${g.count}`),
      h('div', { class: 'card-main' },
        h('div', { class: 'card-title' }, g.monster.name,
          g.monster.cr != null ? h('span', { class: 'pill' }, `FP ${g.monster.cr}`) : null,
          h('span', { class: 'pill' }, `${g.xp} PX`)),
        g.monster.summary?.style ? h('div', { class: 'card-sub tactic' }, g.monster.summary.style) : null),
      icon('forward', 'card-arrow'))),
    adv && room ? h('div', { class: 'toolbar', style: { marginTop: '12px' } },
      h('button', { class: 'btn', onclick: () => {
        const text = r.groups.map((g) => `- ×${g.count} ${g.monster.name} (${g.xp} PX)`).join('\n');
        const cur = store.getRoomNote(adv.id, room.id);
        store.setRoomNote(adv.id, room.id, `${cur ? cur + '\n\n' : ''}Rencontre (${r.xp}/${r.budget} PX) :\n${text}\n${r.hook}`);
        store.refresh();
        toast('Ajoutée aux notes de séance');
      } }, icon('notes'), 'Ajouter aux notes')) : null);
}
