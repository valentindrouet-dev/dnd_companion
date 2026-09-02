// Page d'une salle : plan, topologie, lecture, notes MJ, éléments, créatures,
// PNJ, trésor, pièges, sorties et notes de séance.

import { h, asTextItem, elemId } from '../dom.js';
import { icon, tagIcon } from '../icons.js';
import { markup } from '../markup.js';
import { loadAdventure, roomNeighbours, getMonster, encounterXP } from '../data.js';
import { store, key } from '../store.js';
import { navigate, roomPath, advPath, listPath } from '../router.js';
import { openPopup, confirmPopup } from '../ui/popup.js';
import { toast } from '../ui/toast.js';
import { shell } from './shell.js';
import { roomSidebar } from './sidebar.js';
import { textBlock } from '../components/block.js';
import { makeSortable, applyOrder } from '../ui/sortable.js';
import { card, pill } from '../components/card.js';
import { openMonsterPopup, monsterSummary, monsterStatblock } from '../components/monster.js';
import { attitudePill, openNpcPopup } from '../components/npc.js';
import { treasureCards, openTreasurePopup, normalizeTreasure } from '../components/treasure.js';
import { connectionCards } from '../components/connections.js';
import { mapThumb, openMapPopup, roomMap } from '../components/map.js';
import { openLootPopup } from '../loot/ui.js';
import { openEncounterPopup } from '../encounters/ui.js';
import { roomProgress } from '../progress.js';
import { slug } from '../util.js';

function list(x) { return (Array.isArray(x) ? x : x ? [x] : []).map(asTextItem); }

const notesOpen = new Map();   // notes de séance dépliées, par salle

/** Liste de blocs réagençable par glisser-déposer ; l'ordre est mémorisé. */
function blockList(scope, items, render) {
  const ordered = applyOrder(items, store.getOrder(scope));
  const box = h('div', { class: 'block-list' }, ordered.map(render));
  if (ordered.length > 1) makeSortable(box, { onEnd: (ids) => store.setOrder(scope, ids) });
  return box;
}

function section(title, children, { count, actions, ico } = {}) {
  const kids = Array.isArray(children) ? children.flat().filter(Boolean) : [children].filter(Boolean);
  if (!kids.length) return null;
  return h('div', { class: 'sec' },
    h('div', { class: 'sec-head' },
      ico ? icon(ico) : null,
      h('h2', null, title),
      count != null ? h('span', { class: 'count' }, count) : null,
      actions),
    kids);
}

/** Anneau de progression (proportion d'éléments cochés). */
function progressRing(pct) {
  const r = 18, c = 2 * Math.PI * r;
  return h('div', { class: 'ring' + (pct >= 100 ? ' full' : ''), title: `${pct} % des éléments cochés` },
    h('div', { html: `<svg viewBox="0 0 42 42"><circle class="bg" cx="21" cy="21" r="${r}"/><circle class="fg" cx="21" cy="21" r="${r}" stroke-dasharray="${(c * pct) / 100} ${c}"/></svg>` }),
    h('b', null, pct + '%'));
}

export async function roomView(route) {
  const adv = await loadAdventure(route.adv);
  const room = adv.roomById.get(route.room);
  if (!room) {
    return shell({ title: adv.title, back: advPath(adv.id), sidebar: roomSidebar(adv, null),
      main: h('div', { class: 'empty' }, `Salle introuvable : ${route.room}`) });
  }
  store.markVisited(adv.id, room.id);

  const { prev, next } = roomNeighbours(adv, room);
  const sectionMeta = adv.sectionById.get(room.section);
  const done = store.isDone(adv.id, room.id);
  const flagged = store.isFlagged(adv.id, room.id);
  const prog = roomProgress(adv.id, room);
  const K = (...p) => key(adv.id, room.id, ...p);
  const navBtn = (r, ico, label) => h('button', {
    class: 'btn btn-icon', 'aria-label': label, disabled: !r,
    onclick: () => r && navigate(roomPath(adv.id, r.id)),
  }, icon(ico));

  const head = h('div', { class: 'room-head' },
    h('div', { class: 'room-num' }, room.number ?? '•'),
    h('div', { class: 'room-title' },
      h('h1', null, room.name),
      h('div', { class: 'room-meta' },
        sectionMeta ? h('span', null, sectionMeta.title) : null,
        (room.tags || []).map((t) => {
          const ico = tagIcon(t);
          return h('span', { class: 'tag ' + slug(t) }, ico ? icon(ico) : null, t);
        }))),
    progressRing(prog.pct),
    h('div', { class: 'room-nav' },
      h('button', {
        class: 'btn btn-icon' + (store.settings.condensed ? ' is-on' : ''),
        'aria-label': store.settings.condensed ? 'Afficher les textes complets' : 'Résumer les textes',
        onclick: () => { store.setSetting('condensed', !store.settings.condensed); toast(store.settings.condensed ? 'Textes résumés' : 'Textes complets'); },
      }, icon(store.settings.condensed ? 'expand' : 'compress')),
      h('button', {
        class: 'btn btn-icon' + (flagged ? ' is-flag' : ''),
        'aria-label': flagged ? 'Retirer le drapeau de fin de séance' : 'Poser le drapeau de fin de séance',
        onclick: () => { store.setFlag(adv.id, room.id); toast(store.isFlagged(adv.id, room.id) ? 'Drapeau posé ici' : 'Drapeau retiré'); },
      }, icon('flag')),
      h('button', {
        class: 'btn btn-icon' + (done ? ' is-done' : ''), 'aria-label': done ? 'Salle faite' : 'Marquer la salle comme faite',
        onclick: () => { store.toggleDone(adv.id, room.id); toast(store.isDone(adv.id, room.id) ? 'Salle cochée' : 'Salle décochée'); },
      }, icon('check')),
      navBtn(prev, 'back', 'Salle précédente'), navBtn(next, 'forward', 'Salle suivante')));

  const enemies = (room.enemies || []).map((e, i) => ({ ...e, _id: elemId(e, i) }));
  const xp = encounterXP(enemies);
  const enemyCards = enemies.map((e) => {
    const m = getMonster(e.monster);
    const name = e.name || m?.name || e.monster;
    return card({
      key: K('enemy', e._id),
      badge: `×${e.count || 1}`,
      badgeClass: 'danger',
      title: name,
      pills: [
        e.hidden ? pill('caché', 'info', 'eyeOff') : null,
        m?.cr != null ? pill(`FP ${m.cr}`, '', 'skull') : null,
        e.hp ? pill(`${e.hp} PV`, 'danger', 'heart') : null,
      ],
      sub: e.where,
      sub2: e.tactics || m?.summary?.tactics,
      hideLabel: 'Vaincu',
      preview: `×${e.count || 1} ${name}`,
      onOpen: () => openMonsterPopup(e.monster),
    });
  });

  const npcs = [...(room.npcs || [])];
  if ((room.dialogues || []).length) npcs.push({ id: '_room', name: 'Répliques de la salle', dialogues: room.dialogues });
  const npcCards = npcs.map((n, i) => {
    const id = n.id ?? String(i);
    const total = (n.dialogues || []).length;
    const said = (n.dialogues || []).filter((d, j) => store.isHidden(key(K('npc', id), 'line', (typeof d === 'string' ? j : d.id ?? j)))).length;
    return card({
      key: K('npc', id),
      badge: icon(n.attitude === 'hostile' ? 'sword' : 'users'),
      badgeClass: n.attitude === 'hostile' ? 'danger' : n.attitude === 'amical' ? 'ok' : '',
      title: n.name,
      pills: [attitudePill(n.attitude), total ? pill(`${said}/${total}`, said === total ? 'ok' : '', 'chat') : null],
      sub: n.role,
      sub2: n.wants ? `Veut : ${n.wants}` : null,
      onOpen: () => openNpcPopup(adv.id, room, { ...n, id }),
    });
  });

  const traps = (room.traps || []).map((t, i) => card({
    key: K('trap', elemId(t, i)),
    badge: t.dc != null ? `DD ${t.dc}` : icon('trap'),
    badgeClass: 'info',
    title: t.name,
    pills: [pill('piège', 'info', 'trap')],
    sub: t.trigger,
    sub2: t.effect,
    hideLabel: 'Fait',
    onOpen: () => openTrapPopup(t),
  }));
  const checks = (room.checks || []).map((c, i) => card({
    key: K('check', elemId(c, i)),
    badge: c.dc != null ? `DD ${c.dc}` : '?',
    badgeClass: 'accent',
    title: c.skill || c.name,
    sub: c.text,
    sub2: c.failure ? `Échec : ${c.failure}` : null,
    hideLabel: 'Fait',
  }));

  // Notes de séance : repliées tant qu'on ne les ouvre pas
  const noteKey = `${adv.id}/${room.id}`;
  const noteText = store.getRoomNote(adv.id, room.id);
  const sessionNotes = notesOpen.get(noteKey) || noteText
    ? h('textarea', {
        class: 'textarea', placeholder: 'Notes de partie (PV restants, décisions des joueurs…)',
        value: noteText,
        oninput: (e) => store.setRoomNote(adv.id, room.id, e.target.value),
      })
    : h('button', { class: 'fold', onclick: (e) => { notesOpen.set(noteKey, true); e.currentTarget.replaceWith(h('textarea', {
        class: 'textarea', placeholder: 'Notes de partie (PV restants, décisions des joueurs…)',
        oninput: (ev) => store.setRoomNote(adv.id, room.id, ev.target.value),
      })); } }, icon('plus'), 'Prendre des notes');

  const thumb = mapThumb(adv, room);
  const main = h('div', null,
    head,

    (thumb || room.layout) ? h('div', { class: 'sec plan' },
      thumb ? h('div', { class: 'plan-map' }, thumb) : null,
      room.layout ? h('div', { class: 'plan-text' },
        textBlock({ key: K('layout'), text: room.layout, kind: 'layout', hideLabel: 'Vu' })) : null) : null,

    section('À lire aux joueurs', blockList(K('read'), list(room.readAloud), (t) =>
      textBlock({ key: K('read', t.id), text: t.text, title: t.title, item: t, kind: 'read', hideLabel: 'Lu', sid: t.id })), { ico: 'book' }),

    section('Notes du MJ', blockList(K('note'), list(room.notes), (t) =>
      textBlock({ key: K('note', t.id), text: t.text, title: t.title, item: t, kind: 'note', hideLabel: 'Vu', todo: true, sid: t.id })), { ico: 'notes' }),

    section('Éléments', blockList(K('feature'), list(room.features), (t) =>
      textBlock({ key: K('feature', t.id), text: t.text, title: t.title || 'Élément', item: t, kind: 'feature', hideLabel: 'Vu', sid: t.id })), { ico: 'search' }),

    section('Créatures', enemyCards, {
      ico: 'skull',
      count: enemies.reduce((n, e) => n + (e.count || 1), 0),
      actions: [
        xp ? h('span', { class: 'xp-total' }, `${xp} PX`) : null,
        h('button', { class: 'btn btn-sm btn-icon', 'aria-label': 'Toutes les fiches', onclick: () => openEncounterSheet(adv, room, enemies) }, icon('layers')),
      ],
    }),

    section('PNJ & dialogues', npcCards, { ico: 'chat', count: npcs.length }),

    section('Trésor', [
      room.treasureNote ? markup(room.treasureNote, 'p', 'muted') : null,
      treasureCards(adv.id, room),
    ], {
      ico: 'gem',
      count: normalizeTreasure(room.treasure).length || null,
      actions: h('button', { class: 'btn btn-sm btn-icon', 'aria-label': 'Loot aléatoire', onclick: () => openLootPopup({ adv, room }) }, icon('dice')),
    }),

    section('Pièges & tests', [traps, checks], { ico: 'trap', count: traps.length + checks.length }),

    section('Sorties', connectionCards(adv, room), { ico: 'door' }),

    section('Notes de séance', sessionNotes, { ico: 'edit' }),

    h('div', { class: 'toolbar', style: { marginTop: '10px', justifyContent: 'space-between' } },
      h('div', { class: 'toolbar' },
        prev ? h('button', { class: 'btn', onclick: () => navigate(roomPath(adv.id, prev.id)) }, icon('back'), `${prev.number ?? ''}`) : null,
        next ? h('button', { class: 'btn btn-primary', onclick: () => navigate(roomPath(adv.id, next.id)) }, `${next.number ?? ''} ${next.name}`.trim(), icon('forward')) : null),
      h('button', { class: 'btn btn-sm btn-danger', onclick: async () => {
        if (await confirmPopup({ title: 'Réinitialiser la salle', text: 'Réafficher tous les éléments masqués et supprimer les annotations et notes de cette salle ?', okLabel: 'Réinitialiser', danger: true })) {
          store.resetRoom(adv.id, room.id); toast('Salle réinitialisée');
        }
      } }, icon('undo'))),
  );

  return shell({
    title: `${room.number ? room.number + '. ' : ''}${room.name}`,
    subtitle: adv.title,
    back: advPath(adv.id),
    sidebar: roomSidebar(adv, room.id),
    main,
    actions: [
      roomMap(adv.map, room.id) ? h('button', { class: 'btn btn-icon btn-ghost', 'aria-label': 'Carte', onclick: () => openMapPopup(adv, room) }, icon('map')) : null,
      h('button', { class: 'btn btn-icon btn-ghost', 'aria-label': 'Rencontre aléatoire', onclick: () => openEncounterPopup({ adv, room }) }, icon('dice')),
      h('button', { class: 'btn btn-icon btn-ghost', 'aria-label': 'Index', onclick: () => navigate('index') }, icon('book')),
      h('button', { class: 'btn btn-icon btn-ghost', 'aria-label': 'Liste des salles', onclick: () => navigate(listPath(adv.id)) }, icon('list')),
    ],
  });
}

/** Toutes les fiches des créatures de la salle, à la suite. */
function openEncounterSheet(adv, room, enemies) {
  openPopup({
    title: 'Créatures de la salle',
    subtitle: `${room.number ? room.number + '. ' : ''}${room.name} · ${encounterXP(enemies)} PX`,
    size: 'lg',
    render: () => h('div', null, enemies.map((e) => {
      const m = getMonster(e.monster);
      const k = key(adv.id, room.id, 'enemy', e._id);
      return h('div', { class: 'block', style: { opacity: store.isHidden(k) ? 0.5 : 1 } },
        h('div', { class: 'block-head' },
          h('div', { class: 'block-title' }, `×${e.count || 1} ${e.name || m?.name || e.monster}`),
          e.hidden ? pill('caché', 'info', 'eyeOff') : null,
          h('div', { class: 'block-tools' },
            h('button', { class: 'btn btn-sm btn-ghost' + (store.isHidden(k) ? ' is-on' : ''), onclick: () => store.toggleHidden(k) }, icon('check'), store.isHidden(k) ? 'Vaincu' : 'Vaincre'))),
        e.where || e.tactics ? h('div', { class: 'card-sub', style: { marginBottom: '10px' } }, [e.where, e.tactics].filter(Boolean).join(' — ')) : null,
        m ? [monsterSummary(m), monsterStatblock(m)] : h('p', { class: 'muted' }, `Fiche « ${e.monster} » introuvable.`));
    })),
  });
}

function openTrapPopup(t) {
  openPopup({
    title: t.name,
    subtitle: 'Piège',
    render: () => h('div', { class: 'statblock' },
      row('Déclencheur', t.trigger), row('Effet', t.effect), row('Détection', t.detect), row('Désamorçage', t.disarm), row('DD', t.dc), row('Notes', t.note)),
  });
}
function row(label, v) { return v == null || v === '' ? null : h('div', { class: 'sb-line' }, h('b', null, label), markup(String(v), 'span')); }
