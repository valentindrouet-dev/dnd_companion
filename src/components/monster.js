// Fiche de monstre : résumé MJ (style, intentions, tactique) + bloc de stats.

import { h } from '../dom.js';
import { icon } from '../icons.js';
import { markup } from '../markup.js';
import { getMonster } from '../data.js';
import { openPopup } from '../ui/popup.js';

const ABILITIES = [['str', 'FOR'], ['dex', 'DEX'], ['con', 'CON'], ['int', 'INT'], ['wis', 'SAG'], ['cha', 'CHA']];

export function mod(v) {
  if (v == null || isNaN(v)) return '—';
  const m = Math.floor((v - 10) / 2);
  return (m >= 0 ? '+' : '−') + Math.abs(m);
}

export function openMonsterPopup(id, ctx = {}) {
  const m = getMonster(id);
  if (!m) {
    openPopup({ title: 'Monstre introuvable', render: () => h('p', { class: 'muted' }, `Aucune fiche pour « ${id} ». Ajoute-la dans data/monsters/.`) });
    return;
  }
  openPopup({
    title: m.name,
    subtitle: [m.size, m.type, m.alignment].filter(Boolean).join(' · ') + (m.cr != null ? ` · FP ${m.cr}` : ''),
    size: 'lg',
    render: () => h('div', null,
      ctx.note ? h('div', { class: 'note-box', style: { marginTop: 0, marginBottom: '14px' } }, h('span', { class: 'note-label' }, 'Dans cette salle'), ctx.note) : null,
      monsterSummary(m),
      monsterStatblock(m)),
  });
}

export function monsterSummary(m) {
  const s = m.summary;
  if (!s) return null;
  const rows = [
    ['Style', s.style], ['Intentions', s.intent], ['Tactique', s.tactics],
    ['Fuite / reddition', s.flee], ['Faiblesses', s.weakness], ['Roleplay', s.roleplay],
  ].filter(([, v]) => v);
  return h('div', { class: 'summary' },
    h('h3', null, 'Résumé pour le MJ'),
    h('dl', null, rows.map(([k, v]) => [h('dt', null, k), markup(v, 'dd')])));
}

function line(label, value) {
  if (value == null || value === '') return null;
  return h('div', { class: 'sb-line' }, h('b', null, label), markup(String(value), 'span'));
}

function group(title, items) {
  if (!items || !items.length) return null;
  return h('div', { class: 'sb-group' },
    h('h3', null, title),
    items.map((it) => h('div', { class: 'sb-item' },
      it.name ? h('b', null, it.name + (it.recharge ? ` (${it.recharge})` : '') + '. ') : null,
      markup(it.text ?? '', 'span'))));
}

export function monsterStatblock(m) {
  const a = m.abilities || {};
  return h('div', { class: 'statblock' },
    h('div', { class: 'sb-meta' }, [m.size, m.type, m.alignment].filter(Boolean).join(', ')),
    h('div', { class: 'sb-vitals' },
      h('div', { class: 'sb-vital' }, h('div', { class: 'v' }, m.ac ?? '—'), h('div', { class: 'k' }, 'CA' + (m.acNote ? ` (${m.acNote})` : ''))),
      h('div', { class: 'sb-vital' }, h('div', { class: 'v' }, m.hp ?? '—'), h('div', { class: 'k' }, 'PV' + (m.hpFormula ? ` (${m.hpFormula})` : ''))),
      h('div', { class: 'sb-vital' }, h('div', { class: 'v', style: { fontSize: '1.05em' } }, m.speed ?? '—'), h('div', { class: 'k' }, 'Vitesse'))),
    h('div', { class: 'abilities' }, ABILITIES.map(([k, label]) =>
      h('div', { class: 'ability' }, h('div', { class: 'k' }, label), h('div', { class: 'v' }, a[k] ?? '—'), h('div', { class: 'm' }, mod(a[k]))))),
    line('Jets de sauvegarde', m.saves),
    line('Compétences', m.skills),
    line('Vulnérabilités', m.vulnerabilities),
    line('Résistances', m.resistances),
    line('Immunités', m.immunities),
    line('Sens', m.senses),
    line('Langues', m.languages),
    line('FP', m.cr != null ? `${m.cr}${m.xp != null ? ` (${m.xp} PX` + (m.pb != null ? ` ; BM +${m.pb}` : '') + ')' : ''}` : null),
    group('Traits', m.traits),
    group('Actions', m.actions),
    group('Actions bonus', m.bonusActions),
    group('Réactions', m.reactions),
    group('Actions légendaires', m.legendary),
    m.source ? h('div', { class: 'sb-source' }, icon('book'), ' ', m.source) : null);
}
