// Interface du générateur de loot (popup) : appelle src/loot/generator.js.

import { h } from '../dom.js';
import { icon } from '../icons.js';
import { store } from '../store.js';
import { openPopup } from '../ui/popup.js';
import { toast } from '../ui/toast.js';
import { generateLoot, LOOT_KINDS, GENERATOR_NAME } from './generator.js';

let level = 1;
let kind = LOOT_KINDS[0][0];
let last = null;

const COIN_LABEL = { pp: 'pp', po: 'po', pa: 'pa', pc: 'pc' };

export function openLootPopup({ adv, room } = {}) {
  level = adv?.lootLevel || Number(String(adv?.levels || '1').split(/\D+/)[0]) || level;
  openPopup({
    title: 'Loot aléatoire',
    subtitle: GENERATOR_NAME,
    render: (api) => {
      const result = last ? renderResult(last) : h('div', { class: 'empty' }, 'Choisis un niveau et un type, puis génère.');
      return h('div', null,
        h('div', { class: 'toolbar', style: { marginBottom: '14px' } },
          h('label', { class: 'nowrap' }, 'Niveau ',
            h('input', { class: 'input', type: 'number', min: 1, max: 20, value: level, style: { width: '90px', display: 'inline-block' }, oninput: (e) => { level = Number(e.target.value) || 1; } })),
          h('select', { class: 'select', style: { width: 'auto' }, onchange: (e) => { kind = e.target.value; } },
            LOOT_KINDS.map(([v, label]) => h('option', { value: v, selected: v === kind }, label))),
          h('button', { class: 'btn btn-primary', onclick: () => { last = generateLoot({ level, kind }); api.redraw(); } }, icon('dice'), 'Générer')),
        result,
        last && adv && room ? h('div', { class: 'toolbar', style: { marginTop: '14px' } },
          h('button', { class: 'btn', onclick: () => {
            const text = lootToText(last);
            const cur = store.getRoomNote(adv.id, room.id);
            store.setRoomNote(adv.id, room.id, (cur ? cur + '\n\n' : '') + 'Loot généré :\n' + text);
            store.refresh();
            toast('Ajouté aux notes de séance');
          } }, icon('notes'), 'Ajouter aux notes de séance')) : null);
    },
  });
}

function renderResult(r) {
  const coins = Object.entries(r.coins || {}).filter(([, v]) => v > 0);
  return h('div', null,
    r.summary ? h('p', { class: 'muted' }, r.summary) : null,
    coins.length ? h('div', { class: 'block' }, h('div', { class: 'block-head' }, h('div', { class: 'block-kind' }, 'Pièces')),
      h('div', { class: 'block-body' }, coins.map(([k, v]) => `${v} ${COIN_LABEL[k] || k}`).join(' · '))) : null,
    (r.items || []).length ? h('div', { class: 'block' }, h('div', { class: 'block-head' }, h('div', { class: 'block-kind' }, 'Objets')),
      h('ul', { style: { margin: 0, paddingLeft: '20px' } }, r.items.map((it) => h('li', null,
        it.qty ? `×${it.qty} ` : '', it.magic ? h('b', null, it.name) : it.name,
        it.value ? ` (${it.value})` : '', it.note ? h('span', { class: 'muted' }, ` — ${it.note}`) : '')))) : h('p', { class: 'muted' }, 'Aucun objet.'));
}

function lootToText(r) {
  const coins = Object.entries(r.coins || {}).filter(([, v]) => v > 0).map(([k, v]) => `${v} ${COIN_LABEL[k] || k}`).join(', ');
  const items = (r.items || []).map((it) => `- ${it.qty ? '×' + it.qty + ' ' : ''}${it.name}${it.value ? ' (' + it.value + ')' : ''}${it.note ? ' — ' + it.note : ''}`).join('\n');
  return [coins ? `Pièces : ${coins}` : null, items].filter(Boolean).join('\n');
}
