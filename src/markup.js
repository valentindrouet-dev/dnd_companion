// Mini-langage de balisage des textes de données.
//   **gras**            *italique*          « citation »
//   [[m:goblin|Gobelins]]  lien vers un monstre (ouvre la fiche)
//   [[r:r2|salle 2]]        lien vers une salle de l'aventure courante
//   1d6+2, DD 15           mis en valeur automatiquement
//   Retours à la ligne conservés.

import { escapeHtml } from './dom.js';

// Rattaché au chargement du glossaire ; sans lui, markup() rend le texte tel quel.
let decorate = (el) => el;
export function setTextDecorator(fn) { decorate = fn || ((el) => el); }

export function markupToHtml(text) {
  let s = escapeHtml(text);
  s = s.replace(/\[\[(m|r|monstre|salle):([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, t, id, label) => {
    const type = t.startsWith('m') ? 'm' : 'r';
    const cleanId = id.trim();
    return `<a class="ref" data-ref="${type}:${cleanId}">${label ? label.trim() : cleanId}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  s = s.replace(/(^|[\s(«])\*([^*\n]+)\*(?=[\s).,;:!?»]|$)/g, '$1<i>$2</i>');
  s = s.replace(/«\s?([^»]+?)\s?»/g, '<span class="quote">«&nbsp;$1&nbsp;»</span>');
  s = s.replace(/(^|[^\w>])(\d+d\d+(?:\s?[+\-−]\s?\d+)?)(?![\w<])/g, '$1<span class="dice">$2</span>');
  s = s.replace(/\b(DD|DC)\s?(\d+)\b/g, '<span class="dc">$1&nbsp;$2</span>');
  s = s.replace(/\n/g, '<br>');
  return s;
}

/** Retourne un élément DOM contenant le texte balisé, mots-clés du glossaire compris. */
export function markup(text, tag = 'div', cls = '') {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  el.innerHTML = markupToHtml(text);
  return decorate(el);
}

/** Texte brut (sans balises) — utile pour les aperçus. */
export function plain(text, max = 70) {
  const s = String(text ?? '')
    .replace(/\[\[[^:\]]+:([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, id, label) => label || id)
    .replace(/\*\*?/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}
