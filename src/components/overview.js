// Vue d'ensemble d'une aventure : le cheminement, les enjeux, les fins possibles,
// et ce que l'aventure ouvre pour la suite. C'est la page que le MJ relit avant
// la séance, quand il veut se rappeler où va l'histoire — pas où sont les salles.

import { h } from '../dom.js';
import { icon } from '../icons.js';
import { markup } from '../markup.js';
import { navigate, roomPath } from '../router.js';
import { visibleItems, enhancedStar, isVisible } from '../variant.js';
import { elemId } from '../dom.js';

const TONES = { ok: 'ok', danger: 'danger', accent: 'accent', info: 'info' };

/** Pastilles cliquables vers les salles concernées par une étape. */
function roomChips(adv, ids) {
  const rooms = (ids || []).map((id) => adv.roomById.get(id)).filter((r) => r && isVisible(r));
  if (!rooms.length) return null;
  return h('div', { class: 'ov-rooms' }, rooms.map((r) => h('button', {
    class: 'pill ov-room', title: r.name,
    onclick: () => navigate(roomPath(adv.id, r.id)),
  }, r.number ?? r.name)));
}

function items(list) { return visibleItems(list, elemId).map(({ item, id }) => ({ ...item, id })); }

/** Le cheminement : les étapes dans l'ordre où elles se jouent. */
function steps(adv, list) {
  return h('div', { class: 'ov-steps' }, items(list).map((s, i) => h('div', { class: 'ov-step' },
    h('div', { class: 'ov-num' }, String(i + 1)),
    h('div', { class: 'ov-body' },
      h('div', { class: 'ov-title' }, s.title, enhancedStar(s)),
      s.text ? markup(s.text, 'div', 'ov-text') : null,
      roomChips(adv, s.rooms)))));
}

/** Enjeux, fins et ouvertures : même forme, une teinte par nature. */
function entries(adv, list, defaultTone) {
  return h('div', { class: 'ov-list' }, items(list).map((e) => h('div', {
    class: 'ov-item ' + (TONES[e.tone] || defaultTone || ''),
  },
    h('div', { class: 'ov-title' }, e.icon ? icon(e.icon) : null, e.title, enhancedStar(e)),
    e.text ? markup(e.text, 'div', 'ov-text') : null,
    roomChips(adv, e.rooms))));
}

/**
 * Sections à insérer dans la page d'une aventure.
 * @returns {{title: string, node: Node, count?: number}[]}
 */
export function overviewSections(adv) {
  const o = adv.overview;
  if (!o) return [];
  const out = [];
  const add = (title, list, node) => {
    const n = items(list).length;
    if (n) out.push({ title, node, count: n });
  };
  add('Le cheminement', o.steps, steps(adv, o.steps));
  add('Les enjeux', o.stakes, entries(adv, o.stakes, 'accent'));
  add('Conclusions possibles', o.endings, entries(adv, o.endings, 'ok'));
  add('Ce que ça ouvre', o.next, entries(adv, o.next, 'info'));
  return out;
}
