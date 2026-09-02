// Fenêtres surgissantes (monstres, dialogues, trésors, générateurs…).
// Une seule à la fois : en ouvrir une remplace la précédente.
// `back` fait exception : la fenêtre affiche une flèche de retour, et la refermer
// rouvre celle d'où l'on vient (une fiche de monstre ouverte depuis une rencontre
// aléatoire ramène à la rencontre, avec son tirage intact).
// Le contenu est une fonction `render()` ré-exécutée à chaque changement d'état,
// pour que les cases cochées / masquages restent synchronisés.

import { h, clear } from '../dom.js';
import { icon } from '../icons.js';
import { store } from '../store.js';

const root = document.getElementById('popups');
const stack = [];

export function openPopup({ title, subtitle, render, size = 'md', onClose, keepOpen = false, back = null }) {
  // Une fenêtre à la fois : ouvrir en remplace une autre, plutôt que de les empiler.
  if (!keepOpen) closeAllPopups();
  const body = h('div', { class: 'popup-body' });
  const entry = { body, render, onClose, back: back?.open || null, unsub: null, backdrop: null };

  const head = h('div', { class: 'popup-head' },
    entry.back
      ? h('button', { class: 'btn btn-icon btn-ghost', 'aria-label': `Retour : ${back.label || 'précédent'}`, title: back.label || 'Retour', onclick: () => close(entry, true) }, icon('back'))
      : null,
    h('div', { class: 'popup-title' },
      h('h2', null, title),
      subtitle ? h('div', { class: 'sub' }, subtitle) : null),
    h('button', { class: 'btn btn-icon btn-ghost', 'aria-label': 'Fermer', onclick: () => close(entry, true) }, icon('x')));

  const popup = h('div', { class: `popup ${size}`, role: 'dialog', 'aria-modal': 'true' }, head, body);
  entry.backdrop = h('div', { class: 'popup-backdrop', onclick: (e) => { if (e.target === entry.backdrop) close(entry, true); } }, popup);

  const draw = () => {
    const st = body.scrollTop;
    clear(body);
    const content = render(api);
    if (content) body.append(content);
    body.scrollTop = st;
  };
  const api = { close: () => close(entry, false), redraw: draw, body };
  entry.draw = draw;

  draw();
  entry.unsub = store.subscribe(draw);
  root.append(entry.backdrop);
  stack.push(entry);
  return api;
}

// `byUser` distingue une fermeture voulue (croix, fond, Échap, flèche de retour)
// d'un simple remplacement par une autre fenêtre : seule la première fait le retour.
function close(entry, byUser = false) {
  const i = stack.indexOf(entry);
  if (i < 0) return;
  stack.splice(i, 1);
  entry.unsub?.();
  entry.backdrop.remove();
  entry.onClose?.();
  if (byUser && entry.back) entry.back();
}

// forEach passerait l'index en second argument : il serait pris pour `byUser`.
export function closeAllPopups() { [...stack].forEach((e) => close(e, false)); }
export function popupCount() { return stack.length; }

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && stack.length) close(stack[stack.length - 1], true);
});

/** Boîte de confirmation simple (retourne une promesse booléenne). */
export function confirmPopup({ title, text, okLabel = 'Confirmer', danger = false }) {
  return new Promise((resolve) => {
    let done = false;
    const api = openPopup({
      title,
      keepOpen: true,
      onClose: () => { if (!done) resolve(false); },
      render: () => h('div', null,
        h('p', null, text),
        h('div', { class: 'toolbar', style: { justifyContent: 'flex-end', marginTop: '16px' } },
          h('button', { class: 'btn', onclick: () => { done = true; api.close(); resolve(false); } }, 'Annuler'),
          h('button', { class: `btn ${danger ? 'btn-danger' : 'btn-primary'}`, onclick: () => { done = true; api.close(); resolve(true); } }, okLabel))),
    });
  });
}
