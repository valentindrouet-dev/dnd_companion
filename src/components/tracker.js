// Compteur de progression déclaré par l'aventure (la Marée d'Halaster, et ce qui suivra).
// Il vit dans la barre du haut : visible depuis n'importe quelle page de l'aventure.

import { h } from '../dom.js';
import { icon } from '../icons.js';
import { store } from '../store.js';
import { markup } from '../markup.js';
import { openPopup } from '../ui/popup.js';
import { toast } from '../ui/toast.js';
import { isVisible } from '../variant.js';

/** Compteurs de l'aventure visibles dans la version courante. */
export function trackersOf(adv) {
  return (adv?.trackers || []).filter(isVisible);
}

export function trackerStep(adv, t) {
  return Math.min(store.tracker(adv.id, t.id), t.steps.length - 1);
}

/** Teinte : du calme au pire, sur cinq crans quel que soit le nombre de paliers. */
function tone(step, last) {
  if (step === 0) return 'tk-0';
  return 'tk-' + Math.min(5, Math.ceil((step / last) * 5));
}

/** Le bouton de la barre du haut : un appui avance d'un palier, l'appui long ouvre le détail. */
export function trackerButton(adv, t) {
  const step = trackerStep(adv, t);
  const last = t.steps.length - 1;
  const cur = t.steps[step];
  let held = false;
  let timer = null;

  const advance = () => {
    const next = step >= last ? 0 : step + 1;
    store.setTracker(adv.id, t.id, next);
    const s = t.steps[next];
    toast(`${t.name} — ${next === 0 ? s.label : `palier ${next} : ${s.label}`}`, { key: 'tracker:' + t.id });
  };
  const hold = () => { held = true; openTrackerPopup(adv, t); };

  return h('button', {
    class: `btn btn-sm tracker ${tone(step, last)}`,
    'aria-label': `${t.name} : ${cur.label}. Appui pour avancer, appui long pour le détail.`,
    title: `${t.name} — ${cur.label}`,
    onclick: () => { if (!held) advance(); held = false; },
    oncontextmenu: (e) => { e.preventDefault(); hold(); },
    onpointerdown: () => { timer = setTimeout(hold, 550); },
    onpointerup: () => clearTimeout(timer),
    onpointerleave: () => clearTimeout(timer),
  },
    icon(t.icon || 'water'),
    h('span', { class: 'tk-step' }, step === 0 ? '—' : String(step)),
    h('span', { class: 'tk-label' }, cur.label));
}

/** Le détail : tous les paliers, celui où l'on est, et de quoi sauter directement. */
export function openTrackerPopup(adv, t) {
  openPopup({
    title: t.name,
    subtitle: adv.title,
    size: 'lg',
    render: (api) => {
      const step = trackerStep(adv, t);
      const last = t.steps.length - 1;
      return h('div', null,
        t.text ? markup(t.text, 'p', 'muted small') : null,
        h('div', { class: 'tk-list' }, t.steps.map((s, i) => h('button', {
          class: 'tk-row' + (i === step ? ' is-now' : '') + (i < step ? ' is-past' : '') + ' ' + tone(i, last),
          onclick: () => { store.setTracker(adv.id, t.id, i); api.redraw(); },
        },
          h('span', { class: 'tk-num' }, i === 0 ? '—' : i),
          h('span', { class: 'tk-body' },
            h('b', null, s.label),
            s.text ? markup(s.text, 'div', 'small muted') : null),
          i === step ? icon('check', 'tk-here') : null))),
        h('div', { class: 'toolbar', style: { marginTop: '12px' } },
          h('button', { class: 'btn btn-sm', onclick: () => { store.setTracker(adv.id, t.id, Math.max(0, step - 1)); api.redraw(); } }, icon('minus'), 'Reculer'),
          h('button', { class: 'btn btn-sm btn-primary', onclick: () => { store.setTracker(adv.id, t.id, Math.min(last, step + 1)); api.redraw(); } }, icon('plus'), 'Avancer'),
          step ? h('button', { class: 'btn btn-sm btn-ghost', onclick: () => { store.setTracker(adv.id, t.id, 0); api.redraw(); } }, icon('undo'), 'Remettre à zéro') : null));
    },
  });
}
