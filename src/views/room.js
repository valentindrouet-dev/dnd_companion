// Page d'une salle : lecture, notes MJ, éléments, créatures, PNJ, trésor,
// pièges & tests, sorties, notes de séance.

import { h, asTextItem, elemId } from '../dom.js';
import { icon } from '../icons.js';
import { markup } from '../markup.js';
import { loadAdventure, roomNeighbours, getMonster, encounterXP } from '../data.js';
import { store, key } from '../store.js';
import { navigate, roomPath, advPath, listPath } from '../router.js';
import { openPopup, confirmPopup } from '../ui/popup.js';
import { toast } from '../ui/toast.js';
import { shell } from './shell.js';
import { roomSidebar } from './sidebar.js';
import { textBlock } from '../components/block.js';
import { card, pill } from '../components/card.js';
import { openMonsterPopup, monsterSummary, monsterStatblock } from '../components/monster.js';
import { attitudePill, openNpcPopup } from '../components/npc.js';
import { treasureCards, openTreasurePopup, normalizeTreasure } from '../components/treasure.js';
import { connectionCards } from '../components/connections.js';
import { openLootPopup } from '../loot/ui.js';
import { slug } from '../util.js';

function list(x) { return (Array.isArray(x) ? x : x ? [x] : []).map(asTextItem); }

function section(title, children, { count, actions } = {}) {
  const kids = Array.isArray(children) ? children.flat().filter(Boolean) : [children].filter(Boolean);
  if (!kids.length) return null;
  return h('div', { class: 'sec' },
    h('div', { class: 'sec-head' }, h('h2', null, title), count != null ? h('span', { class: 'count' }, count) : null, actions),
    kids);
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
  const K = (...p) => key(adv.id, room.id, ...p);
  const navBtn = (r, ico, label) => h('button', {
    class: 'btn btn-icon', 'aria-label': label, disabled: !r,
    onclick: () => r && navigate(roomPath(adv.id, r.id)),
  }, icon(ico));

  // ----- En-tête -----
  const head = h('div', { class: 'room-head' },
    h('div', { class: 'room-num' }, room.number ?? '•'),
    h('div', { class: 'room-title' },
      h('h1', null, room.name),
      h('div', { class: 'room-meta' },
        sectionMeta ? h('span', null, sectionMeta.title) : null,
        (room.tags || []).map((t) => h('span', { class: 'tag ' + slug(t) }, t)))),
    h('div', { class: 'room-nav' },
      h('button', {
        class: 'btn' + (store.isDone(adv.id, room.id) ? ' is-done' : ''),
        'aria-label': 'Marquer la salle comme faite',
        onclick: () => { store.toggleDone(adv.id, room.id); toast(store.isDone(adv.id, room.id) ? 'Salle cochée' : 'Salle décochée'); },
      }, icon('check'), store.isDone(adv.id, room.id) ? 'Faite' : 'À faire'),
      navBtn(prev, 'back', 'Salle précédente'), navBtn(next, 'forward', 'Salle suivante')));

  // ----- Créatures -----
  const enemies = (room.enemies || []).map((e, i) => ({ ...e, _id: elemId(e, i) }));
  const xp = encounterXP(enemies);
  const enemyCards = enemies.map((e) => {
    const m = getMonster(e.monster);
    const name = e.name || m?.name || e.monster;
    const count = e.count || 1;
    return card({
      key: K('enemy', e._id),
      badge: `×${count}`,
      badgeClass: 'danger',
      title: name,
      pills: [
        e.hidden ? pill('caché', 'info', 'eyeOff') : null,
        m?.cr != null ? pill(`FP ${m.cr}`) : null,
        e.hp ? pill(`${e.hp} PV`, 'danger') : null,
      ],
      sub: e.where,
      sub2: e.tactics || m?.summary?.tactics,
      hideLabel: 'Vaincu',
      preview: `×${count} ${name}`,
      onOpen: () => openMonsterPopup(e.monster, { note: [e.where, e.tactics].filter(Boolean).join(' — ') }),
    });
  });

  // ----- PNJ & dialogues -----
  const npcs = [...(room.npcs || [])];
  if ((room.dialogues || []).length) npcs.push({ id: '_room', name: 'Répliques de la salle', role: 'Sans PNJ particulier', dialogues: room.dialogues });
  const npcCards = npcs.map((n, i) => {
    const id = n.id ?? String(i);
    const m = n.monster ? getMonster(n.monster) : null;
    const total = (n.dialogues || []).length;
    const said = (n.dialogues || []).filter((d, j) => store.isHidden(key(K('npc', id), 'line', (typeof d === 'string' ? j : d.id ?? j)))).length;
    return card({
      key: K('npc', id),
      badge: icon(n.attitude === 'hostile' ? 'sword' : 'users'),
      badgeClass: n.attitude === 'hostile' ? 'danger' : n.attitude === 'amical' ? 'ok' : '',
      title: n.name,
      pills: [attitudePill(n.attitude), total ? pill(`${said}/${total} dit${said > 1 ? 's' : ''}`, said === total && total ? 'ok' : '', 'chat') : null, m ? pill(`FP ${m.cr}`) : null],
      sub: n.role,
      sub2: n.wants ? `Veut : ${n.wants}` : null,
      onOpen: () => openNpcPopup(adv.id, room, { ...n, id }),
    });
  });

  // ----- Pièges & tests -----
  const traps = (room.traps || []).map((t, i) => card({
    key: K('trap', elemId(t, i)),
    badge: t.dc != null ? `DD ${t.dc}` : icon('trap'),
    badgeClass: 'info',
    title: t.name,
    pills: [pill('piège', 'info')],
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

  // ----- Notes de séance -----
  const sessionNotes = h('textarea', {
    class: 'textarea', placeholder: 'Notes prises pendant la partie (PV restants, décisions des joueurs, PNJ tués…)',
    value: store.getRoomNote(adv.id, room.id),
    oninput: (e) => store.setRoomNote(adv.id, room.id, e.target.value),
  });

  const main = h('div', null,
    head,

    section('À lire aux joueurs', list(room.readAloud).map((t) =>
      textBlock({ key: K('read', t.id), text: t.text, title: t.title, kind: 'read', hideLabel: 'Lu', kindLabel: 'Lecture' }))),

    section('Notes du MJ', list(room.notes).map((t) =>
      textBlock({ key: K('note', t.id), text: t.text, title: t.title, hideLabel: 'Vu', kindLabel: 'Note MJ' }))),

    section('Éléments de la salle', list(room.features).map((t) =>
      textBlock({ key: K('feature', t.id), text: t.text, title: t.title || 'Élément', hideLabel: 'Vu' }))),

    section('Créatures', enemyCards, {
      count: enemies.reduce((n, e) => n + (e.count || 1), 0),
      actions: enemies.length ? [
        xp ? h('span', { class: 'xp-total' }, `${xp} PX`) : null,
        h('button', { class: 'btn btn-sm', onclick: () => openEncounterPopup(adv, room, enemies) }, icon('sword'), 'Rencontre'),
      ] : null,
    }),

    section('PNJ & dialogues', npcCards, { count: npcs.length }),

    section('Trésor', [
      room.treasureNote ? markup(room.treasureNote, 'p', 'muted') : null,
      treasureCards(adv.id, room),
    ], {
      count: normalizeTreasure(room.treasure).length || null,
      actions: [
        normalizeTreasure(room.treasure).length ? h('button', { class: 'btn btn-sm', onclick: () => openTreasurePopup(adv.id, room) }, icon('gem'), 'Détail') : null,
        h('button', { class: 'btn btn-sm', onclick: () => openLootPopup({ adv, room }) }, icon('dice'), 'Loot aléatoire'),
      ],
    }) || section('Trésor', [], { actions: h('button', { class: 'btn btn-sm', onclick: () => openLootPopup({ adv, room }) }, icon('dice'), 'Loot aléatoire') }),

    section('Pièges & tests', [traps, checks], { count: traps.length + checks.length }),

    section('Sorties', connectionCards(adv, room)),

    section('Notes de séance', sessionNotes),

    h('div', { class: 'toolbar', style: { marginTop: '10px', justifyContent: 'space-between' } },
      h('div', { class: 'toolbar' },
        prev ? h('button', { class: 'btn', onclick: () => navigate(roomPath(adv.id, prev.id)) }, icon('back'), `${prev.number ?? ''} ${prev.name}`.trim()) : null,
        next ? h('button', { class: 'btn btn-primary', onclick: () => navigate(roomPath(adv.id, next.id)) }, `${next.number ?? ''} ${next.name}`.trim(), icon('forward')) : null),
      h('button', { class: 'btn btn-sm btn-danger', onclick: async () => {
        if (await confirmPopup({ title: 'Réinitialiser la salle', text: 'Réafficher tous les éléments masqués et supprimer les annotations et notes de cette salle ?', okLabel: 'Réinitialiser', danger: true })) {
          store.resetRoom(adv.id, room.id); toast('Salle réinitialisée');
        }
      } }, icon('undo'), 'Réinitialiser la salle')),
  );

  return shell({
    title: `${room.number ? room.number + '. ' : ''}${room.name}`,
    subtitle: adv.title,
    back: advPath(adv.id),
    sidebar: roomSidebar(adv, room.id),
    main,
    actions: [h('button', { class: 'btn btn-icon btn-ghost', 'aria-label': 'Liste des salles', onclick: () => navigate(listPath(adv.id)) }, icon('list'))],
  });
}

/** Fenêtre « Rencontre » : toutes les créatures de la salle, résumé + stats. */
function openEncounterPopup(adv, room, enemies) {
  openPopup({
    title: 'Rencontre',
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
