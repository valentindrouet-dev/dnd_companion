// Trésors : liste avec cases « Distribué », popup détaillée.

import { h } from '../dom.js';
import { icon } from '../icons.js';
import { markup } from '../markup.js';
import { store, key } from '../store.js';
import { openPopup } from '../ui/popup.js';
import { card } from './card.js';

export function normalizeTreasure(list) {
  return (list || []).map((t, i) => (typeof t === 'string' ? { id: String(i), item: t } : { id: t.id ?? String(i), ...t }));
}

export function treasureCards(advId, room, opts = {}) {
  const items = normalizeTreasure(room.treasure);
  return items.map((t) => card({
    key: key(advId, room.id, 'treasure', t.id),
    badge: t.qty != null ? `×${t.qty}` : icon('gem'),
    badgeClass: t.magic ? 'accent' : '',
    title: t.item,
    pills: [t.magic ? h('span', { class: 'pill accent' }, icon('wand'), 'magique') : null, t.value ? h('span', { class: 'pill' }, t.value) : null],
    sub: [t.where, t.note].filter(Boolean).join(' — ') || null,
    hideLabel: 'Distribué',
    onOpen: opts.compact ? () => openTreasurePopup(advId, room) : undefined,
  }));
}

export function openTreasurePopup(advId, room) {
  openPopup({
    title: 'Trésor',
    subtitle: `${room.number ? room.number + '. ' : ''}${room.name}`,
    render: () => h('div', null,
      room.treasureNote ? markup(room.treasureNote, 'p', 'muted') : null,
      normalizeTreasure(room.treasure).length ? treasureCards(advId, room) : h('div', { class: 'empty' }, 'Pas de trésor ici.')),
  });
}
