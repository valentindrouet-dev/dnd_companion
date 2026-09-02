# Ingestion des livres (PDF → JSON)

Objectif : transposer une aventure (et les monstres qu'elle utilise) depuis tes PDF vers
le format décrit dans `docs/DATA_SCHEMA.md`, sans jamais pousser le contenu brut des livres
dans ce dépôt public.

## Ce qui est versionné / ce qui ne l'est pas

| Emplacement | Git | Contenu |
|---|---|---|
| `sources/pdf/` | ignoré | tes PDF |
| `sources/txt/` | ignoré | texte extrait, page par page |
| `data/` | versionné | les fiches JSON que l'on rédige (résumés, reformulations, tactiques, structure) |

## Déroulé

1. **Déposer le PDF** dans `sources/pdf/` (en local) — ou le partager dans la session de travail.
2. **Extraire le texte** :
   ```bash
   pip install pymupdf            # ou pypdf
   python3 tools/ingest/pdf-extract.py sources/pdf/mon-aventure.pdf --pages 12-40
   ```
   → `sources/txt/mon-aventure/page-012.txt`, … et `_all.txt`.
3. **Rédiger le JSON** de l'aventure dans `data/adventures/<slug>.json`, salle par salle :
   numéro, nom, texte de lecture, notes MJ, créatures (avec `where` / `tactics`), PNJ et
   répliques, trésor, pièges/tests, liaisons. C'est l'étape que je (Claude) prends en charge à
   partir du texte extrait : dis-moi simplement quel chapitre / quelles pages.
4. **Ajouter les monstres** manquants dans `data/monsters/<source>.json` avec, pour chacun, le
   `summary` (style, intentions, tactique, fuite, faiblesses).
5. **Déclarer l'aventure** dans `data/index.json`, puis valider :
   ```bash
   npm run validate
   ```
6. **Tester** en local (`npm start`) puis pousser : GitHub Pages redéploie l'app, l'iPad
   récupère la nouvelle version à l'ouverture suivante (connexion nécessaire une fois).

## Conseils de rédaction

- Un bloc `readAloud` par « moment » (entrée, puis après une action) : chaque bloc est
  masquable séparément.
- Mettre dans `notes` ce que le MJ doit savoir *avant* de jouer la salle ; dans `features`
  les objets/lieux que les joueurs peuvent examiner.
- `enemies[].tactics` : une ligne, actionnable en cours de combat. Les détails vont dans le
  `summary` de la fiche monstre.
- Donner des `id` courts et stables (`gardes`, `autel`, `cle`) pour que les annotations
  suivent l'élément si le fichier est réorganisé.
- Utiliser `[[m:id]]` et `[[r:id]]` dans les textes pour naviguer d'un doigt.
