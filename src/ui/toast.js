import { h } from '../dom.js';

const root = document.getElementById('toasts');

export function toast(message, ms = 1800) {
  const el = h('div', { class: 'toast' }, message);
  root.append(el);
  setTimeout(() => el.remove(), ms);
}
