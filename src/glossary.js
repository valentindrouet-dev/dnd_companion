// Glossaire : personnages, factions, lieux, objets et divinités de l'aventure.
// Les termes sont repérés automatiquement dans les textes et rendus cliquables.

import { h } from './dom.js';
import { icon } from './icons.js';
import { markup } from './markup.js';
import { store } from './store.js';
import { openPopup } from './ui/popup.js';

export const KINDS = {
  personne: ['Personnage', 'users', 'ok'],
  faction: ['Faction', 'flag', 'danger'],
  lieu: ['Lieu', 'map', 'info'],
  objet: ['Objet', 'gem', 'accent'],
  divinite: ['Divinité', 'crown', 'accent'],
  peuple: ['Peuple', 'users', 'info'],
};

let entries = [];
let byId = new Map();
let matcher = null;

const KEY = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function loadGlossary(paths = []) {
  entries = [];
  for (const p of paths) {
    try {
      const res = await fetch('./data/' + p, { cache: 'no-cache' });
      if (res.ok) entries.push(...(await res.json()));
    } catch (e) { console.warn('Glossaire illisible', p, e); }
  }
  entries.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  byId = new Map(entries.map((e) => [e.id, e]));
  buildMatcher();
  return entries;
}

function buildMatcher() {
  const terms = [];
  for (const e of entries) {
    for (const a of [e.name, ...(e.aliases || [])]) {
      if (a && a.length > 2) terms.push([a, e.id]);
    }
  }
  terms.sort((a, b) => b[0].length - a[0].length);   // les plus longs d'abord
  if (!terms.length) { matcher = null; return; }
  matcher = {
    re: new RegExp(`(?<![\\p{L}\\p{N}])(${terms.map(([t]) => escapeRe(t)).join('|')})(?![\\p{L}\\p{N}])`, 'giu'),
    byTerm: new Map(terms.map(([t, id]) => [KEY(t), id])),
  };
}

export function allEntries() { return entries; }
export function getEntry(id) { return byId.get(id); }
export function kindMeta(kind) { return KINDS[KEY(kind)] || ['Autre', 'info', '']; }

/**
 * Rend cliquables les termes du glossaire présents dans un élément déjà rendu.
 * Ne touche qu'aux nœuds texte : le balisage existant reste intact.
 * Une seule occurrence par terme et par élément, pour ne pas saturer la lecture.
 */
export function linkGlossary(root) {
  if (!matcher || !root) return root;
  const seen = new Set();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement.closest('a, .grip, .pill, code') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const targets = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) if (n.nodeValue.trim().length > 2) targets.push(n);

  for (const node of targets) {
    matcher.re.lastIndex = 0;
    let m, last = 0, frag = null;
    while ((m = matcher.re.exec(node.nodeValue))) {
      const id = matcher.byTerm.get(KEY(m[1]));
      if (!id || seen.has(id)) continue;
      seen.add(id);
      frag ||= document.createDocumentFragment();
      frag.append(node.nodeValue.slice(last, m.index));
      frag.append(h('a', { class: 'gref', 'data-ref': 'g:' + id }, m[1]));
      last = m.index + m[1].length;
    }
    if (frag) {
      frag.append(node.nodeValue.slice(last));
      node.replaceWith(frag);
    }
  }
  return root;
}

/** Fiche d'une entrée, avec l'état de partie que le MJ peut modifier. */
export function openGlossaryPopup(id) {
  const e = getEntry(id);
  if (!e) return;
  const [kindLabel, kindIcon, kindCls] = kindMeta(e.kind);
  const noteKey = `glossaire/${e.id}`;
  let editing = false;

  const api = openPopup({
    title: e.name,
    subtitle: kindLabel,
    render: () => {
      const custom = store.getOverride(noteKey);
      const row = (label, value, cls) => (value ? h('div', { class: 'gline' },
        h('b', { class: cls || '' }, label), markup(value, 'div')) : null);

      const state = h('div', { class: 'gline' },
        h('b', null, 'État'),
        editing
          ? (() => {
              const ta = h('textarea', { class: 'textarea', style: { minHeight: '90px' }, value: custom ?? e.state ?? '' });
              requestAnimationFrame(() => ta.focus());
              return h('div', null, ta, h('div', { class: 'toolbar', style: { marginTop: '8px' } },
                custom != null ? h('button', { class: 'btn btn-sm', onclick: () => { editing = false; store.setOverride(noteKey, null); } }, icon('undo'), 'Original') : null,
                h('button', { class: 'btn btn-sm', onclick: () => { editing = false; api.redraw(); } }, 'Annuler'),
                h('button', { class: 'btn btn-sm btn-primary', onclick: () => { editing = false; store.setOverride(noteKey, ta.value); } }, icon('check'), 'Enregistrer')));
            })()
          : h('div', { class: 'gstate' + (custom != null ? ' is-edited' : '') },
              markup(custom ?? e.state ?? '—', 'div'),
              h('button', { class: 'btn btn-sm btn-icon btn-ghost', 'aria-label': 'Modifier l’état', onclick: () => { editing = true; api.redraw(); } }, icon('edit'))));

      return h('div', { class: 'glossary-card' },
        h('div', { class: 'toolbar', style: { marginBottom: '12px' } },
          h('span', { class: 'pill ' + kindCls }, icon(kindIcon), kindLabel),
          e.monster ? h('button', { class: 'btn btn-sm', onclick: () => import('./components/monster.js').then((m) => m.openMonsterPopup(e.monster)) }, icon('skull'), 'Fiche de combat') : null),
        row('Qui', e.what),
        e.goal && e.goal !== '—' ? row('But', e.goal) : null,
        state,
        row('Où', e.where));
    },
  });
}
