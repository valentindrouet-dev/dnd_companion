import { h } from '../dom.js';

const root = document.getElementById('toasts');
const live = new Map(); // clé -> { el, timer }

/**
 * @param {string} message
 * @param {number|{ms?: number, key?: string}} [opts]
 *        `key` : les messages de même clé se remplacent au lieu de s'empiler
 *        (un compteur sur lequel on tape plusieurs fois n'inonde pas l'écran).
 */
export function toast(message, opts = {}) {
  const { ms = 1800, key = null } = typeof opts === 'number' ? { ms: opts } : opts;

  if (key && live.has(key)) {
    const prev = live.get(key);
    clearTimeout(prev.timer);
    prev.el.textContent = message;
    prev.timer = setTimeout(() => { prev.el.remove(); live.delete(key); }, ms);
    return;
  }

  const el = h('div', { class: 'toast' }, message);
  root.append(el);
  const timer = setTimeout(() => { el.remove(); if (key) live.delete(key); }, ms);
  if (key) live.set(key, { el, timer });
}
