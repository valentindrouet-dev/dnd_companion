// Fenêtre de tirage d'objet magique.
//   sans type  : rareté ET type tirés selon les probabilités du générateur de récolte
//   avec type  : un objet par rareté, comme dans le générateur d'origine

import { h } from '../dom.js';
import { icon } from '../icons.js';
import { store } from '../store.js';
import { openPopup } from '../ui/popup.js';
import { toast } from '../ui/toast.js';
import { magicType, magicTypes, magicRarities, pickMagicItem, rollFreeMagicItem } from './generator.js';

export function raritySlug(r) {
  return String(r).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-');
}

let typeId = '';
let last = null;

export function openMagicPopup({ adv, room, typeId: t, back } = {}) {
  typeId = t || '';
  last = null;
  openPopup({
    title: 'Objet magique',
    subtitle: room ? `${room.number ? room.number + '. ' : ''}${room.name}` : adv?.title,
    size: 'lg',
    back,
    render: (api) => {
      const type = typeId ? magicType(typeId) : null;
      const roll = () => { last = type ? byRarity(type) : [rollFreeMagicItem()]; api.redraw(); };
      return h('div', null,
        h('div', { class: 'toolbar', style: { marginBottom: '12px' } },
          h('select', { class: 'select', style: { width: 'auto' }, onchange: (e) => { typeId = e.target.value; last = null; api.redraw(); } },
            h('option', { value: '' }, 'Type aléatoire'),
            magicTypes().map((x) => h('option', { value: x.id, selected: x.id === typeId }, `${x.emoji} ${x.plural}`))),
          h('button', { class: 'btn btn-primary', onclick: roll }, icon('dice'), last ? 'Relancer' : 'Tirer')),
        type ? h('p', { class: 'muted small' }, type.description) : h('p', { class: 'muted small' },
          'Type et rareté tirés selon les mêmes probabilités que dans les récoltes.'),
        last ? result(last, adv, room) : h('div', { class: 'empty' }, 'Lance le dé.'));
    },
  });
}

/** Un objet par rareté, pour un type donné. */
function byRarity(type) {
  return magicRarities().map((r) => {
    const named = pickMagicItem(type.name, r);
    return { rarity: r, kind: type.name, named };
  });
}

function line(o) {
  return h('div', { class: 'loot-row' + (o.named ? ' magic' : '') },
    h('span', { class: `band-dot rar-${raritySlug(o.rarity)}` }),
    h('span', { class: 'lname' }, o.named ? o.named.name : h('i', { class: 'muted' }, 'rien à cette rareté au DMG — à toi de choisir')),
    h('span', { class: 'lval' }, o.kind, h('span', { class: ' rar rar-' + raritySlug(o.rarity) }, ' · ' + o.rarity)),
    o.named ? h('span', { class: 'mi-variant' }, o.named.variant) : null);
}

function result(items, adv, room) {
  return h('div', null,
    h('div', { class: 'loot-list' }, items.map(line)),
    adv && room ? h('div', { class: 'toolbar', style: { marginTop: '10px' } },
      h('button', { class: 'btn btn-sm', onclick: () => {
        const text = items.map((o) => `- ${o.named ? o.named.name : 'à choisir'} (${o.kind} · ${o.rarity}${o.named ? ' · ' + o.named.variant : ''})`).join('\n');
        const cur = store.getRoomNote(adv.id, room.id);
        store.setRoomNote(adv.id, room.id, (cur ? cur + '\n\n' : '') + 'Objet magique :\n' + text);
        store.refresh();
        toast('Ajouté aux notes de séance');
      } }, icon('notes'), 'Ajouter aux notes')) : null);
}
