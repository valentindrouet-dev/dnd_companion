# Schéma des données

Toutes les données vivent dans `data/` sous forme de JSON, embarquées avec l'app
(elles sont donc disponibles hors-ligne sur l'iPad). Le validateur `npm run validate`
vérifie la cohérence (ids uniques, liaisons, monstres référencés, liste hors-ligne).

```
data/
  index.json                       liste des aventures et des fichiers de monstres
  adventures/<slug>.json           une aventure = sections + salles (+ monstres locaux)
  monsters/<source>.json           tableau de fiches de monstres
```

## Balisage des textes

Tous les champs texte acceptent un mini-balisage :

| Syntaxe | Rendu |
|---|---|
| `**gras**`, `*italique*` | gras, italique |
| `« citation »` | style de dialogue |
| `[[m:goblin-warrior\|les gobelins]]` | lien qui ouvre la fiche du monstre |
| `[[r:r4\|la salle des gardes]]` | lien qui navigue vers la salle |
| `2d6+3`, `DD 15` | mis en valeur automatiquement |
| retour à la ligne | conservé |

## `index.json`

```json
{
  "adventures": [
    { "id": "slug", "title": "Titre", "levels": "1-3", "source": "Livre, p. 12", "path": "adventures/slug.json", "map": "strate-2" }
  ],
  "monsters": ["monsters/srd-2024.json"]
}
```

## Aventure (`adventures/<slug>.json`)

```jsonc
{
  "id": "slug",                        // = index.json
  "title": "…", "subtitle": "…",
  "levels": "1-3",
  "source": { "book": "…", "pages": "12-40" },
  "summary": "Synopsis MJ (masquable).",
  "intro": [ { "id": "accroche", "title": "…", "text": "Texte à lire aux joueurs" } ],
  "notes": [ { "id": "…", "title": "…", "text": "Notes MJ" } ],
  "npcs": [ /* PNJ récurrents, même format que dans les salles */ ],
  "sections": [ { "id": "n1", "title": "Niveau 1", "intro": "…", "rooms": ["r1", "r2"] } ],
  "rooms": [ /* voir ci-dessous */ ],
  "monsters": [ /* fiches propres à l'aventure (PNJ, variantes) — même format que monsters/ */ ]
}
```

L'ordre des salles (boutons précédent / suivant) est celui des `sections`, puis des
salles orphelines dans l'ordre de `rooms`.

### Salle

```jsonc
{
  "id": "r4",                          // stable, utilisé dans les liaisons et les clés d'état
  "number": "4",                       // affiché (peut être "4a", "B12"…)
  "name": "Salle des gardes",
  "tags": ["combat", "pnj"],           // combat, piège, trésor, social, pnj, énigme, boss, secret,
                                       // portail, danger, vide, extérieur — chacun a son icône
  "layout": "Salle de 12 × 9 m, plafond voûté à 6 m, murs de granit…",   // topologie, affichée en tête
  "readAloud": [ "Texte lu aux joueurs…", { "id": "suite", "text": "…" } ],   // string ou tableau
  "notes": [ "Note MJ…" ],
  "features": [ { "id": "autel", "title": "L’autel", "text": "…" } ],
  "enemies": [
    { "id": "gardes", "monster": "goblin-warrior", "count": 3, "name": "Gardes", "hidden": true,
      "where": "Derrière les caisses", "tactics": "Une ligne de tactique", "hp": 12, "xp": 50 }
  ],
  "npcs": [
    { "id": "chef", "name": "Griffe-Rouge", "role": "Chef", "attitude": "amical|neutre|méfiant|hostile",
      "monster": "goblin-boss", "description": "…", "wants": "…",
      "dialogues": [ { "id": "ouverture", "trigger": "Si…", "line": "« … »" } ],
      "secrets": [ "…" ] }
  ],
  "dialogues": [ { "trigger": "…", "line": "…" } ],        // répliques sans PNJ particulier
  "treasure": [ { "id": "cle", "item": "Clé de fer", "qty": 1, "value": "25 po", "where": "…", "note": "…", "magic": true } ],
  "treasureNote": "Phrase d'intro du trésor",
  "traps": [ { "id": "dards", "name": "…", "trigger": "…", "effect": "…", "detect": "…", "disarm": "…", "dc": 13 } ],
  "checks": [ { "id": "…", "skill": "Perception", "dc": 13, "text": "Réussite : …", "failure": "…" } ],
  "connections": [
    { "to": "r5", "via": "Porte nord", "note": "Verrouillée DD 15", "secret": true, "oneWay": false },
    "r3"                                                   // forme courte
  ]
}
```

Les liaisons sont **bidirectionnelles par défaut** : déclarer `r4 → r5` suffit, la salle 5
affichera « accès depuis 4 ». `oneWay: true` supprime le lien inverse.

### Identifiants

Les `id` servent à construire les clés de l'état MJ (`aventure/salle/type/id`). Donner un `id`
à chaque élément (bloc de lecture, créature, trésor…) garantit que les masquages et annotations
survivent à une réorganisation du fichier. Sans `id`, l'index dans le tableau est utilisé.

## Monstre (`monsters/*.json` ou `adventure.monsters`)

```jsonc
{
  "id": "goblin-warrior",
  "name": "Guerrier gobelin", "nameEn": "Goblin Warrior",
  "source": "MM 2024 p. 168",
  "size": "P", "type": "Fée (gobelinoïde)", "alignment": "Neutre",
  "cr": "1/4", "xp": 50, "pb": 2,
  "ac": 15, "acNote": "armure de cuir",
  "hp": 10, "hpFormula": "3d6",
  "speed": "9 m, vol 18 m",
  "abilities": { "str": 8, "dex": 15, "con": 10, "int": 10, "wis": 8, "cha": 8 },
  "saves": "Dex +4", "skills": "Discrétion +6",
  "vulnerabilities": "…", "resistances": "…", "immunities": "poison ; empoisonné",
  "senses": "vision dans le noir 18 m ; Perception passive 9",
  "languages": "commun, gobelin",
  "traits":       [ { "name": "…", "text": "…" } ],
  "actions":      [ { "name": "Cimeterre", "text": "Jet d’attaque au corps à corps : +4, …", "recharge": "5-6" } ],
  "bonusActions": [ … ], "reactions": [ … ], "legendary": [ … ],
  "summary": {                          // le résumé MJ affiché en tête de fiche
    "style": "En une phrase : comment il se bat.",
    "intent": "Ce qu'il veut.",
    "tactics": "Ordre des actions, cibles préférées.",
    "flee": "Quand il fuit ou se rend.",
    "weakness": "Ce que les joueurs peuvent exploiter.",
    "roleplay": "Voix, manières."
  }
}
```

## État MJ (localStorage, propre à l'appareil)

Masquages (« Lu », « Dit », « Vaincu », « Distribué »…), textes modifiés, annotations, notes de
séance, salles visitées et **salles cochées « faites »** sont stockés sur l'appareil, exportables
en JSON depuis **Réglages**.

Le champ `number` sert au tri de la vue en liste (tri naturel : 1, 1a, 1b, 2, 10, 13c–13d…).
Le pourcentage d'avancement d'une salle est le rapport entre les éléments masqués et le nombre
total d'éléments cochables (lectures, notes, éléments, créatures, trésors, pièges, tests, répliques).

## Cartes (`assets/maps/`, `data/maps.json`)

`tools/map-coords.json` donne, pour chaque carte, le PDF source, la page, le cadre de la carte et
la position de chaque salle en points PDF. `npm run maps` produit `assets/maps/<carte>/complete.jpg`,
un cadrage `<salle>.jpg` par salle (avec un repère doré) et `data/maps.json`, que le service worker
précache pour l'usage hors-ligne. L'aventure est reliée à sa carte par le champ `map` de `index.json`.
Les données d'aventure elles-mêmes ne sont jamais modifiées par l'app.
