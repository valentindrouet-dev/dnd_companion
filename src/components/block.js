// Blocs de texte : lecture aux joueurs, notes du MJ, éléments, topologie.
// Chaque bloc est coloré selon son type, masquable (« Vu »), condensable en une phrase,
// annotable, modifiable à la volée, marquable « à faire » et réagençable.

import { h } from '../dom.js';
import { icon } from '../icons.js';
import { markup, plain } from '../markup.js';
import { store } from '../store.js';
import { openPopup } from '../ui/popup.js';

// type -> [classe, libellé, icône]
export const BLOCK_TYPES = {
  read: ['b-read', 'Lecture', 'book'],
  note: ['b-note', 'Note MJ', 'notes'],
  feature: ['b-feature', 'Élément', 'search'],
  layout: ['b-layout', 'Topologie', 'layers'],
  dialogue: ['b-dialogue', 'Réplique', 'chat'],
};

const editing = new Map();
const noteEditing = new Map();

function focusLater(el) { requestAnimationFrame(() => { el.focus(); el.setSelectionRange?.(el.value.length, el.value.length); }); }

/** Une phrase courte résumant le bloc : celle des données, sinon la première phrase du texte. */
export function condense(item, text, max = 110) {
  if (item?.summary) return item.summary;
  const flat = plain(text, 10000);
  const stop = flat.search(/[.!?…](\s|$)/);
  let s = stop > 20 ? flat.slice(0, stop + 1) : flat;
  if (s.length > max) s = s.slice(0, max).replace(/\s+\S*$/, '') + '…';
  return s;
}

/**
 * @param {{key:string, text:string, title?:string, item?:object, kind?:string,
 *          hideLabel?:string, todo?:boolean, sid?:string}} o
 */
export function textBlock(o) {
  const { key, text, title, item, kind = 'note', hideLabel = 'Vu', todo = false, sid } = o;
  const [cls, kindLabel, kindIcon] = BLOCK_TYPES[kind] || BLOCK_TYPES.note;
  const override = store.getOverride(key);
  const shown = override ?? text;
  const seen = store.isHidden(key);
  const condensed = store.settings.condensed && !seen;
  const isEditing = editing.has(key);
  const summary = condense(item, shown);

  const openFull = () => openPopup({
    title: title || kindLabel,
    render: () => markup(shown, 'div', 'block-body' + (kind === 'read' ? ' read' : '')),
  });

  const tools = h('div', { class: 'block-tools' },
    todo ? h('button', {
      class: 'btn btn-sm btn-icon btn-ghost' + (store.isTodo(key) ? ' is-todo' : ''),
      'aria-label': store.isTodo(key) ? 'Retirer des choses à faire' : 'Marquer à faire',
      onclick: (e) => { e.stopPropagation(); store.toggleTodo(key); },
    }, icon('flag')) : null,
    !seen && !isEditing ? h('button', {
      class: 'btn btn-sm btn-icon btn-ghost', 'aria-label': 'Modifier le texte',
      onclick: (e) => { e.stopPropagation(); editing.set(key, shown); store.refresh(); },
    }, icon('edit')) : null,
    h('button', {
      class: 'btn btn-sm btn-ghost' + (seen ? ' is-on' : ''),
      onclick: (e) => { e.stopPropagation(); store.setHidden(key, !seen); },
    }, icon(seen ? 'undo' : 'check'), seen ? 'Revoir' : hideLabel));

  const head = h('div', { class: 'block-head' },
    sid ? h('button', { class: 'grip', 'aria-label': 'Déplacer le bloc' }, icon('menu')) : null,
    icon(kindIcon, 'kind-icon'),
    title ? h('div', { class: 'block-title' }, title) : h('div', { class: 'block-kind' }, kindLabel),
    override != null ? h('span', { class: 'edited-flag' }, 'modifié') : null,
    tools);

  let body;
  if (isEditing) {
    const ta = h('textarea', {
      class: 'textarea' + (kind === 'read' ? ' read' : ''),
      value: editing.get(key),
      oninput: (e) => editing.set(key, e.target.value),
    });
    focusLater(ta);
    body = h('div', { class: 'editor' }, ta,
      h('div', { class: 'toolbar' },
        override != null ? h('button', { class: 'btn btn-sm', onclick: () => { editing.delete(key); store.setOverride(key, null); } }, icon('undo'), 'Original') : null,
        h('button', { class: 'btn btn-sm', onclick: () => { editing.delete(key); store.refresh(); } }, 'Annuler'),
        h('button', { class: 'btn btn-sm btn-primary', onclick: () => { const v = editing.get(key); editing.delete(key); store.setOverride(key, v === text ? null : v); } }, icon('check'), 'Enregistrer')));
  } else if (seen || condensed) {
    body = h('div', { class: 'block-body condensed', role: 'button', tabindex: '0', onclick: openFull },
      summary, h('span', { class: 'more' }, icon('expand')));
  } else {
    body = markup(shown, 'div', 'block-body' + (kind === 'read' ? ' read' : ''));
  }

  return h('div', {
    class: `block ${cls}` + (override != null ? ' is-edited' : '') + (seen ? ' is-seen' : '')
      + (store.isTodo(key) ? ' is-todo' : ''),
    dataset: sid ? { sid } : {},
  }, head, body, noteArea(key));
}

/** Bouton « annoter » à placer dans les outils d'une carte. */
export function noteButton(key) {
  const has = !!store.getNote(key);
  const on = noteEditing.has(key);
  return h('button', {
    class: 'btn btn-sm btn-icon btn-ghost' + (has || on ? ' is-on' : ''),
    'aria-label': 'Annoter',
    onclick: (e) => { e.stopPropagation(); if (on) noteEditing.delete(key); else noteEditing.set(key, store.getNote(key) || ''); store.refresh(); },
  }, icon('notes'));
}

/** Zone d'annotation (affichage ou édition) sous un bloc ou une carte. */
export function noteArea(key) {
  if (noteEditing.has(key)) {
    const ta = h('textarea', {
      class: 'textarea', style: { minHeight: '80px' }, placeholder: 'Annotation…',
      value: noteEditing.get(key), oninput: (e) => noteEditing.set(key, e.target.value),
    });
    focusLater(ta);
    return h('div', { class: 'editor' }, ta,
      h('div', { class: 'toolbar' },
        store.getNote(key) ? h('button', { class: 'btn btn-sm btn-danger', onclick: () => { noteEditing.delete(key); store.setNote(key, ''); } }, icon('trash')) : null,
        h('button', { class: 'btn btn-sm', onclick: () => { noteEditing.delete(key); store.refresh(); } }, 'Annuler'),
        h('button', { class: 'btn btn-sm btn-primary', onclick: () => { const v = noteEditing.get(key); noteEditing.delete(key); store.setNote(key, v); } }, icon('check'), 'Enregistrer')));
  }
  const note = store.getNote(key);
  if (!note) return null;
  return h('div', { class: 'note-box', onclick: (e) => { e.stopPropagation(); noteEditing.set(key, note); store.refresh(); } },
    h('span', { class: 'note-label' }, 'Annotation'), note);
}

/** Ligne compacte pour les éléments masqués qui ne sont pas des blocs de texte. */
export function hiddenRow({ key, label, preview }) {
  return h('button', { class: 'hidden-row', onclick: () => store.setHidden(key, false) },
    icon('check'), h('span', { class: 'label' }, label),
    h('span', { class: 'preview' }, preview), h('span', { class: 'restore' }, 'Revoir'));
}
