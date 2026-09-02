// Bloc de texte masquable (« Lu », « Dit »…) et modifiable à la volée,
// plus les annotations attachables à n'importe quel élément.

import { h } from '../dom.js';
import { icon } from '../icons.js';
import { markup, plain } from '../markup.js';
import { store } from '../store.js';

// Brouillons d'édition en cours (état volatile, survit aux re-rendus).
const editing = new Map();
const noteEditing = new Map();

function focusLater(el) { requestAnimationFrame(() => { el.focus(); el.setSelectionRange?.(el.value.length, el.value.length); }); }

/**
 * Bloc de texte (lecture aux joueurs, note MJ, élément de décor…).
 * @param {{key:string, text:string, title?:string, kind?:'read'|'note'|'feature', hideLabel?:string, kindLabel?:string}} o
 */
export function textBlock({ key, text, title, kind = 'note', hideLabel = 'Lu', kindLabel = '' }) {
  const override = store.getOverride(key);
  const shown = override ?? text;

  if (store.isHidden(key)) {
    return hiddenRow({ key, label: hideLabel, preview: title ? `${title} — ${plain(shown)}` : plain(shown) });
  }

  const isEditing = editing.has(key);
  const tools = h('div', { class: 'block-tools' },
    h('button', {
      class: 'btn btn-sm btn-icon btn-ghost' + (isEditing ? ' is-on' : ''),
      'aria-label': 'Modifier le texte',
      onclick: () => { if (isEditing) editing.delete(key); else editing.set(key, shown); store.refresh(); },
    }, icon('edit')),
    h('button', { class: 'btn btn-sm btn-ghost', onclick: () => store.setHidden(key, true) }, icon('check'), hideLabel));

  const head = h('div', { class: 'block-head' },
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
        override != null
          ? h('button', { class: 'btn btn-sm', onclick: () => { editing.delete(key); store.setOverride(key, null); } }, icon('undo'), 'Texte d’origine')
          : null,
        h('button', { class: 'btn btn-sm', onclick: () => { editing.delete(key); store.refresh(); } }, 'Annuler'),
        h('button', {
          class: 'btn btn-sm btn-primary',
          onclick: () => { const v = editing.get(key); editing.delete(key); store.setOverride(key, v === text ? null : v); },
        }, icon('check'), 'Enregistrer')));
  } else {
    body = markup(shown, 'div', 'block-body' + (kind === 'read' ? ' read' : ''));
  }

  return h('div', { class: 'block' + (kind === 'read' ? ' block-read' : '') + (override != null ? ' is-edited' : '') }, head, body);
}

/** Ligne compacte remplaçant un élément masqué ; un appui le réaffiche. */
export function hiddenRow({ key, label, preview }) {
  return h('button', { class: 'hidden-row', onclick: () => store.setHidden(key, false) },
    icon('check'),
    h('span', { class: 'label' }, label),
    h('span', { class: 'preview' }, preview),
    h('span', { class: 'restore' }, 'Réafficher'));
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

/** Zone d'annotation (affichage ou édition) sous une carte. */
export function noteArea(key) {
  if (noteEditing.has(key)) {
    const ta = h('textarea', {
      class: 'textarea',
      style: { minHeight: '80px' },
      placeholder: 'Annotation…',
      value: noteEditing.get(key),
      oninput: (e) => noteEditing.set(key, e.target.value),
    });
    focusLater(ta);
    return h('div', { class: 'editor' }, ta,
      h('div', { class: 'toolbar' },
        store.getNote(key) ? h('button', { class: 'btn btn-sm btn-danger', onclick: () => { noteEditing.delete(key); store.setNote(key, ''); } }, icon('trash'), 'Supprimer') : null,
        h('button', { class: 'btn btn-sm', onclick: () => { noteEditing.delete(key); store.refresh(); } }, 'Annuler'),
        h('button', { class: 'btn btn-sm btn-primary', onclick: () => { const v = noteEditing.get(key); noteEditing.delete(key); store.setNote(key, v); } }, icon('check'), 'Enregistrer')));
  }
  const note = store.getNote(key);
  if (!note) return null;
  return h('div', { class: 'note-box', onclick: () => { noteEditing.set(key, note); store.refresh(); } },
    h('span', { class: 'note-label' }, 'Annotation'), note);
}
