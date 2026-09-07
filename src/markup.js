// Mini-langage de balisage des textes de données.
//   **gras**            *italique*          « citation »
//   [[m:goblin|Gobelins]]  lien vers un monstre (ouvre la fiche)
//   [[r:r2|salle 2]]        lien vers une salle de l'aventure courante
//   1d6+2, DD 15           mis en valeur automatiquement
//   | a | b |              tableau, séparateur |---|---| sur la deuxième ligne
//   Retours à la ligne conservés.

import { escapeHtml } from './dom.js';

// Rattaché au chargement du glossaire ; sans lui, markup() rend le texte tel quel.
let decorate = (el) => el;
export function setTextDecorator(fn) { decorate = fn || ((el) => el); }

/** Transformations qui s'appliquent à l'intérieur d'une ligne. */
function inline(s) {
  s = s.replace(/\[\[(m|r|monstre|salle):([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, t, id, label) => {
    const type = t.startsWith('m') ? 'm' : 'r';
    const cleanId = id.trim();
    return `<a class="ref" data-ref="${type}:${cleanId}">${label ? label.trim() : cleanId}</a>`;
  });
  s = s.replace(/\*\*\*([^*]+)\*\*\*/g, '<b><i>$1</i></b>');
  // le gras peut contenir une italique ; on s'arrête au premier ** fermant,
  // sans jamais franchir une ligne vide (un ** orphelin ne mange pas la page)
  s = s.replace(/\*\*((?:(?!\n\n)[\s\S])+?)\*\*/g, '<b>$1</b>');
  s = s.replace(/(^|[\s(«])\*([^*\n]+)\*(?=[\s).,;:!?»]|$)/g, '$1<i>$2</i>');
  s = s.replace(/«\s?([^»]+?)\s?»/g, '<span class="quote">«&nbsp;$1&nbsp;»</span>');
  s = s.replace(/(^|[^\w>])(\d+d\d+(?:\s?[+\-−]\s?\d+)?)(?![\w<])/g, '$1<span class="dice">$2</span>');
  s = s.replace(/\b(DD|DC)\s?(\d+)\b/g, '<span class="dc">$1&nbsp;$2</span>');
  return s;
}

const isRow = (l) => { const t = l.trim(); return t.startsWith('|') && t.endsWith('|') && t.length > 2; };

/** Découpe une ligne de tableau en cellules — sans casser les liens [[r:5|salle 5]]. */
function cells(row) {
  const out = [];
  let cur = '', depth = 0;
  for (let i = 0; i < row.length; i++) {
    if (row.startsWith('[[', i)) { depth++; cur += '[['; i++; continue; }
    if (row.startsWith(']]', i)) { depth = Math.max(0, depth - 1); cur += ']]'; i++; continue; }
    if (row[i] === '|' && !depth) { out.push(cur); cur = ''; continue; }
    cur += row[i];
  }
  out.push(cur);
  return out.slice(1, -1).map((c) => c.trim());   // les barres de bord donnent deux cellules vides
}

const ALIGN = (c) => (/^:-+:$/.test(c) ? 'center' : /^-+:$/.test(c) ? 'right' : /^:?-+$/.test(c) ? '' : null);

/** Nombre de lignes du tableau qui commence à `i`, ou 0 si ce n'en est pas un. */
function tableSpan(lines, i) {
  if (!isRow(lines[i]) || !isRow(lines[i + 1] ?? '')) return 0;
  const sep = cells(lines[i + 1].trim());
  if (!sep.length || sep.some((c) => ALIGN(c) === null)) return 0;
  let n = 2;
  while (isRow(lines[i + n] ?? '')) n++;
  return n;
}

function tableHtml(rows) {
  const head = cells(rows[0].trim());
  const align = cells(rows[1].trim()).map(ALIGN);
  const cell = (tag, v, j) => {
    const a = align[j] ? ` style="text-align:${align[j]}"` : '';
    return `<${tag}${a}>${inline(v)}</${tag}>`;
  };
  const body = rows.slice(2).map((r) => `<tr>${cells(r.trim()).map((v, j) => cell('td', v, j)).join('')}</tr>`).join('');
  return `<div class="mk-tablebox"><table class="mk-table">`
       + `<thead><tr>${head.map((v, j) => cell('th', v, j)).join('')}</tr></thead>`
       + `<tbody>${body}</tbody></table></div>`;
}

export function markupToHtml(text) {
  const lines = escapeHtml(text).split('\n');
  const out = [];
  let buf = [];
  const flush = (trimEnd) => {
    if (trimEnd) while (buf.length && !buf[buf.length - 1].trim()) buf.pop();
    if (buf.length) out.push(inline(buf.join('\n')).replace(/\n/g, '<br>'));
    buf = [];
  };
  for (let i = 0; i < lines.length;) {
    const n = tableSpan(lines, i);
    if (n) {
      flush(true);                                  // pas de <br> collé au tableau
      out.push(tableHtml(lines.slice(i, i + n)));
      i += n;
      while (i < lines.length && !lines[i].trim()) i++;
    } else {
      buf.push(lines[i]);
      i++;
    }
  }
  flush(false);
  return out.join('');
}

/** Retourne un élément DOM contenant le texte balisé, mots-clés du glossaire compris. */
export function markup(text, tag = 'div', cls = '') {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  el.innerHTML = markupToHtml(text);
  return decorate(el);
}

/** Texte brut (sans balises) — utile pour les aperçus. */
export function plain(text, max = 70) {
  const s = String(text ?? '')
    .split('\n')
    .filter((l) => !/^\s*\|[\s:|-]+\|\s*$/.test(l))       // la ligne de séparation d'un tableau
    .join('\n')
    .replace(/\[\[[^:\]]+:([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, id, label) => label || id)
    .replace(/\s*\|\s*/g, ' · ')
    .replace(/(?:\s*·\s*){2,}/g, ' · ')
    .replace(/^\s*·\s*|\s*·\s*$/g, '')
    .replace(/\*\*?/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}
