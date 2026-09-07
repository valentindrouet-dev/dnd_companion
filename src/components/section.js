// Section repliable d'une page. Le MJ replie ce dont il n'a pas besoin ; l'état
// est une préférence d'affichage, retenue par type de section et non par page —
// replier « Sorties » une fois la replie sur toutes les salles.

import { h } from '../dom.js';
import { icon } from '../icons.js';
import { store } from '../store.js';
import { slug } from '../util.js';

/** Clé de pliage d'une section. `scope` : 'r' pour les salles, `a:<id>` pour une aventure. */
export const foldKey = (scope, title) => `fold/${scope}/${slug(title)}`;

/**
 * @param {string} scope   portée de la mémorisation ('r', 'a:mon-aventure'…)
 * @param {string} title
 * @param {*} children
 * @param {object} [o]
 * @param {number} [o.count]    compteur affiché à droite du titre
 * @param {Node} [o.actions]    boutons propres à la section
 * @param {string} [o.ico]      icône devant le titre
 */
export function section(scope, title, children, o = {}) {
  const kids = (Array.isArray(children) ? children.flat() : [children]).filter(Boolean);
  if (!kids.length) return null;                     // pas de contenu, pas de section
  const key = foldKey(scope, title);
  const folded = store.isFolded(key);
  return h('div', { class: 'sec' + (folded ? ' is-folded' : '') },
    h('div', { class: 'sec-head' },
      h('button', {
        class: 'sec-toggle',
        'aria-expanded': String(!folded),
        'aria-label': (folded ? 'Déplier' : 'Replier') + ' : ' + title,
        onclick: () => store.toggleFolded(key),
      }, icon(folded ? 'plus' : 'minus', 'sec-caret'),
         o.ico ? icon(o.ico) : null,
         h('h2', null, title),
         o.count != null ? h('span', { class: 'count' }, o.count) : null),
      o.actions),
    folded ? null : kids);
}

/**
 * Fabrique le `section()` d'une page et retient les titres réellement rendus —
 * une section vide n'existe pas, et « Tout replier » ne doit pas la compter.
 */
export function sections(scope) {
  const titles = [];
  return {
    titles,
    section(title, children, o) {
      const node = section(scope, title, children, o);
      if (node) titles.push(title);
      return node;
    },
  };
}

/** Bouton « Tout replier / Tout déplier » pour une page. */
export function foldAllButton(scope, titles) {
  const keys = titles.map((t) => foldKey(scope, t));
  const allFolded = keys.length > 0 && keys.every((k) => store.isFolded(k));
  return h('button', {
    class: 'btn btn-icon btn-ghost' + (allFolded ? ' is-on' : ''),
    'aria-label': allFolded ? 'Tout déplier' : 'Tout replier',
    title: allFolded ? 'Tout déplier' : 'Tout replier',
    onclick: () => store.foldMany(keys, !allFolded),
  }, icon(allFolded ? 'expand' : 'compress'));
}
