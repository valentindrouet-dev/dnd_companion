// Cartes du donjon : vignette cadrée sur la salle, et carte complète zoomable en fenêtre.

import { h } from '../dom.js';
import { icon } from '../icons.js';
import { openPopup } from '../ui/popup.js';

let maps = null;

export async function loadMaps() {
  if (maps) return maps;
  try {
    const res = await fetch('./data/maps.json', { cache: 'no-cache' });
    maps = res.ok ? (await res.json()).maps || {} : {};
  } catch { maps = {}; }
  return maps;
}

export function roomMap(mapId, roomId) { return maps?.[mapId]?.rooms?.[roomId] || null; }
export function fullMap(mapId) { return maps?.[mapId]?.complete || null; }

/** Vignette de la salle ; l'appui ouvre la carte complète. */
export function mapThumb(adv, room) {
  const src = roomMap(adv.map, room.id);
  if (!src) return null;
  return h('button', { class: 'map-thumb', onclick: () => openMapPopup(adv, room) },
    h('img', { src: './' + src, alt: `Carte de la salle ${room.number ?? ''}`, loading: 'lazy' }),
    h('span', { class: 'zoom' }, icon('expand')));
}

/** Carte complète, avec zoom au doigt et boutons. */
export function openMapPopup(adv, room = null) {
  const src = fullMap(adv.map);
  if (!src) return;
  let zoom = 1;
  openPopup({
    title: 'Carte de la strate',
    subtitle: room ? `Salle ${room.number ?? ''} — ${room.name}` : adv.title,
    size: 'lg',
    render: () => {
      const img = h('img', { src: './' + src, alt: 'Carte complète', style: { width: 100 * zoom + '%' } });
      const box = h('div', { class: 'map-full' }, img);
      const set = (z) => { zoom = Math.min(6, Math.max(1, z)); img.style.width = 100 * zoom + '%'; };
      return h('div', null,
        room && roomMap(adv.map, room.id)
          ? h('img', { src: './' + roomMap(adv.map, room.id), alt: '', style: { width: '100%', borderRadius: '12px', marginBottom: '12px', border: '1px solid var(--border)' } })
          : null,
        h('div', { class: 'toolbar', style: { marginBottom: '10px' } },
          h('button', { class: 'btn btn-sm btn-icon', 'aria-label': 'Dézoomer', onclick: () => set(zoom - 0.5) }, icon('minus')),
          h('button', { class: 'btn btn-sm btn-icon', 'aria-label': 'Zoomer', onclick: () => set(zoom + 0.5) }, icon('plus')),
          h('span', { class: 'muted small' }, 'Fais glisser la carte pour te déplacer.')),
        box);
    },
  });
}
