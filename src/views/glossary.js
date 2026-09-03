// Index alphabétique. Chaque donjon a le sien : depuis une aventure on ne voit que
// ses propres entrées ; depuis l'accueil, tout, avec le donjon indiqué sur chaque ligne.

import { h } from '../dom.js';
import { icon } from '../icons.js';
import { allEntries, kindMeta, openGlossaryPopup, scopesOf, sortKey } from '../glossary.js';
import { getIndex } from '../data.js';
import { shell } from './shell.js';
import { plain } from '../markup.js';
import { advPath } from '../router.js';

let query = '';
let kindFilter = '';

const KEY = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export async function glossaryView(route = {}) {
  const advId = route.adv || null;
  const adv = (getIndex()?.adventures || []).find((a) => a.id === advId);
  const shortTitle = (id) => {
    const a = (getIndex()?.adventures || []).find((x) => x.id === id);
    return a ? a.title.split(' : ')[0] : id;
  };
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
      const first = sortKey(e.name).charAt(0).toUpperCase();
      if (first !== letter) { letter = first; list.append(h('div', { class: 'alpha' }, letter)); }
      const [label, ico, cls] = kindMeta(e.kind);
      // Hors d'un donjon, on dit d'où vient chaque terme : « Xanathar » n'a pas la
      // même fiche selon la strate, et la fiche globale les montre toutes les deux.
      const where = advId ? [] : scopesOf(e.id);
      list.append(h('button', { class: 'gitem', onclick: () => openGlossaryPopup(e.id, { adv: advId }) },
        h('span', { class: 'gicon ' + (cls ? 'c-' + cls : '') }, icon(ico)),
        h('span', { class: 'gtext' },
          h('span', { class: 'gname' }, e.name,
            where.map((a) => h('span', { class: 'pill tiny' }, shortTitle(a)))),
          h('span', { class: 'gwhat' }, plain(e.what, 120))),
        icon('forward', 'card-arrow')));
    }
  }
  build();

  const main = h('div', null,
    h('div', { class: 'hero' },
      h('h1', null, 'Index'),
      adv ? h('p', null, adv.title) : h('p', null, 'Tous les donjons réunis.')),
    h('div', { class: 'search', style: { marginBottom: '10px' } }, icon('search'), input),
    filters, list);

  return shell({ title: 'Index', back: adv ? advPath(adv.id) : '', main });
}
