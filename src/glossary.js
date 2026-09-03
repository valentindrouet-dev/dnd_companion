// Glossaire : personnages, factions, lieux, objets et divinités de l'aventure.
// Les termes sont repérés automatiquement dans les textes et rendus cliquables.

import { h } from './dom.js';
import { icon } from './icons.js';
import { markup } from './markup.js';
import { store } from './store.js';
import { getIndex } from './data.js';
import { openPopup } from './ui/popup.js';
import { isVisible, enhancedOn } from './variant.js';

export const KINDS = {
  personne: ['Personnage', 'users', 'ok'],
  faction: ['Faction', 'flag', 'danger'],
  lieu: ['Lieu', 'map', 'info'],
  objet: ['Objet', 'gem', 'accent'],
  divinite: ['Divinité', 'crown', 'accent'],
  peuple: ['Peuple', 'users', 'info'],
};

// Chaque donjon a son propre index : un socle commun de lore, puis un fichier par
// aventure qui dit ce que le terme devient *dans ce donjon-là*. Les fichiers sont
// fusionnés dans l'ordre, champ par champ — d'où « Xanathar » raconté deux fois.
const files = new Map();          // chemin -> entrées du fichier
let scopes = new Map();           // id d'aventure (ou '') -> liste de chemins
let entries = [];                 // portée courante, fusionnée et triée
let byId = new Map();
let matcher = null;
let scopeId = null;
let cacheStamp = null;

const KEY = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** « La Guilde de Xanathar » se range à G : l'article ne compte pas. */
export function sortKey(name) { return String(name ?? '').replace(/^(la |le |les |l’|l')/i, ''); }
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** @param {Map<string,string[]>|object} byScope portées à composer, '' pour la portée globale */
export async function loadGlossary(byScope = {}) {
  scopes = byScope instanceof Map ? byScope : new Map(Object.entries(byScope));
  const paths = [...new Set([...scopes.values()].flat())];
  await Promise.all(paths.map(async (p) => {
    try {
      const res = await fetch('./data/' + p, { cache: 'no-cache' });
      if (res.ok) files.set(p, await res.json());
    } catch (e) { console.warn('Glossaire illisible', p, e); }
  }));
  setGlossaryScope(null);
  return entries;
}

/** Compose les entrées d'une portée : les fichiers suivants complètent et corrigent. */
function compose(paths) {
  const merged = new Map();
  for (const p of paths) {
    for (const e of files.get(p) || []) merged.set(e.id, { ...(merged.get(e.id) || {}), ...e });
  }
  return [...merged.values()]
    .filter((e) => e.name && isVisible(e))
    .sort((a, b) => sortKey(a.name).localeCompare(sortKey(b.name), 'fr'));
}

/** Bascule l'index sur un donjon. `null` = index global (tous les donjons réunis). */
export function setGlossaryScope(advId) {
  const key = advId || '';
  // la Version Améliorée ajoute des entrées : elle fait partie de la clé de cache
  const stamp = key + '|' + enhancedOn();
  if (cacheStamp === stamp) return entries;
  cacheStamp = stamp;
  scopeId = key;
  entries = compose(scopes.get(key) || scopes.get('') || []);
  byId = new Map(entries.map((e) => [e.id, e]));
  buildMatcher();
  return entries;
}

export function currentScope() { return scopeId || null; }

/** Donjons où le terme est décrit — pour l'index global. */
export function scopesOf(id) {
  const out = [];
  for (const [key, paths] of scopes) {
    if (!key) continue;
    if (paths.some((p) => (files.get(p) || []).some((e) => e.id === id && e.state))) out.push(key);
  }
  return out;
}

/** L'entrée telle que ce donjon la raconte, quelle que soit la portée courante. */
export function entryIn(advId, id) {
  const paths = scopes.get(advId || '') || [];
  return compose(paths).find((e) => e.id === id) || null;
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
// Entrée en cours d'affichage : ses propres mots-clés ne doivent pas être cliquables.
let selfId = null;
export function withoutSelfLinks(id, fn) {
  const previous = selfId;
  selfId = id;
  try { return fn(); } finally { selfId = previous; }
}

export function linkGlossary(root) {
  if (!matcher || !root) return root;
  const seen = new Set(selfId ? [selfId] : []);
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

/** Titre court d'un donjon, pour les intertitres de l'index global. */
function advTitle(id) {
  const a = (getIndex()?.adventures || []).find((x) => x.id === id);
  return a ? a.title.split(' : ')[0] : id;
}

/**
 * Fiche d'une entrée. Dans un donjon on ne montre que ce que ce donjon en dit ;
 * depuis l'index global, on montre les deux versions l'une sous l'autre.
 * @param {string} id
 * @param {{ adv?: string }} [opts] donjon dont on veut la version
 */
export function openGlossaryPopup(id, opts = {}) {
  const adv = opts.adv ?? currentScope();
  const e = (adv ? entryIn(adv, id) : null) || getEntry(id);
  if (!e) return;
  const [kindLabel, kindIcon, kindCls] = kindMeta(e.kind);
  const sections = adv ? [adv] : scopesOf(id);
  const editing = new Set();

  const api = openPopup({
    title: e.name,
    subtitle: kindLabel,
    render: () => withoutSelfLinks(e.id, () => {
      const row = (label, value, cls) => (value ? h('div', { class: 'gline' },
        h('b', { class: cls || '' }, label), markup(value, 'div')) : null);

      /** Bloc « État » d'un donjon : modifiable, et propre à ce donjon. */
      const stateBlock = (advId, ent) => {
        const noteKey = `${advId}/glossaire/${e.id}`;
        // Les notes d'avant l'index par donjon vivaient sous une clé sans aventure.
        const custom = store.getOverride(noteKey) ?? store.getOverride(`glossaire/${e.id}`);
        const stop = () => { editing.delete(advId); api.redraw(); };
        return h('div', { class: 'gline' },
          h('b', null, 'État'),
          editing.has(advId)
            ? (() => {
                const ta = h('textarea', { class: 'textarea', style: { minHeight: '90px' }, value: custom ?? ent.state ?? '' });
                requestAnimationFrame(() => ta.focus());
                return h('div', null, ta, h('div', { class: 'toolbar', style: { marginTop: '8px' } },
                  custom != null ? h('button', { class: 'btn btn-sm', onclick: () => { editing.delete(advId); store.setOverride(noteKey, null); } }, icon('undo'), 'Original') : null,
                  h('button', { class: 'btn btn-sm', onclick: stop }, 'Annuler'),
                  h('button', { class: 'btn btn-sm btn-primary', onclick: () => { editing.delete(advId); store.setOverride(noteKey, ta.value); } }, icon('check'), 'Enregistrer')));
              })()
            : h('div', { class: 'gstate' + (custom != null ? ' is-edited' : '') },
                markup(custom ?? ent.state ?? '—', 'div'),
                h('button', { class: 'btn btn-sm btn-icon btn-ghost', 'aria-label': 'Modifier l’état', onclick: () => { editing.add(advId); api.redraw(); } }, icon('edit'))));
      };

      /** Ce que ce donjon-là dit du terme. */
      const section = (advId, withTitle) => {
        const ent = entryIn(advId, id);
        if (!ent) return null;
        return h('div', { class: 'gsection' },
          withTitle ? h('h4', { class: 'gsection-title' }, icon('map'), advTitle(advId)) : null,
          ent.goal && ent.goal !== '—' ? row('But', ent.goal) : null,
          stateBlock(advId, ent),
          row('Où', ent.where));
      };

      return h('div', { class: 'glossary-card' },
        h('div', { class: 'toolbar', style: { marginBottom: '12px' } },
          h('span', { class: 'pill ' + kindCls }, icon(kindIcon), kindLabel),
          e.monster ? h('button', { class: 'btn btn-sm', onclick: () => import('./components/monster.js').then((m) => m.openMonsterPopup(e.monster)) }, icon('skull'), 'Fiche de combat') : null),
        row('Qui', e.what),
        sections.length ? sections.map((a) => section(a, sections.length > 1)) : row('But', e.goal));
    }),
  });
}
