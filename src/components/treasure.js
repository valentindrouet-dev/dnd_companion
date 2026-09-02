// Trésors : liste avec cases « Distribué », popup détaillée.

import { h } from '../dom.js';
import { icon } from '../icons.js';
import { markup } from '../markup.js';
import { store, key } from '../store.js';
import { openPopup } from '../ui/popup.js';
import { card } from './card.js';
import { visibleItems, enhancedStar } from '../variant.js';
import { elemId } from '../dom.js';

export function normalizeTreasure(list) {
  return visibleItems(list, elemId).map(({ item, id }) => (typeof item === 'string' ? { id, item } : { ...item, id }));
}

export function treasureCards(advId, room, opts = {}) {
  return visibleItems(room.treasure, elemId).map(({ item: raw, id }) => {
    const t = typeof raw === 'string' ? { id, item: raw } : { ...raw, id };
    return card({
    key: key(advId, room.id, 'treasure', t.id),
    badge: t.qty != null ? `×${t.qty}` : icon('gem'),
    badgeClass: t.magic ? 'accent' : '',
    title: t.item,
    pills: [enhancedStar(t), t.magic ? h('span', { class: 'pill accent' }, icon('wand'), 'magique') : null, t.value ? h('span', { class: 'pill' }, t.value) : null],
    sub: [t.where, t.note].filter(Boolean).join(' — ') || null,
    hideLabel: 'Distribué',
    onOpen: opts.compact ? () => openTreasurePopup(advId, room) : undefined,
  });
  });
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
