// Statut d'un PNJ, modifiable en cours de partie (amical, mort, en fuite…).

import { h } from '../dom.js';
import { icon } from '../icons.js';
import { store } from '../store.js';
import { openPopup } from '../ui/popup.js';

export const STATUSES = [
  ['amical', 'Amical', 'ok', 'heart'],
  ['allie', 'Allié', 'ok', 'shield'],
  ['neutre', 'Neutre', '', 'users'],
  ['mefiant', 'Méfiant', 'info', 'eye'],
  ['hostile', 'Hostile', 'danger', 'sword'],
  ['prisonnier', 'Prisonnier', 'info', 'lock'],
  ['fuite', 'En fuite', 'info', 'forward'],
  ['mort', 'Mort', 'danger', 'skull'],
];

const KEY = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function statusOf(advId, npc) {
  const stored = store.npcStatus(advId, npc.id);
  const k = KEY(stored || npc.attitude || 'neutre');
  return STATUSES.find(([v]) => v === k) || ['neutre', stored || npc.attitude || 'Neutre', '', 'users'];
}

/** Pastille cliquable : ouvre le choix du statut. */
export function statusPill(advId, npc) {
  const [, label, cls, ico] = statusOf(advId, npc);
  const custom = !!store.npcStatus(advId, npc.id);
  return h('button', {
    class: 'pill pill-btn ' + cls + (custom ? ' is-set' : ''),
    'aria-label': `Statut : ${label}`,
    onclick: (e) => { e.stopPropagation(); openStatusPopup(advId, npc); },
  }, icon(ico), label, icon('edit', 'tiny'));
}

export function openStatusPopup(advId, npc) {
  const current = statusOf(advId, npc)[0];
  const api = openPopup({
    title: npc.name,
    subtitle: 'Statut du PNJ',
    render: () => h('div', { class: 'status-grid' },
      STATUSES.map(([v, label, cls, ico]) => h('button', {
        class: 'btn' + (v === current ? ' is-on' : ''),
        onclick: () => { store.setNpcStatus(advId, npc.id, v); api.close(); },
      }, icon(ico, cls ? 'c-' + cls : ''), label)),
      store.npcStatus(advId, npc.id)
        ? h('button', { class: 'btn btn-ghost', onclick: () => { store.setNpcStatus(advId, npc.id, null); api.close(); } }, icon('undo'), 'Statut d’origine')
        : null),
  });
}
