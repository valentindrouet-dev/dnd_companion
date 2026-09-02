# Compagnon D&D — table du MJ sur iPad

Application web (PWA) qui affiche une aventure D&D 5e (2024) **salle par salle**, pensée
pour être utilisée sur iPad pendant une partie (en parallèle de Fantasy Grounds) :
texte à lire, notes du MJ, créatures avec résumé tactique, PNJ et répliques, trésors,
pièges et tests, liaisons vers les salles connectées, générateur de loot.

- **Vue en liste sur deux colonnes**, triée par numéro, avec recherche, filtre et **pourcentage
  d'avancement** par salle ; case « faite » sur chaque ligne et anneau de progression dans la salle.
- **Plan par salle** : vignette de la carte cadrée sur la pièce, carte complète zoomable, et une
  description topologique (murs, plafond, sol, accès) en tête de chaque salle.
- **Masquer ce qui a été lu / dit / vaincu / distribué** d'un appui ; réafficher d'un autre.
- **Annoter et modifier à la volée** n'importe quel texte (l'original reste restaurable).
- **Fiches de monstres compactes** : résumé pour le MJ, CA/PV/vitesse, défenses sur une ligne et
  actions résumées (corps à corps ou distance, bonus, dégâts).
- **Générateur de rencontres** basé sur le budget de PX par niveau, et générateur de loot.
- **Hors-ligne** : données embarquées, service worker ; installable sur l'écran d'accueil.
- Zéro build, zéro dépendance : HTML/CSS/JS modernes, déployable tel quel sur GitHub Pages.

## Structure

```
index.html, styles/, src/        l'application
data/                            aventures et monstres (JSON) — voir docs/DATA_SCHEMA.md
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
4. À chaque nouvelle version, incrémenter `APP_VERSION` dans `version.js` : l'iPad la
   récupère à l'ouverture suivante (Réglages → « Vérifier les mises à jour »).

L'état de partie (masquages, annotations, notes) reste sur l'iPad ; il s'exporte et
s'importe en JSON depuis **Réglages**.

## Aventure incluse

**Strate 2 : les Salles Arcaniques** (Waterdeep : le Donjon du Mage dément) — 70 zones,
transposées depuis l'édition française pour un usage personnel à la table, avec les cadrages
de carte correspondants. Le PDF source lui-même n'est pas versionné.

## Ajouter une aventure

Voir `docs/INGESTION.md` (PDF → JSON) et `docs/DATA_SCHEMA.md` (format).

## Générateur de loot

`src/loot/generator.js` contient un générateur provisoire et le contrat attendu par
l'interface. Remplacer son contenu par le générateur existant suffit.

## Licences

Code : MIT. Les fiches de `data/monsters/srd-2024.json` reprennent le SRD 5.2 (CC-BY-4.0),
voir `ATTRIBUTION.md`. Aucun contenu de livre sous copyright n'est versionné ici.
