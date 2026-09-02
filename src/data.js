// Chargement des données embarquées (data/index.json → aventures, monstres).

const BASE = './data/';

let index = null;
const adventures = new Map();
const monsters = new Map();

async function getJSON(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Impossible de charger ${url} (${res.status})`);
  return res.json();
}

export async function loadIndex() {
  if (!index) index = await getJSON(BASE + 'index.json');
  return index;
}

export function getIndex() { return index; }

export async function loadMonsters() {
  await loadIndex();
  for (const path of index.monsters || []) {
    const list = await getJSON(BASE + path);
    for (const m of list) monsters.set(m.id, m);
  }
}

export function getMonster(id) { return monsters.get(id); }
export function allMonsters() { return [...monsters.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr')); }

export async function loadAdventure(id) {
  if (adventures.has(id)) return adventures.get(id);
  await loadIndex();
  const meta = (index.adventures || []).find((a) => a.id === id);
  if (!meta) throw new Error(`Aventure inconnue : ${id}`);
  const adv = await getJSON(BASE + meta.path);
  prepare(adv);
  adventures.set(id, adv);
  return adv;
}

/** Pré-charge toutes les aventures (pour que le service worker les garde hors-ligne). */
export async function prefetchAll() {
  await loadIndex();
  for (const a of index.adventures || []) {
    try { await loadAdventure(a.id); } catch (e) { console.warn(e); }
  }
}

function prepare(adv) {
  adv.rooms ||= [];
  adv.sections ||= [];
  adv.roomById = new Map(adv.rooms.map((r) => [r.id, r]));

  // Monstres propres à l'aventure (PNJ, variantes…)
  for (const m of adv.monsters || []) monsters.set(m.id, m);

  // Ordre de lecture : celui des sections, puis les salles orphelines.
  const ordered = [];
  const seen = new Set();
  for (const s of adv.sections) {
    for (const rid of s.rooms || []) {
      const r = adv.roomById.get(rid);
      if (r && !seen.has(rid)) { seen.add(rid); r.section = r.section || s.id; ordered.push(r); }
    }
  }
  for (const r of adv.rooms) if (!seen.has(r.id)) { seen.add(r.id); ordered.push(r); }
  adv.roomOrder = ordered;
  adv.sectionById = new Map(adv.sections.map((s) => [s.id, s]));

  // Liaisons inverses : si A → B est déclarée, B affiche aussi « accès depuis A ».
  adv.backlinks = new Map();
  for (const r of adv.rooms) {
    for (const c of normalizeConnections(r.connections)) {
      if (c.oneWay) continue;
      if (!adv.backlinks.has(c.to)) adv.backlinks.set(c.to, []);
      adv.backlinks.get(c.to).push({ to: r.id, via: c.via, note: c.note, secret: c.secret, implicit: true });
    }
  }
}

export function normalizeConnections(list) {
  return (list || []).map((c) => (typeof c === 'string' ? { to: c } : c));
}

/** Toutes les liaisons d'une salle : déclarées + inverses non déjà déclarées. */
export function roomLinks(adv, room) {
  const declared = normalizeConnections(room.connections);
  const declaredIds = new Set(declared.map((c) => c.to));
  const back = (adv.backlinks.get(room.id) || []).filter((c) => !declaredIds.has(c.to));
  return { declared, back };
}

export function roomNeighbours(adv, room) {
  const i = adv.roomOrder.indexOf(room);
  return { prev: i > 0 ? adv.roomOrder[i - 1] : null, next: i >= 0 && i < adv.roomOrder.length - 1 ? adv.roomOrder[i + 1] : null };
}

/** Calcule l'XP d'une rencontre à partir des créatures référencées. */
export function encounterXP(enemies) {
  let total = 0;
  for (const e of enemies || []) {
    const m = getMonster(e.monster);
    const xp = e.xp ?? m?.xp ?? 0;
    total += xp * (e.count || 1);
  }
  return total;
}
