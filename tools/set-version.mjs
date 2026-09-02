#!/usr/bin/env node
/**
 * Change le numéro de version partout d'un seul coup.
 *
 *   npm run version 0.7.1
 *
 * Quatre fichiers doivent rester d'accord : version.js (lu par l'app), version.json
 * (interrogé pour détecter une nouvelle version), sw.js (dont le contenu doit changer
 * pour que le navigateur réinstalle le service worker) et package.json.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const version = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(version || '')) {
  console.error('Usage : npm run version 0.7.1');
  process.exit(1);
}

const root = new URL('..', import.meta.url);
const edits = [
  ['version.js', /'\d+\.\d+\.\d+'/, `'${version}'`],
  ['sw.js', /const APP_VERSION = '\d+\.\d+\.\d+';/, `const APP_VERSION = '${version}';`],
  ['package.json', /"version": "\d+\.\d+\.\d+"/, `"version": "${version}"`],
];
for (const [file, pattern, replacement] of edits) {
  const url = new URL(file, root);
  const before = readFileSync(url, 'utf8');
  if (!pattern.test(before)) { console.error(`✗ ${file} : motif de version introuvable`); process.exit(1); }
  writeFileSync(url, before.replace(pattern, replacement));
  console.log('  ✓ ' + file);
}
writeFileSync(new URL('version.json', root), `{\n  "version": "${version}"\n}\n`);
console.log('  ✓ version.json');
console.log(`\nVersion ${version}. Pense à pousser : l'iPad la verra à la prochaine ouverture.`);
