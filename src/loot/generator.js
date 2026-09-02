// ============================================================
//  RÉCOLTE D'ENNEMIS — générateur de butin par créature.
//  Transcription du générateur « Enemy Looting » : les tables, les
//  probabilités et les règles viennent de data/loot/creatures.json,
//  ce fichier ne fait que les appliquer.
//
//    generateLoot({ creature, count, rng }) -> {
//      creature, count,
//      coins: { po },                       // pièces cumulées
//      items: [{ emoji, name, qty, value, use?, magic? }],
//    }
// ============================================================

export const GENERATOR_NAME = 'Récolte d’ennemis';

let data = null;
let magic = null;
const byMonster = new Map();

async function getJSON(path) {
  const res = await fetch('./data/' + path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Impossible de charger ${path} (${res.status})`);
  return res.json();
}

export async function loadLoot(paths = [], magicPaths = []) {
  for (const path of paths) {
    data = await getJSON(path);
    for (const c of data.creatures || []) {
      for (const id of c.match || []) byMonster.set(id, c);
    }
  }
  for (const path of magicPaths) magic = await getJSON(path);
}

// ---------------------------------------------------------------- objets magiques

export function magicTypes() { return magic?.types || []; }
export function magicRarities() { return magic?.rarities || []; }
export function magicType(id) { return (magic?.types || []).find((t) => t.id === id) || null; }
/** Les libellés de rareté et de type utilisés par les tirages viennent de creatures.json. */
export function magicTypeByName(name) { return (magic?.types || []).find((t) => t.name === name) || null; }
export function magicItemCount() {
  return (magic?.types || []).reduce((n, t) => n + Object.values(t.items).reduce((m, l) => m + l.length, 0), 0);
}

/**
 * Nomme un objet d'un type et d'une rareté donnés.
 * Les armes et armures génériques (« Weapon +X », « Armor +X ») ne sortent que
 * 4 fois sur 10 quand la rareté propose aussi des objets nommés.
 * @returns {{name, variant}|null} null si le DMG ne propose rien à cette rareté.
 */
export function pickMagicItem(typeName, rarity, rng = Math.random) {
  const type = magicTypeByName(typeName);
  const all = type?.items?.[rarity] || [];
  if (!all.length) return null;
  let pool = all;
  if (type.generic) {
    const generic = all.filter((i) => i.n.startsWith(type.generic));
    const named = all.filter((i) => !i.n.startsWith(type.generic));
    if (generic.length && named.length) {
      pool = rng() < (magic?.rules?.genericChance ?? 0.4) ? generic : named;
    }
  }
  const pick = pool[Math.floor(rng() * pool.length)];
  return { name: pick.n, variant: pick.v };
}

/** Toutes les tables, hors celles masquées dans les données. */
export function lootCreatures() {
  return (data?.creatures || []).filter((c) => !c.hidden).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

export function lootCreature(id) { return (data?.creatures || []).find((c) => c.id === id) || null; }

/** Table de butin associée à une créature du bestiaire, ou null. */
export function lootTableFor(monsterId) {
  const c = byMonster.get(monsterId) || null;
  return c && !c.hidden ? c : null;
}

/** Moyenne d'une notation de dés : « 2d6 » → 7. */
export function averageRoll(notation) {
  const m = String(notation ?? '').match(/(\d+)\s*d\s*(\d+)/i);
  return m ? Number(m[1]) * (Number(m[2]) + 1) / 2 : Number(notation) || 1;
}

/** Valeur en po lisible dans « 25 po la fiole », « 1 500 po », « valeur négligeable ». */
export function lineValue(line) {
  if (line.coin) return 1;
  const m = String(line.value ?? '').replace(/\s|\u202f|\u00a0/g, '').match(/([\d.]+)po/i);
  return m ? Number(m[1]) : 0;
}

/**
 * Espérance de gain d'une fouille, en po. Les objets magiques et les objets
 * « à la discrétion du MJ » n'ont pas de prix : ils sont comptés à part.
 */
export function expectedValue(creature) {
  let po = 0, magic = 0, unpriced = 0;
  for (const l of creature.loot || []) {
    const chance = l.p / 100;
    if (l.magic) { magic += chance; continue; }
    const unit = lineValue(l);
    if (!unit) { if (!/négligeable|aucune valeur/i.test(l.value || '')) unpriced += chance; continue; }
    po += chance * averageRoll(l.qty) * unit;
  }
  return { po: Math.round(po), magic: Math.round(magic * 100), unpriced: Math.round(unpriced * 100) };
}

export function lootLevels() {
  return [...new Set((data?.creatures || []).map((c) => c.level || 1))].sort((a, b) => a - b);
}

// ---------------------------------------------------------------- dés

/** « 2d6 », « 1d4 » ou un nombre. */
export function rollDice(notation, rng = Math.random) {
  const m = String(notation ?? '').match(/(\d+)\s*d\s*(\d+)/i);
  if (!m) return Number(notation) || 1;
  let total = 0;
  for (let i = 0; i < Number(m[1]); i++) total += 1 + Math.floor(rng() * Number(m[2]));
  return total;
}

/** Tire dans une table [[libellé, poids en %], …]. */
function weighted(table, rng) {
  let roll = rng() * 100;
  for (const [label, weight] of table) {
    roll -= weight;
    if (roll < 0) return label;
  }
  return table[table.length - 1][0];
}

/** Un objet magique complet (rareté, type, nom), sans passer par une créature. */
export function rollFreeMagicItem(rng = Math.random) {
  return rollMagicItem(null, rng);
}

function rollMagicItem(tables, rng) {
  const rules = data?.rules || {};
  const rarity = weighted(rules.rarity || [['Commun', 100]], rng);
  const kind = weighted(rules.itemType || [['Objet merveilleux', 100]], rng);
  return { rarity, kind, tables, named: pickMagicItem(kind, rarity, rng) };
}

// ---------------------------------------------------------------- tirage

/** Une fouille : chaque ligne est tirée indépendamment de sa probabilité. */
function rollOnce(creature, rng) {
  const found = [];
  for (const line of creature.loot || []) {
    if (rng() * 100 >= line.p) continue;
    const qty = rollDice(line.qty, rng);

    if (line.magic) {
      const { rarity, kind, tables, named } = rollMagicItem(line.magic, rng);
      found.push({
        emoji: line.emoji,
        // Le DMG ne propose rien à certaines combinaisons (un anneau commun, un artefact) : c'est au MJ de trancher.
        name: named ? named.name : `Objet magique — à choisir`,
        qty, magic: rarity, rarity, kind, tables,
        value: `${kind} · ${rarity}`,
        use: named ? named.variant : `aucun ${kind.toLowerCase()} ${rarity.toLowerCase()} au DMG`,
      });
      continue;
    }
    if (line.coin) { found.push({ coin: line.coin, qty }); continue; }

    // Objet « brisé » : 75 % réellement cassé, 25 % en bon état (et sans la réparation).
    const isBroken = line.brokenName ? rng() < (data?.rules?.brokenChance ?? 0.75) : false;
    found.push({
      emoji: line.emoji,
      name: isBroken ? line.brokenName : line.name,
      qty,
      value: isBroken && line.value ? `${line.value} (après réparation)` : line.value,
      use: line.use,
    });
  }
  return found;
}

/** Fouille `count` cadavres et regroupe le résultat. */
export function generateLoot({ creature, count = 1, rng = Math.random } = {}) {
  const coins = {};
  const merged = new Map();
  for (let i = 0; i < Math.max(1, count); i++) {
    for (const found of rollOnce(creature, rng)) {
      if (found.coin) { coins[found.coin] = (coins[found.coin] || 0) + found.qty; continue; }
      // Les objets magiques ne fusionnent pas : chacun est un objet distinct.
      const key = found.magic ? `magic:${merged.size}` : `${found.name}|${found.value ?? ''}`;
      const prev = merged.get(key);
      if (prev) prev.qty += found.qty;
      else merged.set(key, { ...found });
    }
  }
  return { creature, count: Math.max(1, count), coins, items: [...merged.values()] };
}
