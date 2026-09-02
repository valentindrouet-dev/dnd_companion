// Fenêtre de la récolte d'ennemis : choix de la créature, fouille, butin.

import { h } from '../dom.js';
import { icon } from '../icons.js';
import { store } from '../store.js';
import { markup } from '../markup.js';
import { openPopup } from '../ui/popup.js';
import { toast } from '../ui/toast.js';
import { generateLoot, lootCreatures, lootCreature, lootTableFor, GENERATOR_NAME } from './generator.js';

let selectedId = null;
let count = 1;
let last = null;
let showProba = false;
let scope = 'adv';

/**
 * @param {object} o
 * @param {object} [o.adv] @param {object} [o.room]  pour « ajouter aux notes »
 * @param {string} [o.creatureId]                    ouvre directement sur une table
 * @param {number} [o.count]                          nombre de cadavres à fouiller
 * @param {object} [o.back]                          fenêtre d'où l'on vient
 */
export function openLootPopup({ adv, room, creatureId, count: n, back } = {}) {
  // Depuis une fiche de monstre : directement sur sa table. Depuis la barre du
  // haut : toujours la liste des créatures, sans rouvrir la dernière consultée.
  if (creatureId) {
    if (creatureId !== selectedId) { selectedId = creatureId; last = null; count = 1; }
    if (n > 0 && n !== count) { count = Math.min(20, n); last = null; }
  } else {
    selectedId = null; last = null; count = 1;
  }
  openPopup({
    title: GENERATOR_NAME,
    subtitle: room ? `${room.number ? room.number + '. ' : ''}${room.name}` : adv?.title,
    size: 'lg',
    back,
    render: (api) => {
      const creature = selectedId ? lootCreature(selectedId) : null;
      return creature ? sheet(creature, api, adv, room) : picker(api, adv);
    },
  });
}

/** Créatures de l'aventure qui ont une table, dans l'ordre du bestiaire. */
function adventureTables(adv) {
  const seen = new Set();
  const out = [];
  for (const r of adv?.rooms || []) {
    for (const e of [...(r.enemies || []), ...(r.npcs || [])]) {
      const t = e.monster && lootTableFor(e.monster);
      if (t && !seen.has(t.id)) { seen.add(t.id); out.push(t); }
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

function picker(api, adv) {
  const all = lootCreatures();
  const advList = adventureTables(adv);
  const list = scope === 'adv' && advList.length ? advList : all;
  const choose = (c) => { selectedId = c.id; last = null; count = 1; api.redraw(); };

  return h('div', null,
    advList.length ? h('div', { class: 'toolbar', style: { marginBottom: '12px' } },
      h('select', { class: 'select', style: { width: 'auto' }, onchange: (e) => { scope = e.target.value; api.redraw(); } },
        h('option', { value: 'adv', selected: scope === 'adv' }, `De l’aventure (${advList.length})`),
        h('option', { value: 'all', selected: scope === 'all' }, `Toutes les tables (${all.length})`))) : null,
    h('div', { class: 'loot-pick' }, list.map((c) => h('button', {
      class: `loot-chip lt-${c.type}`, onclick: () => choose(c),
    }, c.name))),
    h('p', { class: 'muted small', style: { marginTop: '12px' } },
      'Chaque ligne est tirée indépendamment. Les objets « brisés » sont réellement cassés 3 fois sur 4.'));
}

function sheet(c, api, adv, room) {
  const roll = () => { last = generateLoot({ creature: c, count }); api.redraw(); };
  return h('div', null,
    h('div', { class: 'toolbar loot-head' },
      h('button', { class: 'btn btn-sm btn-ghost', onclick: () => { selectedId = null; last = null; api.redraw(); } }, icon('back'), 'Créatures'),
      h('b', null, c.name),
      h('span', { class: 'pill info' }, icon('target'), `${c.check.skill} DD ${c.check.dc}`),
      h('span', { class: 'pill' }, c.duration)),

    h('div', { class: 'block b-read' }, h('div', { class: 'block-body read' }, c.description)),

    h('div', { class: 'toolbar', style: { margin: '12px 0' } },
      h('label', { class: 'nowrap muted small' }, 'Cadavres ',
        h('input', {
          class: 'input', type: 'number', min: 1, max: 20, value: count,
          style: { width: '78px', display: 'inline-block' },
          oninput: (e) => { count = Math.max(1, Math.min(20, Number(e.target.value) || 1)); },
        })),
      h('button', { class: 'btn btn-primary', onclick: roll }, icon('dice'), last ? 'Relancer' : 'Fouiller')),

    last ? result(last, adv, room) : null,

    h('div', { class: 'block b-danger', style: { marginTop: '12px' } },
      h('div', { class: 'block-head' }, h('div', { class: 'block-kind' }, icon('alert'), 'Échec critique (1 naturel)')),
      markup(c.danger, 'div', 'block-body')),

    h('div', { class: 'toolbar', style: { marginTop: '12px' } },
      h('button', { class: 'btn btn-sm btn-ghost', onclick: () => { showProba = !showProba; api.redraw(); } },
        icon('list'), showProba ? 'Masquer les probabilités' : 'Probabilités')),
    showProba ? proba(c) : null);
}

function result(r, adv, room) {
  const po = r.coins.po || 0;
  if (!r.items.length && !po) {
    return h('div', { class: 'empty' }, 'Rien de valeur. Aucun objet intéressant sur ',
      r.count > 1 ? `ces ${r.count} cadavres.` : 'ce cadavre.');
  }
  return h('div', null,
    h('div', { class: 'loot-list' },
      po ? h('div', { class: 'loot-row coins' }, h('span', { class: 'lname' }, '💰 ', h('b', null, `${po} po`))) : null,
      r.items.map((it) => h('div', { class: 'loot-row' + (it.magic ? ' magic' : '') },
        h('span', { class: 'lname' },
          it.qty > 1 ? h('b', null, `×${it.qty} `) : null,
          it.emoji ? it.emoji + ' ' : '', it.name),
        h('span', { class: 'lval' }, [it.value, it.use].filter(Boolean).join(' · '))))),
    adv && room ? h('div', { class: 'toolbar', style: { marginTop: '10px' } },
      h('button', { class: 'btn btn-sm', onclick: () => {
        const cur = store.getRoomNote(adv.id, room.id);
        store.setRoomNote(adv.id, room.id, (cur ? cur + '\n\n' : '') + lootToText(r));
        store.refresh();
        toast('Ajouté aux notes de séance');
      } }, icon('notes'), 'Ajouter aux notes')) : null);
}

function proba(c) {
  return h('div', { class: 'loot-list proba' }, (c.loot || []).map((l) => h('div', { class: 'loot-row' },
    h('span', { class: 'lname' }, l.emoji ? l.emoji + ' ' : '', l.name, l.brokenName ? h('span', { class: 'muted' }, ' (ou brisé)') : null),
    h('span', { class: 'lval' }, `${l.qty} · ${l.value || (l.coin ? 'po' : '')}${l.use ? ' · ' + l.use : ''}`),
    h('span', { class: 'lp ' + (l.p >= 50 ? 'hi' : l.p >= 30 ? 'mid' : 'lo') }, `${l.p} %`))));
}

function lootToText(r) {
  const lines = [`Récolte — ${r.creature.name}${r.count > 1 ? ` ×${r.count}` : ''} (${r.creature.check.skill} DD ${r.creature.check.dc}, ${r.creature.duration}) :`];
  if (r.coins.po) lines.push(`- ${r.coins.po} po`);
  for (const it of r.items) lines.push(`- ${it.qty > 1 ? '×' + it.qty + ' ' : ''}${it.name}${it.value ? ' (' + it.value + ')' : ''}`);
  if (!r.coins.po && !r.items.length) lines.push('- rien de valeur');
  return lines.join('\n');
}
