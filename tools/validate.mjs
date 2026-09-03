#!/usr/bin/env node
// Validation des données (data/) et de la liste de fichiers du service worker.
//   npm run validate
// Sort avec le code 1 s'il y a des erreurs.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const DATA = join(ROOT, 'data');
const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

function readJSON(p) {
  try { return JSON.parse(readFileSync(p, 'utf8')); }
  catch (e) { err(`${relative(ROOT, p)} : JSON invalide — ${e.message}`); return null; }
}

// ---------- index ----------
const index = readJSON(join(DATA, 'index.json'));
if (!index) { report(); }

const monsters = new Map();
for (const p of index.monsters || []) {
  const file = join(DATA, p);
  if (!existsSync(file)) { err(`index.json : fichier de monstres manquant ${p}`); continue; }
  const list = readJSON(file);
  if (!Array.isArray(list)) { err(`${p} : doit être un tableau`); continue; }
  list.forEach((m, i) => checkMonster(m, `${p}[${i}]`));
}

function checkMonster(m, where) {
  if (!m || typeof m !== 'object') return err(`${where} : entrée invalide`);
  if (!m.id) return err(`${where} : id manquant`);
  if (monsters.has(m.id)) err(`${where} : id de monstre en double « ${m.id} »`);
  monsters.set(m.id, m);
  if (!m.name) err(`${where} (${m.id}) : name manquant`);
  if (m.cr == null) warn(`${m.id} : FP (cr) manquant`);
  if (m.xp == null) warn(`${m.id} : xp manquant (le total de PX des rencontres sera faux)`);
  if (!m.summary) warn(`${m.id} : pas de résumé MJ (summary)`);
  for (const k of ['traits', 'actions', 'bonusActions', 'reactions', 'legendary']) {
    if (m[k] != null && !Array.isArray(m[k])) err(`${m.id}.${k} : doit être un tableau`);
  }
}

// ---------- aventures ----------
const advIds = new Set();
const advRooms = new Map();   // id d'aventure -> ids de salles, pour vérifier les liens du glossaire
for (const meta of index.adventures || []) {
  if (!meta.id || !meta.title || !meta.path) { err(`index.json : aventure incomplète ${JSON.stringify(meta)}`); continue; }
  if (advIds.has(meta.id)) err(`index.json : id d'aventure en double « ${meta.id} »`);
  advIds.add(meta.id);
  const file = join(DATA, meta.path);
  if (!existsSync(file)) { err(`index.json : fichier manquant ${meta.path}`); continue; }
  const adv = readJSON(file);
  if (adv) checkAdventure(adv, meta);
}

function textItems(x) { return Array.isArray(x) ? x : x ? [x] : []; }

function checkAdventure(adv, meta) {
  const where = meta.path;
  if (adv.id !== meta.id) err(`${where} : id « ${adv.id} » différent de index.json « ${meta.id} »`);
  if (!adv.title) err(`${where} : title manquant`);
  const localMonsters = new Map();
  for (const m of adv.monsters || []) { checkMonster(m, `${where}.monsters`); localMonsters.set(m.id, m); }
  const hasMonster = (id) => monsters.has(id) || localMonsters.has(id);

  const rooms = adv.rooms || [];
  const roomIds = new Set();
  advRooms.set(meta.id, roomIds);
  for (const r of rooms) {
    if (!r.id) { err(`${where} : salle sans id (${r.name || '?'})`); continue; }
    if (roomIds.has(r.id)) err(`${where} : id de salle en double « ${r.id} »`);
    roomIds.add(r.id);
    if (!r.name) err(`${where}/${r.id} : name manquant`);
    if (r.number == null) warn(`${where}/${r.id} : number manquant`);
  }

  const inSection = new Set();
  for (const s of adv.sections || []) {
    if (!s.id || !s.title) err(`${where} : section incomplète ${JSON.stringify(s).slice(0, 60)}`);
    for (const rid of s.rooms || []) {
      if (!roomIds.has(rid)) err(`${where} : section « ${s.id} » référence une salle inconnue « ${rid} »`);
      if (inSection.has(rid)) warn(`${where} : salle « ${rid} » présente dans plusieurs sections`);
      inSection.add(rid);
    }
  }
  // compteurs de progression déclarés par l'aventure
  for (const [i, t] of (adv.trackers || []).entries()) {
    const w = `${where}/trackers[${i}]`;
    if (!t.id) err(`${w} : id manquant`);
    if (!t.name) err(`${w} : name manquant`);
    if (!Array.isArray(t.steps) || t.steps.length < 2) { err(`${w} : il faut au moins deux paliers`); continue; }
    t.steps.forEach((s, j) => {
      if (!s.label) err(`${w}/steps[${j}] : label manquant`);
      if (!s.text) warn(`${w}/steps[${j}] : pas de description`);
    });
  }
  for (const id of roomIds) if (!inSection.has(id)) warn(`${where} : salle « ${id} » dans aucune section (affichée dans « Autres salles »)`);

  for (const r of rooms) {
    const w = `${where}/${r.id}`;
    for (const c of r.connections || []) {
      const to = typeof c === 'string' ? c : c.to;
      if (!roomIds.has(to)) err(`${w} : liaison vers une salle inconnue « ${to} »`);
      if (to === r.id) warn(`${w} : liaison vers elle-même`);
    }
    for (const e of r.enemies || []) {
      if (!e.monster) err(`${w} : créature sans champ monster`);
      else if (!hasMonster(e.monster)) err(`${w} : monstre inconnu « ${e.monster} »`);
    }
    for (const n of r.npcs || []) {
      if (!n.name) err(`${w} : PNJ sans name`);
      if (n.monster && !hasMonster(n.monster)) err(`${w} : PNJ « ${n.name} » → monstre inconnu « ${n.monster} »`);
      for (const d of n.dialogues || []) if (typeof d !== 'string' && !d.line) err(`${w} : réplique de « ${n.name} » sans line`);
    }
    if (r.layout != null && typeof r.layout !== 'string') err(`${w}.layout : doit être une chaîne`);
    for (const k of ['readAloud', 'notes', 'features', 'enemies', 'npcs', 'treasure', 'traps', 'checks', 'connections', 'dialogues', 'tags']) {
      if (r[k] != null && !Array.isArray(r[k]) && !(typeof r[k] === 'string' && ['readAloud', 'notes'].includes(k))) err(`${w}.${k} : doit être un tableau`);
    }
    checkDuplicateIds(r.enemies, `${w}.enemies`);
    checkDuplicateIds(r.npcs, `${w}.npcs`);
    checkDuplicateIds(r.treasure, `${w}.treasure`);
    checkDuplicateIds(textItems(r.readAloud), `${w}.readAloud`);
    checkDuplicateIds(textItems(r.notes), `${w}.notes`);
    checkDuplicateIds(r.features, `${w}.features`);
  }
  for (const n of adv.npcs || []) if (n.monster && !hasMonster(n.monster)) err(`${where} : PNJ « ${n.name} » → monstre inconnu « ${n.monster} »`);

  // Références [[m:…]] / [[r:…]] dans tous les textes
  walkStrings(adv, (s, path) => {
    for (const m of s.matchAll(/\[\[(m|r|monstre|salle):([^\]|]+)(?:\|[^\]]*)?\]\]/g)) {
      const id = m[2].trim();
      if (m[1].startsWith('m') && !hasMonster(id)) err(`${where} ${path} : lien vers un monstre inconnu [[m:${id}]]`);
      if (m[1].startsWith('r') && !roomIds.has(id)) err(`${where} ${path} : lien vers une salle inconnue [[r:${id}]]`);
    }
  });
}

function checkDuplicateIds(list, where) {
  if (!Array.isArray(list)) return;
  const seen = new Set();
  list.forEach((it, i) => {
    if (it && typeof it === 'object' && it.id != null) {
      if (seen.has(String(it.id))) err(`${where} : id en double « ${it.id} »`);
      seen.add(String(it.id));
    }
  });
  if (seen.size && seen.size < list.length) warn(`${where} : certains éléments ont un id et d'autres non (préférer des id partout pour des clés stables)`);
}

function walkStrings(node, fn, path = '') {
  if (typeof node === 'string') return fn(node, path);
  if (Array.isArray(node)) return node.forEach((n, i) => walkStrings(n, fn, `${path}[${i}]`));
  if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) walkStrings(v, fn, path ? `${path}.${k}` : k);
}

// ---------- cohérence des numéros de version ----------
{
  const read = (f, re) => (readFileSync(join(ROOT, f), 'utf8').match(re) || [])[1];
  const versions = {
    'version.js': read('version.js', /'(\d+\.\d+\.\d+)'/),
    'version.json': read('version.json', /"version":\s*"(\d+\.\d+\.\d+)"/),
    'sw.js': read('sw.js', /const APP_VERSION = '(\d+\.\d+\.\d+)'/),
    'package.json': read('package.json', /"version":\s*"(\d+\.\d+\.\d+)"/),
  };
  const distinct = [...new Set(Object.values(versions))];
  if (distinct.length !== 1 || !distinct[0]) {
    err(`numéros de version désaccordés (${Object.entries(versions).map(([f, v]) => `${f} ${v}`).join(', ')}) — lance « npm run version <x.y.z> »`);
  }
}

// ---------- glossaire ----------
// Le glossaire est composé par portée : un socle commun, puis un fichier par donjon
// qui le complète. On valide chaque portée telle que l'app la verra.
const gloss = new Map();
const lootByMonster = new Map();
{
  const KINDS = ['personne', 'faction', 'lieu', 'objet', 'divinite', 'peuple'];
  const noAccent = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const fichiers = new Map();
  const lire = (gp) => {
    if (fichiers.has(gp)) return fichiers.get(gp);
    const file = join(DATA, gp);
    if (!existsSync(file)) { err(`index.json : glossaire manquant ${gp}`); fichiers.set(gp, []); return []; }
    const list = readJSON(file);
    if (!Array.isArray(list)) { err(`${gp} : doit être un tableau`); fichiers.set(gp, []); return []; }
    const vus = new Set();
    list.forEach((e, i) => {
      if (!e.id) return err(`${gp}[${i}] : id manquant`);
      if (vus.has(e.id)) err(`${gp} : id en double « ${e.id} »`);
      vus.add(e.id);
      if (e.monster && !monsters.has(e.monster)) err(`${gp}/${e.id} : monstre inconnu « ${e.monster} »`);
    });
    fichiers.set(gp, list);
    return list;
  };

  const composer = (paths) => {
    const m = new Map();
    for (const gp of paths) for (const e of lire(gp)) m.set(e.id, { ...(m.get(e.id) || {}), ...e, _f: gp });
    return m;
  };

  const portees = [['index global', index.glossary || [], null]];
  for (const a of index.adventures || []) if (a.glossary) portees.push([a.id, a.glossary, a.id]);

  for (const [nom, paths, advId] of portees) {
    const merged = composer(paths);
    for (const e of merged.values()) {
      if (!e.name) err(`${nom} : « ${e.id} » n'a pas de name — aucun fichier de la portée ne le définit`);
      if (!e.what) warn(`${nom}/${e.id} : pas de description (what)`);
      if (e.kind && !KINDS.includes(noAccent(e.kind))) warn(`${nom}/${e.id} : kind « ${e.kind} » inconnu`);
      if (advId && !e.state) warn(`${nom}/${e.id} : pas d'état pour ce donjon`);
      gloss.set(e.id, e);
      // Un lien de salle doit désigner une salle DE CE DONJON : c'est tout l'intérêt
      // d'avoir séparé les index.
      if (advId) {
        const rooms = advRooms.get(advId);
        for (const champ of ['what', 'goal', 'state', 'where']) {
          for (const m2 of String(e[champ] ?? '').matchAll(/\[\[(?:r|salle):([^\]|]+)(?:\|[^\]]*)?\]\]/g)) {
            const rid = m2[1].trim();
            if (rooms && !rooms.has(rid)) err(`${e._f}/${e.id}.${champ} : [[r:${rid}]] n'existe pas dans « ${advId} »`);
          }
        }
      }
    }
  }
}

// ---------- tables de récolte ----------
const lootIds = new Set();
for (const lp of index.loot || []) {
  const file = join(DATA, lp);
  if (!existsSync(file)) { err(`index.json : table de récolte manquante ${lp}`); continue; }
  const data = readJSON(file) || {};
  for (const key of ['rarity', 'itemType']) {
    const table = data.rules?.[key];
    if (!Array.isArray(table)) { err(`${lp} : rules.${key} manquante`); continue; }
    const sum = table.reduce((t, [, w]) => t + w, 0);
    if (sum !== 100) err(`${lp} : rules.${key} totalise ${sum} % au lieu de 100`);
  }
  (data.creatures || []).forEach((c, i) => {
    if (!c.id) return err(`${lp}[${i}] : id manquant`);
    if (lootIds.has(c.id)) err(`${lp} : id en double « ${c.id} »`);
    lootIds.add(c.id);
    if (!c.name) err(`${lp}/${c.id} : name manquant`);
    if (!c.check?.skill || c.check?.dc == null) err(`${lp}/${c.id} : test de récolte (check) incomplet`);
    if (!c.danger) warn(`${lp}/${c.id} : pas de conséquence sur échec critique (danger)`);
    for (const mid of c.match || []) {
      if (!monsters.has(mid)) err(`${lp}/${c.id} : monstre inconnu « ${mid} »`);
      if (lootByMonster.has(mid)) err(`${lp} : le monstre « ${mid} » est réclamé par « ${lootByMonster.get(mid)} » et « ${c.id} »`);
      lootByMonster.set(mid, c.id);
    }
    (c.loot || []).forEach((l, j) => {
      const w = `${lp}/${c.id}[${j}]`;
      if (!l.name) err(`${w} : name manquant`);
      if (!(l.p > 0 && l.p <= 100)) err(`${w} : probabilité « ${l.p} » hors de 1-100`);
      if (!/^\d+(d\d+)?$/.test(String(l.qty))) err(`${w} : quantité « ${l.qty} » n'est ni un nombre ni « XdY »`);
      if (!l.value && !l.coin && !l.magic) warn(`${w} : ni valeur, ni pièces, ni objet magique`);
    });
  });
}

// ---------- objets magiques ----------
for (const mp of index.magicItems || []) {
  const file = join(DATA, mp);
  if (!existsSync(file)) { err(`index.json : table d'objets magiques manquante ${mp}`); continue; }
  const magic = readJSON(file) || {};
  const rarities = magic.rarities || [];
  if (!rarities.length) err(`${mp} : rarities manquante`);
  const typeNames = new Set((magic.types || []).map((t) => t.name));
  // Le tirage se fait sur les libellés de creatures.json : les deux fichiers doivent s'accorder.
  for (const lp of index.loot || []) {
    const rules = (readJSON(join(DATA, lp)) || {}).rules || {};
    for (const [label] of rules.itemType || []) {
      if (!typeNames.has(label)) err(`${mp} : aucun type « ${label} » alors que ${lp} en tire`);
    }
    for (const [label] of rules.rarity || []) {
      // Artefact est volontairement absent : le DMG n'en table aucun.
      if (label !== 'Artefact' && !rarities.includes(label)) err(`${mp} : rareté « ${label} » absente alors que ${lp} en tire`);
    }
  }
  const seen = new Set();
  (magic.types || []).forEach((t, i) => {
    if (!t.id) return err(`${mp}.types[${i}] : id manquant`);
    if (seen.has(t.id)) err(`${mp} : type en double « ${t.id} »`);
    seen.add(t.id);
    for (const k of ['name', 'plural', 'emoji']) if (!t[k]) err(`${mp}/${t.id} : ${k} manquant`);
    for (const r of rarities) {
      const items = t.items?.[r];
      if (!Array.isArray(items)) { err(`${mp}/${t.id} : rareté « ${r} » manquante`); continue; }
      if (!items.length) warn(`${mp}/${t.id} : aucun objet « ${r} » (le tirage renverra au MJ)`);
      for (const it of items) {
        if (!it.n) err(`${mp}/${t.id}/${r} : nom manquant`);
        if (!['minor', 'major'].includes(it.v)) err(`${mp}/${t.id}/${r}/${it.n} : variant « ${it.v} » inattendu`);
      }
    }
    if (t.generic) {
      const any = rarities.some((r) => (t.items?.[r] || []).some((i) => i.n.startsWith(t.generic)));
      if (!any) err(`${mp}/${t.id} : aucun objet ne commence par « ${t.generic} »`);
    }
  });
}

// ---------- cartes ----------
const mapsPath = join(DATA, 'maps.json');
if (existsSync(mapsPath)) {
  const maps = readJSON(mapsPath) || {};
  for (const f of maps.files || []) if (!existsSync(join(ROOT, f))) err(`data/maps.json : image manquante ${f}`);
  for (const meta of index.adventures || []) {
    if (!meta.map) continue;
    const m = maps.maps?.[meta.map];
    if (!m) { err(`index.json : carte « ${meta.map} » absente de data/maps.json`); continue; }
    const adv = readJSON(join(DATA, meta.path));
    for (const r of adv?.rooms || []) if (!m.rooms?.[r.id]) warn(`carte « ${meta.map} » : pas de cadrage pour la salle « ${r.id} »`);
  }
} else if ((index.adventures || []).some((a) => a.map)) {
  warn('data/maps.json absent : lance « npm run maps » pour générer les cartes.');
}

// ---------- service worker : tous les fichiers de src/ et styles/ doivent être pré-cachés ----------
const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
const listed = new Set([...sw.matchAll(/'\.\/([^']+)'/g)].map((m) => m[1]));
function files(dir) {
  const out = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) out.push(...files(p));
    else out.push(relative(ROOT, p));
  }
  return out;
}
for (const f of [...files(join(ROOT, 'src')), ...files(join(ROOT, 'styles'))]) {
  if (!listed.has(f)) err(`sw.js : « ./${f} » absent de la liste SHELL (l'app ne fonctionnera pas hors-ligne)`);
}
for (const f of listed) {
  if (f !== '' && !existsSync(join(ROOT, f))) err(`sw.js : « ./${f} » listé mais introuvable`);
}

report();

function report() {
  for (const w of warnings) console.log('  ⚠︎ ' + w);
  for (const e of errors) console.log('  ✗ ' + e);
  const advCount = (index?.adventures || []).length;
  console.log(`\n${advCount} aventure(s), ${monsters.size} monstre(s) — ${errors.length} erreur(s), ${warnings.length} avertissement(s).`);
  process.exit(errors.length ? 1 : 0);
}
