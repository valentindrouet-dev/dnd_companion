// Carte générique : créature, PNJ, trésor, piège, sortie…
// Masquable (label configurable), annotable, et ouvrable (popup ou navigation).

import { h } from '../dom.js';
import { icon } from '../icons.js';
import { store } from '../store.js';
import { markup } from '../markup.js';
import { hiddenRow, noteButton, noteArea } from './block.js';

/**
 * @param {object} o
 * @param {string} o.key
 * @param {string|Node} [o.badge]        contenu du badge (numéro, ×3, DD 13…)
 * @param {string} [o.badgeClass]        danger | accent | ok | info
 * @param {string|Node[]} o.title
 * @param {(string|Node)[]} [o.pills]    pastilles à côté du titre
 * @param {string|Node} [o.sub]          sous-titre
 * @param {string|Node} [o.sub2]         seconde ligne (tactique…)
 * @param {Function} [o.onOpen]          rend la carte cliquable
 * @param {string} [o.hideLabel]         si présent, bouton de masquage
 * @param {boolean} [o.noNote]           désactive l'annotation
 * @param {string} [o.preview]           aperçu quand masqué
 */
export function card(o) {
  if (o.hideLabel && store.isHidden(o.key)) {
    return hiddenRow({ key: o.key, label: o.hideLabel, preview: o.preview ?? (typeof o.title === 'string' ? o.title : '') });
  }

  const tools = h('div', { class: 'card-tools' },
    o.noNote ? null : noteButton(o.key),
    o.hideLabel
      ? h('button', { class: 'btn btn-sm btn-ghost', onclick: (e) => { e.stopPropagation(); store.setHidden(o.key, true); } }, icon('check'), o.hideLabel)
      : null);

  // les sous-titres viennent des données : ils acceptent le balisage (**gras**, DD 15, [[m:…]])
  const line = (v, cls) => (v == null || v === '' ? null
    : typeof v === 'string' ? markup(v, 'div', cls) : h('div', { class: cls }, v));
  const main = h('div', { class: 'card-main' },
    h('div', { class: 'card-title' }, o.title, o.pills),
    line(o.sub, 'card-sub'),
    line(o.sub2, 'card-sub tactic'));

  const badge = o.badge != null ? h('div', { class: 'card-badge ' + (o.badgeClass || '') }, o.badge) : null;

  const inner = o.onOpen
    ? h('div', { class: 'card', role: 'button', tabindex: '0', onclick: o.onOpen }, badge, main, tools, icon('forward', 'card-arrow'))
    : h('div', { class: 'card' }, badge, main, tools);

  return h('div', { class: 'card-wrap' }, inner, noteArea(o.key));
}

export function pill(text, cls = '', ico = null) {
  return h('span', { class: 'pill ' + cls }, ico ? icon(ico) : null, text);
}
