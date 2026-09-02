// Version Améliorée : l'aventure existe en deux moutures qui partagent le même squelette.
//
//   pas de champ « only »   → présent dans les deux versions
//   only: 'enhanced'        → ajouté par la version Améliorée (marqué d'une étoile)
//   only: 'base'            → remplacé par la version Améliorée, donc masqué quand elle est active
//
// Le réglage vit dans store.settings.enhanced ; tout ce qui est masqué disparaît aussi
// des pourcentages d'avancement.

import { h } from './dom.js';
import { icon } from './icons.js';
import { store } from './store.js';

export function enhancedOn() { return store.settings.enhanced !== false; }

export function isVisible(item) {
  const only = item && typeof item === 'object' ? item.only : null;
  if (!only) return true;
  return only === 'enhanced' ? enhancedOn() : !enhancedOn();
}

export function filterVariant(list) {
  return (Array.isArray(list) ? list : list ? [list] : []).filter(isVisible);
}

/**
 * Éléments visibles d'une liste, accompagnés de leur identifiant.
 * L'identifiant vient de la position d'origine : masquer un élément ne doit pas
 * décaler les clés des autres, sinon coches et annotations changeraient de cible.
 */
export function visibleItems(list, idOf) {
  return (Array.isArray(list) ? list : list ? [list] : [])
    .map((item, index) => ({ item, id: idOf(item, index) }))
    .filter(({ item }) => isVisible(item));
}

/** Étoile signalant un élément venu de la version Améliorée. */
export function enhancedStar(item) {
  return item?.only === 'enhanced' ? h('span', { class: 'star', title: 'Version Améliorée' }, icon('star')) : null;
}

/** Compte les éléments propres à chaque version, pour les réglages. */
export function variantTally(adv) {
  const tally = { enhanced: 0, base: 0 };
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    if (node.only === 'enhanced') tally.enhanced++;
    else if (node.only === 'base') tally.base++;
    Object.values(node).forEach(walk);
  };
  walk(adv?.rooms);
  walk(adv?.notes);
  walk(adv?.npcs);
  walk(adv?.intro);
  return tally;
}
