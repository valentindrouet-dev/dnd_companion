// Progression d'une salle : proportion d'éléments cochés (lus, dits, vaincus, distribués, faits).
// Sert au pourcentage de la vue en liste et à la pastille de l'en-tête de salle.

import { store, key } from './store.js';
import { elemId, asTextItem } from './dom.js';
import { visibleItems } from './variant.js';

const textItems = (x) => visibleItems(x, (it, i) => asTextItem(it, i).id);

/** Toutes les clés « cochables » d'une salle, dans l'ordre d'affichage. */
export function roomKeys(advId, room) {
  const K = (...p) => key(advId, room.id, ...p);
  const out = [];
  for (const [field, kind] of [['readAloud', 'read'], ['notes', 'note'], ['features', 'feature']]) {
    for (const { id } of textItems(room[field])) out.push(K(kind, id));
  }
  for (const [field, kind] of [['enemies', 'enemy'], ['treasure', 'treasure'], ['traps', 'trap'], ['checks', 'check']]) {
    for (const { id } of visibleItems(room[field], elemId)) out.push(K(kind, id));
  }
  const npcs = visibleItems(room.npcs, elemId);
  if ((room.dialogues || []).length) npcs.push({ item: { dialogues: room.dialogues }, id: '_room' });
  for (const { item, id } of npcs) {
    const base = K('npc', id);
    for (const { id: lineId } of visibleItems(item.dialogues, (d, j) => (typeof d === 'string' ? String(j) : String(d.id ?? j)))) {
      out.push(key(base, 'line', lineId));
    }
  }
  return out;
}

/** { done, total, pct } — pct vaut 100 si la salle est marquée « fait ». */
export function roomProgress(advId, room) {
  const keys = roomKeys(advId, room);
  const total = keys.length;
  const done = keys.reduce((n, k) => n + (store.isHidden(k) ? 1 : 0), 0);
  const forced = store.forcedStatus(advId, room.id) === 'fait';
  return { done, total, pct: forced ? 100 : total ? Math.round((done / total) * 100) : 0, forced };
}

// --- Statut d'une salle : inexplorée → en cours → fait, en boucle ---
export const ROOM_STATUSES = [
  ['inexploree', 'Inexplorée', 'st-red', 'slash'],
  ['encours', 'En cours', 'st-orange', 'flag'],
  ['fait', 'Fait', 'st-green', 'check'],
];

/** Statut déduit de l'avancement, tant que le MJ n'en a pas forcé un. */
export function derivedStatus(advId, room) {
  const keys = roomKeys(advId, room);
  if (!keys.length) return store.isVisited(advId, room.id) ? 'encours' : 'inexploree';
  const done = keys.reduce((n, k) => n + (store.isHidden(k) ? 1 : 0), 0);
  if (done === 0) return 'inexploree';
  return done === keys.length ? 'fait' : 'encours';
}

/** Statut effectif : celui forcé par le MJ, sinon celui déduit. */
export function roomStatus(advId, room) {
  const key = store.forcedStatus(advId, room.id) || derivedStatus(advId, room);
  const meta = ROOM_STATUSES.find(([k]) => k === key) || ROOM_STATUSES[0];
  return { key, label: meta[1], cls: meta[2], icon: meta[3], forced: !!store.forcedStatus(advId, room.id) };
}

/** Passe au statut suivant et le fige. */
export function cycleRoomStatus(advId, room) {
  const i = ROOM_STATUSES.findIndex(([k]) => k === roomStatus(advId, room).key);
  const next = ROOM_STATUSES[(i + 1) % ROOM_STATUSES.length][0];
  store.setStatus(advId, room.id, next);
  return next;
}

/** Répartition des salles d'une aventure par statut. */
export function statusTally(adv) {
  const tally = { inexploree: 0, encours: 0, fait: 0 };
  for (const r of adv.rooms) tally[roomStatus(adv.id, r).key]++;
  return tally;
}

/** Progression cumulée d'une aventure. */
export function adventureProgress(adv) {
  let done = 0, total = 0, rooms = 0;
  for (const r of adv.rooms) {
    const p = roomProgress(adv.id, r);
    done += p.forced ? p.total : p.done;
    total += p.total;
    if (roomStatus(adv.id, r).key === 'fait') rooms++;
  }
  return { done, total, rooms, pct: total ? Math.round((done / total) * 100) : 0 };
}
