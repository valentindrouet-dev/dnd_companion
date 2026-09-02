// Fiche de monstre : résumé pour le MJ, constantes de combat, et actions résumées
// (corps à corps / distance, bonus, dégâts) plutôt que le texte intégral.

import { h } from '../dom.js';
import { icon } from '../icons.js';
import { markup } from '../markup.js';
import { getMonster } from '../data.js';
import { openPopup } from '../ui/popup.js';

export function openMonsterPopup(id) {
  const m = getMonster(id);
  if (!m) {
    openPopup({ title: 'Monstre introuvable', render: () => h('p', { class: 'muted' }, `Aucune fiche pour « ${id} ». Ajoute-la dans data/monsters/.`) });
    return;
  }
  openPopup({
    title: m.name,
    subtitle: [m.size, m.type, m.alignment].filter(Boolean).join(' · '),
    size: 'lg',
    render: () => h('div', null, monsterSummary(m), monsterStatblock(m)),
  });
}

export function monsterSummary(m) {
  const s = m.summary;
  if (!s) return null;
  const rows = [
    ['Style', s.style], ['Intentions', s.intent], ['Tactique', s.tactics],
    ['Fuite', s.flee], ['Faiblesses', s.weakness], ['Roleplay', s.roleplay],
  ].filter(([, v]) => v);
  return h('div', { class: 'summary' },
    h('h3', null, icon('flag'), ' Mener la créature'),
    h('dl', null, rows.map(([k, v]) => [h('dt', null, k), markup(v, 'dd')])));
}

/** Sépare « Jet d’attaque … Touché : dégâts. reste » en éléments affichables. */
export function parseAction(text) {
  const t = String(text ?? '');
  const atk = t.match(/Jet d[’']attaque (au corps à corps ou à distance|au corps à corps|à distance)\s*:\s*([+\-−]\s?\d+)/i);
  if (!atk) return null;
  const kind = atk[1].includes('ou') ? 'CaC / Distance' : atk[1].includes('distance') ? 'Distance' : 'CaC';
  const bonus = atk[2].replace(/\s/g, '');
  const reach = (t.match(/allonge\s+([\d,]+\s*m)/i) || [])[1];
  const range = (t.match(/portée\s+([\d,/]+\s*m)/i) || [])[1];
  const hit = t.match(/Touché\s*:\s*([^.]*?dégâts[^.]*)\./i);
  let damage = hit ? hit[1].trim() : null;
  let rest = hit ? t.slice(t.indexOf(hit[0]) + hit[0].length).trim() : t.slice(atk.index + atk[0].length).replace(/^[^.]*\.\s*/, '').trim();
  if (damage) {
    // « 5 (1d6 + 2) dégâts perforants, plus 2 (1d4) … » → garder la première tranche, le reste passe en note
    const comma = damage.match(/^(.*?dégâts\s+\S+)\s*,\s*(.+)$/i);
    if (comma) { rest = (comma[2] + '. ' + rest).trim(); damage = comma[1]; }
    damage = damage.replace(/\s*dégâts\s+(?:de\s+|d[’'])?/i, ' ');
  }
  return { kind, bonus, reach: reach || range, damage, rest };
}

function actionItem(it) {
  const parsed = parseAction(it.text);
  const title = (it.name || '') + (it.recharge ? ` (${it.recharge})` : '');
  if (!parsed) {
    return h('div', { class: 'act-plain' }, it.name ? h('b', null, title + '. ') : null, markup(it.text ?? '', 'span'));
  }
  return h('div', { class: 'act' },
    h('span', { class: 'aname' }, title),
    h('span', { class: 'pill ' + (parsed.kind === 'Distance' ? 'info' : 'danger') }, icon(parsed.kind === 'Distance' ? 'bow' : 'sword'), parsed.kind),
    h('span', { class: 'dc' }, parsed.bonus),
    parsed.reach ? h('span', { class: 'muted small' }, parsed.reach) : null,
    parsed.damage ? h('span', { class: 'adam' }, parsed.damage) : null,
    parsed.rest ? markup(parsed.rest, 'span', 'arest') : null);
}

function group(title, items) {
  if (!items || !items.length) return null;
  return h('div', { class: 'sb-group' }, h('h3', null, title), items.map(actionItem));
}

function inlineLine(pairs) {
  const kept = pairs.filter(([, v]) => v != null && v !== '');
  if (!kept.length) return null;
  return h('div', { class: 'mline' }, kept.map(([k, v]) => h('span', null, h('b', null, k), markup(String(v), 'span'))));
}

export function monsterStatblock(m) {
  return h('div', { class: 'statblock' },
    h('div', { class: 'sb-vitals' },
      h('div', { class: 'sb-vital' }, h('div', { class: 'v' }, m.ac ?? '—'), h('div', { class: 'k' }, 'CA')),
      h('div', { class: 'sb-vital' }, h('div', { class: 'v' }, m.hp ?? '—'), h('div', { class: 'k' }, 'Points de vie')),
      h('div', { class: 'sb-vital' }, h('div', { class: 'v', style: { fontSize: '1.05em' } }, m.speed ?? '—'), h('div', { class: 'k' }, 'Vitesse'))),
    inlineLine([['Vuln.', m.vulnerabilities], ['Rés.', m.resistances], ['Imm.', m.immunities]]),
    inlineLine([['Sauv.', m.saves], ['Langues', m.languages]]),
    group('Traits', m.traits),
    group('Actions', m.actions),
    group('Actions bonus', m.bonusActions),
    group('Réactions', m.reactions),
    group('Actions légendaires', m.legendary),
    m.source ? h('div', { class: 'sb-source' }, icon('book'), ' ', m.source) : null);
}
