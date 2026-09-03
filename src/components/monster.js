// Fiche de monstre : résumé pour le MJ, constantes de combat, et actions résumées
// (corps à corps / distance, bonus, dégâts) plutôt que le texte intégral.

import { h } from '../dom.js';
import { icon } from '../icons.js';
import { markup } from '../markup.js';
import { getMonster } from '../data.js';
import { openPopup } from '../ui/popup.js';
import { lootTableFor } from '../loot/generator.js';
import { openLootPopup } from '../loot/ui.js';

/**
 * @param {string} id
 * @param {object} [opts]
 * @param {{ label: string, open: Function }} [opts.back] d'où l'on vient : la croix y ramène.
 * @param {number} [opts.count] nombre de créatures du groupe (pré-remplit la récolte)
 * @param {object} [opts.adv] @param {object} [opts.room] pour « ajouter aux notes »
 */
export function openMonsterPopup(id, opts = {}) {
  const m = getMonster(id);
  if (!m) {
    openPopup({ title: 'Monstre introuvable', back: opts.back, render: () => h('p', { class: 'muted' }, `Aucune fiche pour « ${id} ». Ajoute-la dans data/monsters/.`) });
    return;
  }
  const back = { label: m.name, open: () => openMonsterPopup(id, opts) };
  openPopup({
    title: m.name,
    subtitle: [m.size, m.type, m.alignment].filter(Boolean).join(' · '),
    size: 'lg',
    back: opts.back,
    render: () => h('div', null, lootButton(m, back, opts), monsterSummary(m), monsterStatblock(m)),
  });
}

/** Bouton Récolte, seulement si une table de butin existe pour cette créature. */
function lootButton(m, back, opts) {
  const table = lootTableFor(m.id);
  if (!table) return null;
  const open = () => openLootPopup({ creatureId: table.id, count: opts.count, adv: opts.adv, room: opts.room, back });
  return h('div', { class: 'toolbar', style: { marginBottom: '10px' } },
    h('button', { class: 'btn btn-sm', onclick: open }, icon('gem'), 'Récolte',
      opts.count > 1 ? h('span', { class: 'pill' }, `×${opts.count}`) : null));
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

const ABIL = [['FOR', 'str'], ['DEX', 'dex'], ['CON', 'con'], ['INT', 'int'], ['SAG', 'wis'], ['CHA', 'cha']];

const mod = (score) => Math.floor((score - 10) / 2);
const signed = (n) => (n >= 0 ? '+' : '−') + Math.abs(n);

/** Grille des six caractéristiques : le score et son modificateur, prêt pour les jets. */
function abilitiesGrid(a) {
  if (!a) return null;
  return h('div', { class: 'abilities' }, ABIL.map(([label, key]) => h('div', { class: 'ability' },
    h('div', { class: 'k' }, label),
    h('div', { class: 'v' }, a[key] ?? '—'),
    h('div', { class: 'm' }, a[key] == null ? '' : signed(mod(a[key]))))));
}

export function monsterStatblock(m) {
  return h('div', { class: 'statblock' },
    h('div', { class: 'sb-vitals' },
      h('div', { class: 'sb-vital' }, h('div', { class: 'v' }, m.ac ?? '—'), h('div', { class: 'k' }, 'CA')),
      h('div', { class: 'sb-vital' },
        h('div', { class: 'v' }, m.hp ?? '—'),
        m.hpFormula ? h('div', { class: 'f' }, m.hpFormula) : null,
        h('div', { class: 'k' }, 'Points de vie')),
      h('div', { class: 'sb-vital' }, h('div', { class: 'v', style: { fontSize: '1.05em' } }, m.speed ?? '—'), h('div', { class: 'k' }, 'Vitesse'))),
    abilitiesGrid(m.abilities),
    inlineLine([['Vuln.', m.vulnerabilities], ['Rés.', m.resistances], ['Imm.', m.immunities]]),
    inlineLine([['Sauv.', m.saves], ['Comp.', m.skills]]),
    inlineLine([['Sens', m.senses], ['Langues', m.languages]]),
    group('Traits', m.traits),
    group('Actions', m.actions),
    group('Actions bonus', m.bonusActions),
    group('Réactions', m.reactions),
    group('Actions légendaires', m.legendary),
    m.source ? h('div', { class: 'sb-source' }, icon('book'), ' ', m.source) : null);
}
