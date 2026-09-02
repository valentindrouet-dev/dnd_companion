// Vue d'ensemble d'une aventure : synopsis, introduction, PNJ récurrents, plan des salles.

import { h, asTextItem, elemId } from '../dom.js';
import { icon, tagIcon } from '../icons.js';
import { loadAdventure } from '../data.js';
import { store, key } from '../store.js';
import { navigate, roomPath, advPath, listPath } from '../router.js';
import { shell } from './shell.js';
import { roomSidebar } from './sidebar.js';
import { card } from '../components/card.js';
import { openNpcPopup } from '../components/npc.js';
import { statusPill } from '../components/npcstatus.js';
import { condense, textBlock } from '../components/block.js';
import { slug } from '../util.js';
import { adventureProgress } from '../progress.js';
import { openMapPopup, fullMap } from '../components/map.js';
import { openEncounterPopup } from '../encounters/ui.js';

export async function adventureView(route) {
  const adv = await loadAdventure(route.adv);
  const K = (...p) => key(adv.id, '_adv', ...p);
  const first = adv.roomOrder[0];
  const flag = store.flag(adv.id);
  const resume = flag || store.lastRoom(adv.id);
  const resumeRoom = resume ? adv.roomById.get(resume) : null;
  const todos = collectTodos(adv);

  const main = h('div', null,
    h('div', { class: 'hero' },
      h('h1', null, adv.title),
      adv.subtitle ? h('p', null, adv.subtitle) : null,
      h('div', { class: 'room-meta' },
        adv.levels ? h('span', null, `Niveaux ${adv.levels}`) : null,
        adv.source?.book ? h('span', null, `${adv.source.book}${adv.source.pages ? ', p. ' + adv.source.pages : ''}`) : null,
        h('span', { class: 'pill ' + (store.doneCount(adv.id) === adv.roomOrder.length ? 'ok' : '') }, icon('check'), `${store.doneCount(adv.id)} / ${adv.roomOrder.length} salles`),
        h('span', { class: 'pill' }, `${adventureProgress(adv).pct} % coché`))),

    h('div', { class: 'toolbar', style: { marginBottom: '22px' } },
      first ? h('button', { class: 'btn btn-primary', onclick: () => navigate(roomPath(adv.id, first.id)) }, icon('flag'), 'Commencer') : null,
      resumeRoom ? h('button', { class: 'btn' + (flag ? ' is-flag' : ''), onclick: () => navigate(roomPath(adv.id, resumeRoom.id)) },
        icon(flag ? 'flag' : 'forward'), `Reprendre en ${resumeRoom.number ?? resumeRoom.name}`) : null,
      h('button', { class: 'btn', onclick: () => navigate(listPath(adv.id)) }, icon('list'), 'Salles'),
      fullMap(adv.map) ? h('button', { class: 'btn', onclick: () => openMapPopup(adv) }, icon('map'), 'Carte') : null,
      h('button', { class: 'btn', onclick: () => openEncounterPopup({ adv }) }, icon('dice'), 'Rencontre')),

    todos.length ? section('À faire', todos.map((t) => h('button', { class: 'todo-row', onclick: () => navigate(roomPath(adv.id, t.room.id)) },
      h('span', { class: 'num' }, t.room.number ?? '•'),
      h('span', { class: 'text' }, t.title ? h('b', null, t.title + ' — ') : null, t.preview),
      icon('forward', 'card-arrow'))), { count: todos.length }) : null,

    adv.summary ? section('Synopsis', textBlock({ key: K('summary'), text: adv.summary, item: { summary: adv.tagline }, kind: 'note', hideLabel: 'Vu' })) : null,

    list(adv.intro).length ? section('Introduction', list(adv.intro).map((t) =>
      textBlock({ key: K('intro', t.id), text: t.text, title: t.title, item: t, kind: 'read', hideLabel: 'Lu' }))) : null,

    list(adv.notes).length ? section('Notes MJ', list(adv.notes).map((t) =>
      textBlock({ key: K('notes', t.id), text: t.text, title: t.title, item: t, kind: 'note', hideLabel: 'Vu', todo: true }))) : null,

    (adv.npcs || []).length ? section('PNJ récurrents', (adv.npcs || []).map((n, i) => {
      const npc = { ...n, id: elemId(n, i) };
      return card({
        key: K('npc', npc.id),
        badge: icon('users'),
        badgeClass: '',
        title: n.name,
        pills: [statusPill(adv.id, npc)],
        sub: n.role,
        onOpen: () => openNpcPopup(adv.id, { id: '_adv', name: adv.title }, npc),
      });
    })) : null,

    section('Salles', [
      adv.sections.map((s) => h('div', { class: 'section-block' },
        h('h3', null, s.title),
        s.intro ? h('p', { class: 'muted' }, s.intro) : null,
        h('div', { class: 'room-grid' }, (s.rooms || []).map((id) => adv.roomById.get(id)).filter(Boolean).map((r) => roomTile(adv, r))))),
      orphans(adv).length ? h('div', { class: 'section-block' }, h('h3', null, 'Autres salles'), h('div', { class: 'room-grid' }, orphans(adv).map((r) => roomTile(adv, r)))) : null,
    ]),
  );

  return shell({ title: adv.title, subtitle: 'Vue d’ensemble', back: '', sidebar: roomSidebar(adv, null), main,
    actions: [h('button', { class: 'btn btn-icon btn-ghost', 'aria-label': 'Liste des salles', onclick: () => navigate(listPath(adv.id)) }, icon('list'))] });
}

function list(x) { return (Array.isArray(x) ? x : x ? [x] : []).map(asTextItem); }
function orphans(adv) { return adv.roomOrder.filter((r) => !adv.sectionById.has(r.section)); }

function section(title, children, opts) {
  const count = opts?.count;
  return h('div', { class: 'sec' },
    h('div', { class: 'sec-head' }, h('h2', null, title), count != null ? h('span', { class: 'count' }, count) : null),
    children);
}

/** Blocs de notes marqués « à faire », toutes salles confondues. */
function collectTodos(adv) {
  const out = [];
  for (const r of adv.rooms) {
    for (const t of list(r.notes)) {
      const k = key(adv.id, r.id, 'note', t.id);
      if (store.isTodo(k)) out.push({ room: r, title: t.title, preview: condense(t, store.getOverride(k) ?? t.text) });
    }
  }
  return out;
}

function roomTile(adv, r) {
  const done = store.isDone(adv.id, r.id);
  return h('button', { class: 'room-tile' + (done ? ' is-done' : store.isVisited(adv.id, r.id) ? ' is-visited' : ''), onclick: () => navigate(roomPath(adv.id, r.id)) },
    h('span', { class: 'num' }, done ? icon('check') : (r.number ?? '•')),
    h('span', { class: 'name' }, r.name),
    h('span', { class: 'tags' }, (r.tags || []).slice(0, 3).map((t) => {
      const ico = tagIcon(t);
      return ico ? h('span', { class: 'tag ' + slug(t), title: t }, icon(ico)) : null;
    })));
}
