// Générateur de rencontres aléatoires, basé sur le budget de PX par personnage (règles 2024).
//
//   generateEncounter({ level, party, difficulty, pool, rng }) -> {
//     groups: [{ monster, count, xp }], xp, budget, difficulty, hook, note
//   }
//
// Le budget est celui du Guide du Maître 2024 (PX par personnage) — reconstitué de
// mémoire, à vérifier avec ton exemplaire avant d'en faire une référence.

export const DIFFICULTIES = [
  ['low', 'Facile'],
  ['moderate', 'Modérée'],
  ['high', 'Difficile'],
];

const BUDGET = {
  1: [50, 75, 100], 2: [100, 150, 200], 3: [150, 225, 400], 4: [250, 375, 500],
  5: [500, 750, 1100], 6: [600, 1000, 1400], 7: [750, 1300, 1700], 8: [1000, 1700, 2100],
  9: [1300, 2000, 2600], 10: [1600, 2300, 3100], 11: [1900, 2900, 4100], 12: [2200, 3700, 4700],
  13: [2600, 4200, 5400], 14: [2900, 4900, 6200], 15: [3300, 5400, 7800], 16: [3800, 6100, 9800],
  17: [4500, 7200, 11700], 18: [5000, 8700, 14200], 19: [5500, 10700, 17200], 20: [6400, 13200, 22000],
};

const HOOKS = [
  'Ils dorment ; un seul veille, mal.',
  'Ils se disputent un butin et ne remarquent rien avant 1d4 rounds.',
  'Ils dévorent une proie fraîche. Les os sont encore chauds.',
  'Ils fouillent la salle méthodiquement, à la recherche de quelque chose.',
  'Ils ont tendu une embuscade et attendent, immobiles, depuis des heures.',
  'Ils fuient autre chose et tombent sur le groupe par accident.',
  'Ils montent la garde devant un passage et exigent un droit de péage.',
  'Ils sont blessés : chacun a perdu le quart de ses points de vie.',
  'Ils traînent un prisonnier ligoté, encore vivant.',
  'Ils viennent d’allumer un feu ; la fumée trahit leur position à 30 m.',
  'Ils poursuivent une créature qui hurle plus loin dans le couloir.',
  'Ils sont ivres : désavantage à leurs jets d’attaque au premier round.',
];

function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

export function budgetFor(level, difficulty, party) {
  const row = BUDGET[Math.min(20, Math.max(1, Math.round(level)))] || BUDGET[1];
  const i = Math.max(0, DIFFICULTIES.findIndex(([k]) => k === difficulty));
  return row[i] * Math.max(1, party);
}

/**
 * @param {object} o
 * @param {number} o.level      niveau moyen du groupe
 * @param {number} o.party      nombre de personnages
 * @param {string} o.difficulty low | moderate | high
 * @param {object[]} o.pool     créatures disponibles (doivent avoir un `xp`)
 */
export const MAX_CREATURES = 12;   // au-delà, une rencontre devient ingérable à la table
export const MAX_PER_GROUP = 8;

export function generateEncounter({ level = 1, party = 4, difficulty = 'moderate', pool = [], rng = Math.random } = {}) {
  const budget = budgetFor(level, difficulty, party);
  // On écarte les créatures trop faibles pour le budget : sinon la rencontre part en nuées ingérables.
  const floor = budget / 20;
  let usable = pool.filter((m) => Number(m.xp) >= floor && Number(m.xp) <= budget);
  if (!usable.length) usable = pool.filter((m) => Number(m.xp) > 0 && Number(m.xp) <= budget);
  if (!usable.length) return { groups: [], xp: 0, budget, difficulty, note: 'Aucune créature du bestiaire ne tient dans ce budget.' };

  const groups = [];
  const total = () => groups.reduce((n, g) => n + g.xp, 0);
  const heads = () => groups.reduce((n, g) => n + g.count, 0);
  const wanted = 1 + Math.floor(rng() * 3);   // 1 à 3 espèces

  for (let g = 0; g < wanted; g++) {
    const left = budget - total();
    const room = MAX_CREATURES - heads();
    if (room < 1) break;
    const affordable = usable.filter((m) => m.xp <= left && !groups.some((x) => x.monster.id === m.id));
    if (!affordable.length) break;
    const m = pick(rng, affordable);
    // le premier groupe prend l'essentiel du budget, les suivants se partagent le reste
    const share = g === 0 && wanted > 1 ? 0.55 + rng() * 0.25 : 1;
    const max = Math.min(MAX_PER_GROUP, room, Math.max(1, Math.floor((left * share) / m.xp)));
    const count = 1 + Math.floor(rng() * max);
    groups.push({ monster: m, count, xp: m.xp * count });
  }

  // budget très sous-employé : on renforce le groupe le moins cher, sans dépasser les plafonds
  if (groups.length) {
    const g = groups.reduce((a, b) => (a.monster.xp <= b.monster.xp ? a : b));
    while (total() + g.monster.xp <= budget && g.count < MAX_PER_GROUP && heads() < MAX_CREATURES && total() < budget * 0.75) {
      g.count++;
      g.xp = g.monster.xp * g.count;
    }
  }

  return {
    groups: groups.sort((a, b) => b.monster.xp - a.monster.xp),
    xp: total(),
    budget,
    difficulty,
    hook: pick(rng, HOOKS),
  };
}
