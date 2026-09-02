// Cartes du donjon : vignette cadrée sur la salle, carte complète zoomable,
// et repères cliquables pour ouvrir une salle directement depuis le plan.

import { h } from '../dom.js';
import { icon } from '../icons.js';
import { store } from '../store.js';
import { openPopup, closeAllPopups } from '../ui/popup.js';
import { navigate, roomPath } from '../router.js';

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
export function roomSpot(mapId, roomId) { return maps?.[mapId]?.spots?.[roomId] || null; }

/** Vignette de la salle ; l'appui ouvre la carte complète. */
export function mapThumb(adv, room) {
  const src = roomMap(adv.map, room.id);
  if (!src) return null;
  return h('button', { class: 'map-thumb', onclick: () => openMapPopup(adv, room) },
    h('img', { src: './' + src, alt: `Plan de la salle ${room.number ?? ''}`, loading: 'lazy' }),
    h('span', { class: 'zoom' }, icon('expand')));
}

/** Carte complète : zoom, et repères cliquables vers les salles (désactivables). */
export function openMapPopup(adv, room = null) {
  const src = fullMap(adv.map);
  if (!src) return;
  let zoom = 1;
  openPopup({
    title: 'Carte de la strate',
    subtitle: room ? `${room.number ?? ''} — ${room.name}` : adv.title,
    size: 'lg',
    render: (api) => {
      const clickable = store.settings.mapClick !== false;
      const img = h('img', { src: './' + src, alt: 'Carte complète' });
      const spots = h('div', { class: 'map-spots' + (clickable ? '' : ' off') },
        clickable ? adv.rooms.map((r) => {
          const s = roomSpot(adv.map, r.id);
          if (!s) return null;
          return h('button', {
            class: 'spot' + (r.id === room?.id ? ' is-current' : '') + (store.isDone(adv.id, r.id) ? ' is-done' : ''),
            style: { left: s[0] + '%', top: s[1] + '%' },
            'aria-label': `${r.number ?? ''} ${r.name}`,
            title: `${r.number ?? ''} — ${r.name}`,
            onclick: () => { closeAllPopups(); navigate(roomPath(adv.id, r.id)); },
          }, h('span', null, r.number ?? '•')) ;
        }) : null);
      const inner = h('div', { class: 'map-inner', style: { width: 100 * zoom + '%' } }, img, spots);
      const box = h('div', { class: 'map-full' }, inner);
      const set = (z) => { zoom = Math.min(6, Math.max(1, z)); inner.style.width = 100 * zoom + '%'; };

      return h('div', null,
        h('div', { class: 'toolbar', style: { marginBottom: '10px' } },
          h('button', { class: 'btn btn-sm btn-icon', 'aria-label': 'Dézoomer', onclick: () => set(zoom - 0.5) }, icon('minus')),
          h('button', { class: 'btn btn-sm btn-icon', 'aria-label': 'Zoomer', onclick: () => set(zoom + 0.5) }, icon('plus')),
          h('button', {
            class: 'btn btn-sm' + (clickable ? ' is-on' : ''),
            onclick: () => { store.setSetting('mapClick', !clickable); api.redraw(); },
          }, icon(clickable ? 'target' : 'eyeOff'), clickable ? 'Salles cliquables' : 'Carte seule')),
        box);
    },
  });
}
