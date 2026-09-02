# Compagnon D&D — table du MJ sur iPad

Application web (PWA) qui affiche une aventure D&D 5e (2024) **salle par salle**, pensée
pour être utilisée sur iPad pendant une partie (en parallèle de Fantasy Grounds) :
texte à lire, notes du MJ, créatures avec résumé tactique, PNJ et répliques, trésors,
pièges et tests, liaisons vers les salles connectées, générateur de loot.

- **Statut par salle en trois états** — inexplorée (rouge), en cours (orange), faite (verte) —
  déduit automatiquement de l'avancement, et forcé d'un appui (le bouton passe à l'état suivant).
  Il se répercute dans la liste, la vue d'ensemble, le panneau latéral et les repères de la carte.
- **Vue en liste sur deux colonnes**, triée par numéro, avec recherche, filtre et **pourcentage
  d'avancement** par salle ; anneau de progression dans la salle.
- **Mode Résumé** : un bouton réduit chaque bloc à une phrase ; l'appui rouvre le texte complet en
  fenêtre. Un bloc marqué « Vu » se réduit lui aussi à son résumé, grisé.
- **Blocs réagençables** au glisser-déposer (poignée à trois barres), l'ordre est mémorisé.
- **Blocs colorés par nature** (lecture, note MJ, élément, topologie, réplique) et **icônes de
  couleur** sur les étiquettes et les pastilles.
- **Plan par salle** : vignette cadrée sur la pièce et carte complète zoomable, avec des
  **repères cliquables** pour ouvrir une salle depuis le plan (désactivables d'un appui).
- **Topologie** de chaque salle (murs, plafond, volume, accès) dans son propre bloc.
- **Sorties compactes** : numéro, nom, **flèche orientée** selon la position réelle des salles, et
  **alerte de porte** (fermée, verrouillée, piégée, secrète, hermétique, verrou magique).
- **Masquer ce qui a été lu / dit / vaincu / distribué** d'un appui ; réafficher d'un autre.
- **Annoter et modifier à la volée** n'importe quel texte (l'original reste restaurable).
- **Fiches de monstres compactes** : résumé pour le MJ, CA/PV/vitesse, défenses sur une ligne et
  actions résumées (corps à corps ou distance, bonus, dégâts).
- **Générateur de rencontres** basé sur le budget de PX par niveau. Consulter une fiche depuis
  une rencontre ne perd pas le tirage : la refermer y ramène.
- **Récolte d'ennemis** : chaque créature a sa table de butin (test, durée, danger sur 1 naturel,
  probabilité ligne par ligne). Le bouton **Récolte** de la fiche est pré-rempli avec le nombre de
  créatures du groupe, et le résultat part dans les notes de séance.
- **Mots-clés cliquables** : les noms de personnages, factions, lieux et objets ouvrent une fiche
  (qui, but, état en cours de partie, modifiable), et un **index alphabétique** les rassemble.
- **Drapeau de fin de séance** : un seul par aventure, « Reprendre » y ramène.
- **Notes du MJ marquables « à faire »**, remontées sur la page de l'aventure.
- **Statut des PNJ récurrents** modifiable en partie (amical, allié, en fuite, mort…).
- **Version Améliorée** : les ajouts d'une variante plus difficile (créatures, tests, énigmes,
  répliques, trésors) sont marqués d'une **étoile** et se coupent d'un interrupteur dans les
  Réglages ; les pourcentages et les statuts se recalculent sur ce qui est affiché.
- **Hors-ligne** : données embarquées, service worker ; installable sur l'écran d'accueil.
- Zéro build, zéro dépendance : HTML/CSS/JS modernes, déployable tel quel sur GitHub Pages.

## Structure

```
index.html, styles/, src/        l'application
data/                            aventures, monstres et index (JSON) — voir docs/DATA_SCHEMA.md
assets/maps/                     images de carte découpées salle par salle
tools/                           validateur, serveur local, icônes, extraction PDF, découpe des cartes
docs/                            schéma des données, procédure d'ingestion
sources/                         PDF et textes extraits (ignorés par git)
```

## Lancer en local

```bash
npm start             # http://localhost:8080  (+ adresse Wi-Fi pour l'iPad)
npm run validate      # vérifie data/ et la liste hors-ligne du service worker
npm run maps          # redécoupe les images de carte depuis le PDF (voir tools/map-coords.json)
```

## Déployer sur l'iPad (GitHub Pages)

1. Sur GitHub : **Settings → Pages → Source : GitHub Actions** (une seule fois).
2. Fusionner sur `main` (ou lancer manuellement le workflow *Deploy to GitHub Pages* depuis
   une branche).
3. Sur l'iPad, ouvrir `https://valentindrouet-dev.github.io/dnd_companion/` dans Safari,
   puis **Partager → Sur l'écran d'accueil**. L'app fonctionne ensuite sans réseau.
4. À chaque nouvelle version : `npm run version 0.7.1`, puis pousser. La commande met à jour
   d'un coup `version.js`, `version.json`, `sw.js` et `package.json` — ils doivent rester
   d'accord, et `npm run validate` le vérifie.

### Comment l'iPad reçoit les mises à jour

iOS ne recharge pas une app de l'écran d'accueil quand on la referme et qu'on la rouvre : il la
restaure telle quelle. L'app cherche donc elle-même les nouvelles versions, à l'ouverture et à
chaque retour au premier plan, en comparant sa version à celle de `version.json`. Quand une
version plus récente est publiée, une barre « Version X disponible » apparaît en bas : un appui
sur **Mettre à jour** applique la nouvelle version et recharge. Les réglages proposent aussi
« Vérifier les mises à jour » et « Forcer la mise à jour ».

Le numéro de version est écrit en dur dans `sw.js` : un navigateur ne réinstalle le service
worker que si ce fichier a changé, or il ne changeait pas quand la version était importée.

**Une mise à jour ne touche jamais aux données du MJ** : notes, coches, annotations, statuts et
drapeau vivent dans `localStorage`, que ni le cache ni le service worker n'effacent.

L'état de partie (masquages, annotations, notes) reste sur l'iPad ; il s'exporte et
s'importe en JSON depuis **Réglages**.

## Aventure incluse

**Strate 2 : les Salles Arcaniques** (Waterdeep : le Donjon du Mage dément) — 70 zones,
transposées depuis l'édition française pour un usage personnel à la table, avec les cadrages
de carte correspondants. Le PDF source lui-même n'est pas versionné.

Elle embarque les deux variantes : l'aventure d'origine et une **version Améliorée** (niveau 5-7,
rencontres renforcées, énigmes et clefs narratives supplémentaires). L'interrupteur des Réglages
bascule de l'une à l'autre sans rien perdre : les éléments propres à une variante sont simplement
masqués, avec leurs coches et leurs notes.

## Ajouter une aventure

Voir `docs/INGESTION.md` (PDF → JSON) et `docs/DATA_SCHEMA.md` (format).

## Récolte d'ennemis

Les tables vivent dans `data/loot/creatures.json` (transcription du générateur
« Enemy Looting ») ; `src/loot/generator.js` ne fait que les appliquer. Chaque ligne est
tirée indépendamment de sa probabilité, les objets « brisés » le sont réellement 3 fois
sur 4, et les objets magiques tirent leur rareté puis leur type.

Le champ `match` d'une table liste les créatures du bestiaire auxquelles elle s'applique :
c'est ce qui fait apparaître le bouton **Récolte** sur leur fiche. Ajouter une créature
revient à ajouter un objet au tableau `creatures` — voir `docs/DATA_SCHEMA.md`.

## Licences

Code : MIT. Les fiches de `data/monsters/srd-2024.json` reprennent le SRD 5.2 (CC-BY-4.0),
voir `ATTRIBUTION.md`. Aucun contenu de livre sous copyright n'est versionné ici.
