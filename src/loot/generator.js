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
const byMonster = new Map();

export async function loadLoot(paths = []) {
  for (const path of paths) {
    const res = await fetch('./data/' + path, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`Impossible de charger ${path} (${res.status})`);
    data = await res.json();
    for (const c of data.creatures || []) {
      for (const id of c.match || []) byMonster.set(id, c);
    }
  }
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

function magicItem(tables, rng) {
  const rules = data?.rules || {};
  const rarity = weighted(rules.rarity || [['Commun', 100]], rng);
  const kind = weighted(rules.itemType || [['Objet merveilleux', 100]], rng);
  return { rarity, kind, tables };
}

// ---------------------------------------------------------------- tirage

/** Une fouille : chaque ligne est tirée indépendamment de sa probabilité. */
function rollOnce(creature, rng) {
  const found = [];
  for (const line of creature.loot || []) {
    if (rng() * 100 >= line.p) continue;
    const qty = rollDice(line.qty, rng);

    if (line.magic) {
      const { rarity, kind, tables } = magicItem(line.magic, rng);
      found.push({ emoji: line.emoji, name: `Objet magique (${rarity})`, qty, magic: rarity, value: kind, use: `table ${tables}` });
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
