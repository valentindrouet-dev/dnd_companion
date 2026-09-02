// PNJ et dialogues : fiche en popup, répliques masquables (« Dit »).

import { h } from '../dom.js';
import { icon } from '../icons.js';
import { markup } from '../markup.js';
import { store, key } from '../store.js';
import { openPopup } from '../ui/popup.js';
import { openMonsterPopup } from './monster.js';
import { hiddenRow } from './block.js';
import { asTextItem } from '../dom.js';

const ATTITUDE = {
  amical: ['Amical', 'ok', 'heart'],
  neutre: ['Neutre', '', 'users'],
  hostile: ['Hostile', 'danger', 'sword'],
  mefiant: ['Méfiant', 'info', 'eye'],
  méfiant: ['Méfiant', 'info', 'eye'],
};

export function attitudePill(att) {
  if (!att) return null;
  const [label, cls, ico] = ATTITUDE[att] || [att, '', null];
  return h('span', { class: 'pill ' + cls }, ico ? icon(ico) : null, label);
}

/**
 * @param {string} advId
 * @param {object} room
 * @param {object} npc  { id, name, role, attitude, description, monster, dialogues:[{trigger,line}], secrets:[] }
 */
export function openNpcPopup(advId, room, npc) {
  const base = key(advId, room.id, 'npc', npc.id);
  openPopup({
    title: npc.name,
    subtitle: [npc.role, npc.attitude ? (ATTITUDE[npc.attitude]?.[0] || npc.attitude) : null].filter(Boolean).join(' · '),
    render: () => h('div', null,
      npc.description ? h('div', { class: 'block' }, h('div', { class: 'block-head' }, h('div', { class: 'block-kind' }, 'Description')), markup(npc.description, 'div', 'block-body')) : null,
      npc.wants ? h('div', { class: 'block' }, h('div', { class: 'block-head' }, h('div', { class: 'block-kind' }, 'Ce qu’il veut')), markup(npc.wants, 'div', 'block-body')) : null,
      npc.monster ? h('div', { class: 'toolbar', style: { marginBottom: '14px' } },
        h('button', { class: 'btn', onclick: () => openMonsterPopup(npc.monster) }, icon('skull'), 'Fiche de combat')) : null,
      dialogueList(base, npc.dialogues),
      (npc.secrets && npc.secrets.length) ? h('div', { class: 'sec', style: { marginTop: '18px' } },
        h('div', { class: 'sec-head' }, h('h2', null, 'Secrets (à ne pas révéler d’emblée)')),
        npc.secrets.map((s, i) => h('div', { class: 'block' }, markup(typeof s === 'string' ? s : s.text, 'div', 'block-body')))) : null),
  });
}

/** Liste de répliques masquables. */
export function dialogueList(baseKey, dialogues) {
  const items = (dialogues || []).map((d, i) => (typeof d === 'string' ? { id: String(i), line: d } : { id: d.id ?? String(i), ...d }));
  if (!items.length) return h('div', { class: 'empty' }, 'Aucune réplique.');
  return h('div', null, items.map((d) => {
    const k = key(baseKey, 'line', d.id);
    if (store.isHidden(k)) return hiddenRow({ key: k, label: 'Dit', preview: d.line.replace(/\s+/g, ' ').slice(0, 80) });
    return h('div', { class: 'block' },
      h('div', { class: 'block-head' },
        h('div', { class: 'block-kind' }, d.trigger || 'Réplique'),
        h('div', { class: 'block-tools' },
          h('button', { class: 'btn btn-sm btn-ghost', onclick: () => store.setHidden(k, true) }, icon('check'), 'Dit'))),
      markup(d.line, 'div', 'block-body read'));
  }));
}
