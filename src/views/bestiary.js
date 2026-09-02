// Bestiaire : toutes les fiches en bandeaux fins, avec recherche et tri.

import { h } from '../dom.js';
import { icon } from '../icons.js';
import { allMonsters } from '../data.js';
import { shell } from './shell.js';
import { band, bandBar } from './../components/band.js';
import { openEncounterPopup } from '../encounters/ui.js';
import { openMonsterPopup } from '../components/monster.js';
import { lootTableFor, expectedValue } from '../loot/generator.js';

let query = '';
let sort = 'nom';

const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Le type du bestiaire est en français : on le ramène aux catégories colorées. */
const TONES = [
  ['aberration', 'aberration'], ['mort-vivant', 'undead'], ['fielon', 'fiend'], ['celeste', 'celestial'],
  ['vase', 'ooze'], ['artificielle', 'construct'], ['elementaire', 'elemental'], ['geant', 'giant'],
  ['monstruosite', 'monstrosity'], ['nuee', 'swarm'], ['plante', 'plant'], ['bete', 'beast'],
  ['fee', 'humanoid'], ['humanoide', 'human'],
];
export function monsterTone(m) {
  const t = norm(m.type);
  return (TONES.find(([fr]) => t.includes(fr)) || [, 'construct'])[1];
}

/** « 1/4 » → 0.25, pour trier par dangerosité. */
function crValue(cr) {
  const s = String(cr ?? '');
  if (s.includes('/')) { const [a, b] = s.split('/'); return Number(a) / Number(b); }
  return Number(s) || 0;
}

export async function bestiaryView(route) {
  const list = h('div');
  const input = h('input', {
    class: 'input', type: 'search', placeholder: 'Nom, type, FP…', value: query,
    oninput: (e) => { query = e.target.value; build(); },
  });
  const select = h('select', { class: 'select', style: { width: 'auto' }, onchange: (e) => { sort = e.target.value; build(); } },
    h('option', { value: 'nom', selected: sort === 'nom' }, 'Par nom'),
    h('option', { value: 'fp', selected: sort === 'fp' }, 'Par FP'),
    h('option', { value: 'type', selected: sort === 'type' }, 'Par type'));

  function build() {
    const q = norm(query.trim());
    let items = allMonsters().filter((m) => !q
      || norm(m.name).includes(q) || norm(m.nameEn).includes(q) || norm(m.type).includes(q)
      || norm('fp ' + m.cr) === q || String(m.cr) === q);
    if (sort === 'fp') items = [...items].sort((a, b) => crValue(b.cr) - crValue(a.cr) || a.name.localeCompare(b.name, 'fr'));
    if (sort === 'type') items = [...items].sort((a, b) => String(a.type).localeCompare(String(b.type), 'fr') || a.name.localeCompare(b.name, 'fr'));

    list.replaceChildren(h('div', null,
      bandBar([[items.length, 'créature(s)'], [new Set(items.map(monsterTone)).size, 'catégories']]),
      items.length ? items.map(row) : h('div', { class: 'empty' }, 'Aucune créature ne correspond.')));
  }

  function row(m) {
    const table = lootTableFor(m.id);
    return band({
      tone: monsterTone(m),
      title: m.name,
      onOpen: () => openMonsterPopup(m.id),
      meta: [
        h('span', { class: 'pill danger' }, icon('skull'), `FP ${m.cr ?? '?'}`),
        h('span', { class: 'pill' }, `CA ${m.ac ?? '—'}`),
        h('span', { class: 'pill' }, `${m.hp ?? '—'} PV`),
        // Toutes les créatures ont une table : c'est le gain moyen qui les distingue.
        table ? h('span', { class: 'pill accent' }, icon('gem'), `${expectedValue(table).po} po`) : null,
        h('span', { class: 'band-type' }, m.type),
      ],
    });
  }
  build();

  if (route.monster) setTimeout(() => openMonsterPopup(route.monster), 0);

  const main = h('div', null,
    h('div', { class: 'hero' }, h('h1', null, 'Bestiaire')),
    h('div', { class: 'toolbar', style: { marginBottom: '14px' } },
      h('div', { class: 'search', style: { flex: '1', minWidth: '200px' } }, icon('search'), input),
      select,
      h('button', { class: 'btn', onclick: () => openEncounterPopup({}) }, icon('dice'), 'Rencontre')),
    list);

  return shell({ title: 'Bestiaire', back: '', main });
}
