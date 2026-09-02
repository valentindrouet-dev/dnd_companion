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
  "readAloud": [ "Texte lu aux joueurs…",
                 { "id": "suite", "text": "…", "summary": "Une phrase pour le mode Résumé" } ],
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
    { "to": "r5", "via": "Porte nord", "note": "Verrouillée DD 15", "secret": true, "oneWay": false,
      "door": "fermee|verrouillee|barricadee|piegee|secrete|hermetique|magique|double|effondre|toboggan",
      "alert": "Message d'alerte affiché sur la sortie" },
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

### Variantes : `only`

N'importe quel élément d'une salle ou de l'aventure (bloc de lecture, note, élément, créature,
PNJ, réplique, trésor, piège, test, liaison, section) accepte un champ `only` :

```jsonc
{ "id": "e-trolls", "only": "enhanced", "monster": "cave-troll", "count": 4 }
{ "id": "malfrats", "only": "base",     "monster": "tough",      "count": 7 }
```

- `"enhanced"` — l'élément n'existe que dans la **version Améliorée** ; il est affiché avec une
  **étoile** et disparaît quand le MJ coupe l'interrupteur des Réglages.
- `"base"` — l'élément appartient à l'aventure d'origine et est **remplacé** dans la version
  Améliorée ; il réapparaît dès que l'interrupteur est coupé.
- absent — l'élément est commun aux deux versions.

Une créature renforcée s'écrit donc comme deux entrées (`only: "base"` / `only: "enhanced"`)
plutôt qu'en modifiant l'originale : les deux versions gardent alors leurs propres coches.

Les éléments masqués par une variante **ne comptent pas** dans le pourcentage d'avancement ni
dans le statut de la salle, et leurs `id` restent stables (les clés de l'état MJ sont calculées
sur la position d'origine, pas sur la liste filtrée).

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
séance, salles visitées, statuts de salle, blocs « à faire », ordre des blocs, drapeau de fin de
séance et statuts de PNJ sont stockés sur l'appareil, exportables en JSON depuis **Réglages**.

Le **statut d'une salle** vaut `inexploree`, `encours` ou `fait`. Tant que le MJ ne l'a pas figé,
il est déduit de l'avancement : aucun élément coché → inexplorée, quelques-uns → en cours, tous →
faite. Un appui sur le bouton passe à l'état suivant et le fige.

Le champ `number` sert au tri de la vue en liste (tri naturel : 1, 1a, 1b, 2, 10, 13c–13d…).
Le pourcentage d'avancement d'une salle est le rapport entre les éléments masqués et le nombre
total d'éléments cochables **visibles** (lectures, notes, éléments, créatures, trésors, pièges,
tests, répliques) : basculer la version Améliorée recalcule aussitôt les pourcentages et les statuts.

Le réglage de version est lui-même dans l'état MJ (`settings.enhanced`, activé par défaut) : les
coches et les notes des éléments masqués sont conservées, jamais effacées.

Sans `summary`, le mode Résumé retombe sur la première phrase du texte, tronquée si besoin.

## Tables de récolte (`data/loot/*.json`)

Le butin qu'on trouve sur un cadavre, créature par créature.

```jsonc
{
  "rules": {
    "brokenChance": 0.75,                       // un objet « brisé » l'est vraiment 3 fois sur 4
    "rarity":   [["Commun", 45], ["Peu commun", 30], …],   // poids en %, total exactement 100
    "itemType": [["Objet merveilleux", 36], ["Arme", 21], …]
  },
  "creatures": [{
    "id": "troll", "name": "Troll", "en": "Troll",
    "type": "giant",                            // teinte du bouton dans le sélecteur
    "match": ["half-troll", "cave-troll", "gaunt-troll"],  // fiches qui affichent « Récolte »
    "hidden": true,                             // facultatif : table conservée mais retirée du choix
    "description": "Texte d'ambiance lu au moment de la fouille.",
    "check": { "skill": "Survie", "dc": 15 },
    "duration": "25 min",
    "danger": "Ce qui arrive sur un 1 naturel (accepte le **balisage**).",
    "loot": [
      { "emoji": "🦴", "name": "Peau de troll", "en": "Troll Hide",
        "p": 35, "qty": "1", "value": "30 po", "use": "composante (armure)" },
      { "emoji": "⚔️", "name": "Cimeterre", "brokenName": "Cimeterre brisé",
        "p": 25, "qty": "1", "value": "5 po" },
      { "emoji": "💰", "name": "Pièces", "p": 35, "qty": "3d10", "coin": "po" },
      { "emoji": "✨", "name": "Objet magique", "p": 10, "qty": "1", "magic": "B" }
    ]
  }]
}
```

- `p` : probabilité en %, tirée **indépendamment** pour chaque ligne.
- `qty` : un nombre ou une notation `XdY`.
- `brokenName` : le nom quand l'objet sort cassé — `value` reçoit alors « (après réparation) ».
  Sans ce champ, l'objet n'est jamais soumis à la règle des 75 %.
- `coin` : la ligne donne des pièces (cumulées séparément quand on fouille plusieurs cadavres).
- `magic` : la ligne tire un objet magique ; la valeur est la table du DMG (« A », « B », « A ou B »).
- `en` : le nom d'origine en anglais, conservé pour retrouver la ligne dans le générateur source.

Un monstre ne peut être réclamé que par une seule table ; le validateur le vérifie, comme
il vérifie que `rarity` et `itemType` totalisent bien 100 %.

## Objets magiques (`data/loot/magic-items.json`)

Le catalogue qui nomme les objets tirés par les lignes `magic` des tables de récolte.

```jsonc
{
  "rarities": ["Commun", "Peu commun", "Rare", "Très rare", "Légendaire"],
  "rules": { "genericChance": 0.4 },
  "types": [{
    "id": "arme", "name": "Arme", "plural": "Armes", "emoji": "⚔️",
    "description": "Armes enchantées conférant des pouvoirs.",
    "generic": "Weapon +",                       // préfixe des objets génériques (facultatif)
    "items": {
      "Rare": [{ "n": "Flame Tongue", "v": "major" }, { "n": "Weapon +2", "v": "major" }]
    }
  }]
}
```

- Le `name` d'un type doit correspondre exactement à un libellé de `rules.itemType` dans
  `creatures.json`, et `rarities` à ses libellés de `rules.rarity` : c'est ce qui relie le
  tirage au catalogue. Le validateur refuse toute divergence.
- `v` vaut `minor` ou `major` (la moitié de table du DMG dont l'objet provient).
- `generic` : quand une rareté contient à la fois des objets génériques (`Weapon +2`) et des
  objets nommés, les génériques ne sortent que `genericChance` du temps.
- Une rareté peut être vide (il n'existe aucun anneau commun) : le tirage renvoie alors la
  rareté et le type, en laissant le choix de l'objet au MJ. `Artefact`, absent des tables du
  DMG, se comporte de la même façon.

## Index (`data/glossary/*.json`)

Personnages, factions, lieux, objets et divinités. Les `aliases` sont repérés automatiquement
dans tous les textes et rendus cliquables (une occurrence par bloc).

```jsonc
{
  "id": "xanathar",
  "name": "La Guilde de Xanathar",
  "kind": "personne | faction | lieu | objet | divinite | peuple",
  "aliases": ["Xanathar", "Guilde de Xanathar"],
  "what": "Qui ou quoi.",
  "goal": "Ce qu'il veut.",
  "state": "Son état au début de l'aventure (le MJ peut le réécrire en partie).",
  "where": "Où le croiser, avec des liens [[r:9b|9b]].",
  "monster": "drow-mage"        // fiche de combat liée, facultatif
}
```

## Cartes (`assets/maps/`, `data/maps.json`)

`tools/map-coords.json` donne, pour chaque carte, le PDF source, la page, le cadre de la carte et
la position de chaque salle en points PDF. `npm run maps` produit `assets/maps/<carte>/complete.jpg`,
un cadrage `<salle>.jpg` par salle (avec un repère doré) et `data/maps.json`, que le service worker
précache pour l'usage hors-ligne. Ce fichier contient aussi `spots` : la position de chaque salle en
pourcentage de la carte, qui sert aux repères cliquables et au calcul de la direction des sorties.
L'aventure est reliée à sa carte par le champ `map` de `index.json`.
Les données d'aventure elles-mêmes ne sont jamais modifiées par l'app.
