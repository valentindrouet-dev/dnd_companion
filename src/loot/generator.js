// ============================================================
//  GÉNÉRATEUR DE LOOT — point d'accroche
//  Remplace le contenu de ce fichier par ton générateur existant.
//  Contrat attendu par l'interface (src/loot/ui.js) :
//
//    generateLoot({ level, kind, rng }) -> {
//      coins: { pp?, po?, pa?, pc? },          // pièces (nombres)
//      items: [{ name, qty?, value?, note?, magic? }],
//      summary?: string                        // phrase d'ambiance facultative
//    }
//
//    LOOT_KINDS : liste des types proposés dans le menu.
// ============================================================

export const LOOT_KINDS = [
  ['poche', 'Poches d’une créature'],
  ['coffre', 'Coffre / cachette'],
  ['tresor', 'Trésor de repaire'],
];

export const GENERATOR_NAME = 'Générateur provisoire (à remplacer)';

const TRINKETS = [
  'Dé en os taillé', 'Fiole de parfum rance', 'Petit miroir fêlé', 'Chapelet de dents de loup',
  'Carte au trésor incompréhensible', 'Bague en étain', 'Peigne en ivoire', 'Flûte en roseau',
  'Sachet d’herbes séchées', 'Bougie noire à moitié fondue', 'Clé rouillée sans serrure connue',
  'Figurine de chouette en bois', 'Pierre à aiguiser gravée d’un nom', 'Lettre d’amour jamais envoyée',
];
const GEMS = [['Agate', 10], ['Quartz bleu', 10], ['Œil de tigre', 10], ['Onyx', 50], ['Jaspe', 50], ['Grenat', 100], ['Perle', 100], ['Ambre', 100]];
const CONSUMABLES = [['Potion de soins', true], ['Huile', false], ['Rations (3 jours)', false], ['Torches ×5', false], ['Parchemin de sort (niveau 1)', true]];

function d(rng, n) { return 1 + Math.floor(rng() * n); }
function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

export function generateLoot({ level = 1, kind = 'poche', rng = Math.random } = {}) {
  const mult = kind === 'tresor' ? 12 : kind === 'coffre' ? 4 : 1;
  const coins = {};
  const pc = d(rng, 6) * mult * 2; if (pc) coins.pc = pc;
  const pa = d(rng, 6) * mult; if (pa) coins.pa = pa;
  const po = Math.max(0, (d(rng, 6) - 2) * Math.ceil(level / 2) * mult); if (po) coins.po = po;
  if (kind === 'tresor' && level >= 5) coins.pp = d(rng, 4) * Math.ceil(level / 5);

  const items = [];
  const nb = kind === 'tresor' ? d(rng, 4) + 1 : kind === 'coffre' ? d(rng, 3) : d(rng, 2) - 1;
  for (let i = 0; i < nb; i++) {
    const roll = rng();
    if (roll < 0.4) items.push({ name: pick(rng, TRINKETS), note: 'babiole' });
    else if (roll < 0.75) { const [name, value] = pick(rng, GEMS); items.push({ name, value: `${value} po` }); }
    else { const [name, magic] = pick(rng, CONSUMABLES); items.push({ name, magic }); }
  }
  return { coins, items, summary: kind === 'poche' ? 'Fouille rapide des poches.' : 'Contenu trouvé après une fouille attentive.' };
}
