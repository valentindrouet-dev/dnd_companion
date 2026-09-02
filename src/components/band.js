// Bandeau fin : une ligne par élément, dépliable ou cliquable.
// Partagé par les récoltes, le bestiaire et les objets magiques.

import { h } from '../dom.js';
import { icon } from '../icons.js';

/**
 * @param {object} o
 * @param {string} [o.tone]      catégorie de couleur (classe lt-…) pour la pastille
 * @param {string|Node} o.title
 * @param {(string|Node)[]} [o.meta]  pastilles alignées à droite
 * @param {Function} [o.body]    contenu déplié — sa présence rend le bandeau dépliable
 * @param {boolean} [o.open]
 * @param {Function} [o.onToggle]
 * @param {Function} [o.onOpen]  bandeau simplement cliquable (sans dépliage)
 */
export function band(o) {
  const inner = [
    o.tone ? h('span', { class: `band-dot lt-${o.tone}` }) : null,
    h('span', { class: 'band-name' }, o.title),
    h('span', { class: 'band-meta' }, o.meta || []),
    icon(o.body ? (o.open ? 'minus' : 'plus') : 'forward', 'band-caret'),
  ];
  const head = h('button', {
    class: 'band-head',
    'aria-expanded': o.body ? String(!!o.open) : null,
    onclick: o.body ? o.onToggle : o.onOpen,
  }, inner);
  return h('div', { class: 'band' + (o.open ? ' is-open' : '') }, head,
    o.open && o.body ? h('div', { class: 'band-body' }, o.body()) : null);
}

/** Barre de résumé au-dessus d'une liste de bandeaux. */
export function bandBar(stats, action) {
  return h('div', { class: 'budget' }, stats.map(([n, label]) => h('span', null, h('b', null, n), ' ', label)), action);
}

/** Bouton « Tout déplier / Tout replier » : un état mixte ouvre tout. */
export function expandAll(ids, open, redraw) {
  const allOpen = ids.length > 0 && ids.every((id) => open.has(id));
  return h('button', {
    class: 'btn btn-sm btn-ghost',
    onclick: () => { ids.forEach((id) => allOpen ? open.delete(id) : open.add(id)); redraw(); },
  }, icon(allOpen ? 'compress' : 'expand'), allOpen ? 'Tout replier' : 'Tout déplier');
}
