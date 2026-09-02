// Progression d'une salle : proportion d'éléments cochés (lus, dits, vaincus, distribués, faits).
// Sert au pourcentage de la vue en liste et à la pastille de l'en-tête de salle.

import { store, key } from './store.js';
import { elemId, asTextItem } from './dom.js';

function items(x) { return Array.isArray(x) ? x : x ? [x] : []; }

/** Toutes les clés « cochables » d'une salle, dans l'ordre d'affichage. */
export function roomKeys(advId, room) {
  const K = (...p) => key(advId, room.id, ...p);
  const out = [];
  for (const [field, kind] of [['readAloud', 'read'], ['notes', 'note'], ['features', 'feature']]) {
    items(room[field]).map(asTextItem).forEach((t) => out.push(K(kind, t.id)));
  }
  for (const [field, kind] of [['enemies', 'enemy'], ['treasure', 'treasure'], ['traps', 'trap'], ['checks', 'check']]) {
    (room[field] || []).forEach((it, i) => out.push(K(kind, elemId(it, i))));
  }
  const npcs = [...(room.npcs || [])];
  if ((room.dialogues || []).length) npcs.push({ id: '_room', dialogues: room.dialogues });
  npcs.forEach((n, i) => {
    const base = K('npc', n.id ?? String(i));
    (n.dialogues || []).forEach((d, j) => out.push(key(base, 'line', typeof d === 'string' ? j : d.id ?? j)));
  });
  return out;
}

/** { done, total, pct } — pct vaut 100 si la salle est cochée « faite ». */
export function roomProgress(advId, room) {
  const keys = roomKeys(advId, room);
  const total = keys.length;
  const done = keys.reduce((n, k) => n + (store.isHidden(k) ? 1 : 0), 0);
  const forced = store.isDone(advId, room.id);
  return { done, total, pct: forced ? 100 : total ? Math.round((done / total) * 100) : 0, forced };
}

/** Progression cumulée d'une aventure. */
export function adventureProgress(adv) {
  let done = 0, total = 0, rooms = 0;
  for (const r of adv.rooms) {
    const p = roomProgress(adv.id, r);
    done += p.forced ? p.total : p.done;
    total += p.total;
    if (p.forced) rooms++;
  }
  return { done, total, rooms, pct: total ? Math.round((done / total) * 100) : 0 };
}
