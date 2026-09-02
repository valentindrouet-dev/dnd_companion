// Index alphabétique : tout ce qui compte dans l'aventure, à portée de recherche.

import { h } from '../dom.js';
import { icon } from '../icons.js';
import { allEntries, kindMeta, openGlossaryPopup } from '../glossary.js';
import { shell } from './shell.js';
import { plain } from '../markup.js';

let query = '';
let kindFilter = '';

const KEY = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export async function glossaryView() {
  const list = h('div');
  const input = h('input', {
    class: 'input', type: 'search', placeholder: 'Nom, faction, lieu…', value: query,
    oninput: (e) => { query = e.target.value; build(); },
  });

  const kinds = [...new Set(allEntries().map((e) => KEY(e.kind)))];
  const filters = h('div', { class: 'toolbar', style: { marginBottom: '14px' } },
    h('button', { class: 'btn btn-sm' + (kindFilter ? '' : ' is-on'), onclick: () => { kindFilter = ''; build(); redrawFilters(); } }, 'Tout'),
    kinds.map((k) => {
      const [label, ico, cls] = kindMeta(k);
      return h('button', { class: 'btn btn-sm' + (kindFilter === k ? ' is-on' : ''), onclick: () => { kindFilter = k; build(); redrawFilters(); } }, icon(ico, cls ? 'c-' + cls : ''), label);
    }));
  function redrawFilters() {
    [...filters.children].forEach((b, i) => b.classList.toggle('is-on', i === 0 ? !kindFilter : kinds[i - 1] === kindFilter));
  }

  function build() {
    list.replaceChildren();
    const q = KEY(query.trim());
    const items = allEntries().filter((e) =>
      (!kindFilter || KEY(e.kind) === kindFilter) &&
      (!q || KEY(e.name).includes(q) || (e.aliases || []).some((a) => KEY(a).includes(q)) || KEY(e.what).includes(q)));
    if (!items.length) { list.append(h('div', { class: 'empty' }, 'Rien ne correspond.')); return; }

    let letter = null;
    for (const e of items) {
      const first = e.name.replace(/^(la |le |les |l’)/i, '').charAt(0).toUpperCase();
      if (first !== letter) { letter = first; list.append(h('div', { class: 'alpha' }, letter)); }
      const [label, ico, cls] = kindMeta(e.kind);
      list.append(h('button', { class: 'gitem', onclick: () => openGlossaryPopup(e.id) },
        h('span', { class: 'gicon ' + (cls ? 'c-' + cls : '') }, icon(ico)),
        h('span', { class: 'gtext' },
          h('span', { class: 'gname' }, e.name),
          h('span', { class: 'gwhat' }, plain(e.what, 120))),
        icon('forward', 'card-arrow')));
    }
  }
  build();

  const main = h('div', null,
    h('div', { class: 'hero' }, h('h1', null, 'Index')),
    h('div', { class: 'search', style: { marginBottom: '10px' } }, icon('search'), input),
    filters, list);

  return shell({ title: 'Index', back: '', main });
}
