// Vue d'ensemble d'une aventure : le cheminement, les enjeux, les fins possibles,
// et ce que l'aventure ouvre pour la suite. C'est la page que le MJ relit avant
// la séance, quand il veut se rappeler où va l'histoire — pas où sont les salles.

import { h } from '../dom.js';
import { icon } from '../icons.js';
import { navigate, roomPath } from '../router.js';
import { key } from '../store.js';
import { blockParts } from './block.js';
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

/**
 * Les mêmes outils que partout ailleurs — modifier le texte, le marquer « vu »,
 * l'annoter — sur un gabarit propre à la vue d'ensemble.
 */
function editable(adv, group, e) {
  return blockParts({
    key: key(adv.id, '_adv', 'ov', group, e.id),
    text: e.text || '', title: e.title, item: e, kind: 'note', hideLabel: 'Vu',
  });
}

/** Le cheminement : les étapes dans l'ordre où elles se jouent. */
function steps(adv, list) {
  return h('div', { class: 'ov-steps' }, items(list).map((s, i) => {
    const p = editable(adv, 'steps', s);
    return h('div', { class: 'ov-step' + p.cls },
      h('div', { class: 'ov-num' }, String(i + 1)),
      h('div', { class: 'ov-body' },
        h('div', { class: 'ov-title' }, s.title, enhancedStar(s),
          p.override != null ? h('span', { class: 'edited-flag' }, 'modifié') : null,
          p.tools),
        s.text ? p.body : null,
        roomChips(adv, s.rooms),
        p.note));
  }));
}

/** Enjeux, fins et ouvertures : même forme, une teinte par nature. */
function entries(adv, group, list, defaultTone) {
  return h('div', { class: 'ov-list' }, items(list).map((e) => {
    const p = editable(adv, group, e);
    return h('div', { class: 'ov-item ' + (TONES[e.tone] || defaultTone || '') + p.cls },
      h('div', { class: 'ov-title' }, e.icon ? icon(e.icon) : null, e.title, enhancedStar(e),
        p.override != null ? h('span', { class: 'edited-flag' }, 'modifié') : null,
        p.tools),
      e.text ? p.body : null,
      roomChips(adv, e.rooms),
      p.note);
  }));
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
  add('Les enjeux', o.stakes, entries(adv, 'stakes', o.stakes, 'accent'));
  add('Conclusions possibles', o.endings, entries(adv, 'endings', o.endings, 'ok'));
  add('Ce que ça ouvre', o.next, entries(adv, 'next', o.next, 'info'));
  return out;
}
