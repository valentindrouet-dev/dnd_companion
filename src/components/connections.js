// Sorties / liaisons entre salles.

import { h } from '../dom.js';
import { icon } from '../icons.js';
import { roomLinks } from '../data.js';
import { navigate, roomPath } from '../router.js';
import { key } from '../store.js';
import { card } from './card.js';

export function connectionCards(adv, room) {
  const { declared, back } = roomLinks(adv, room);
  const all = [...declared.map((c) => ({ ...c, implicit: false })), ...back];
  if (!all.length) return h('div', { class: 'empty' }, 'Aucune liaison déclarée.');
  return h('div', { class: 'grid-2' }, all.map((c, i) => {
    const target = adv.roomById.get(c.to);
    if (!target) return card({ key: key(adv.id, room.id, 'link', c.to), badge: '?', title: `Salle inconnue : ${c.to}`, noNote: true });
    return card({
      key: key(adv.id, room.id, 'link', c.to),
      badge: target.number ?? '→',
      badgeClass: c.secret ? 'accent' : (c.implicit ? '' : 'info'),
      title: target.name,
      pills: [
        c.secret ? h('span', { class: 'pill accent' }, 'secret') : null,
        c.oneWay ? h('span', { class: 'pill' }, 'sens unique') : null,
        c.implicit ? h('span', { class: 'pill' }, 'accès depuis') : null,
      ],
      sub: [c.via, c.note].filter(Boolean).join(' — ') || null,
      onOpen: () => navigate(roomPath(adv.id, target.id)),
    });
  }));
}
