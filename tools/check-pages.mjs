#!/usr/bin/env node
/**
 * Ouvre chaque page de l'application dans un vrai navigateur et signale toute
 * erreur JavaScript : c'est le filet qui rattrape les imports oubliés, qu'aucune
 * vérification de syntaxe ne peut voir.
 *
 *   npm start            (dans un autre terminal)
 *   npm run check
 *
 * Nécessite Playwright et un Chromium. Les chemins usuels sont testés ;
 * sinon, passe-les par PLAYWRIGHT_MODULE et CHROMIUM_PATH.
 */
import { readFileSync, existsSync } from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:8080/';
const CANDIDATE_MODULES = [
  process.env.PLAYWRIGHT_MODULE,
  'playwright',
  '/opt/node22/lib/node_modules/playwright/index.mjs',
  '/usr/lib/node_modules/playwright/index.mjs',
  '/usr/local/lib/node_modules/playwright/index.mjs',
].filter(Boolean);
const CANDIDATE_BROWSERS = [
  process.env.CHROMIUM_PATH,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
].filter(Boolean);

let chromium = null;
for (const m of CANDIDATE_MODULES) {
  try { ({ chromium } = await import(m)); break; } catch { /* on essaie le suivant */ }
}
if (!chromium) {
  console.log('Playwright introuvable — vérification des pages ignorée (npm i -D playwright).');
  process.exit(0);
}
const executablePath = CANDIDATE_BROWSERS.find((p) => existsSync(p));

const index = JSON.parse(readFileSync(new URL('../data/index.json', import.meta.url), 'utf8'));
const routes = [['accueil', ''], ['index', 'index'], ['bestiaire', 'bestiaire'], ['récoltes', 'recoltes'], ['objets', 'objets'], ['réglages', 'reglages']];
for (const a of index.adventures || []) {
  const adv = JSON.parse(readFileSync(new URL('../data/' + a.path, import.meta.url), 'utf8'));
  routes.push([`aventure ${a.id}`, `a/${a.id}`], [`liste ${a.id}`, `a/${a.id}/liste`], [`index ${a.id}`, `a/${a.id}/index`]);
  for (const r of adv.rooms) routes.push([`salle ${r.number ?? r.id}`, `a/${a.id}/r/${r.id}`]);
}

const browser = await chromium.launch(executablePath ? { executablePath } : {});
const page = await (await browser.newContext({ viewport: { width: 1180, height: 820 }, locale: 'fr-FR' })).newPage();

const failures = [];
let current = '';
const note = (kind, text) => failures.push(`${current} — ${kind} : ${text}`);
page.on('console', (m) => { if (m.type() === 'error') note('console', m.text().split('\n')[0]); });
page.on('pageerror', (e) => note('exception', e.message));
page.on('requestfailed', (r) => note('requête', `${r.url()} (${r.failure()?.errorText})`));

for (const [label, path] of routes) {
  current = label;
  await page.goto(BASE + '#/' + path);
  try {
    await page.waitForSelector('.shell', { timeout: 8000 });
    const err = await page.locator('.empty b', { hasText: 'Erreur' }).count();
    if (err) note('rendu', await page.locator('.empty').first().textContent());
  } catch (e) {
    note('rendu', e.message.split('\n')[0]);
  }
}
await browser.close();

console.log(`${routes.length} pages ouvertes.`);
if (failures.length) {
  for (const f of failures) console.log('  ✗ ' + f);
  console.log(`\n${failures.length} problème(s).`);
  process.exit(1);
}
console.log('Aucune erreur.');
