// Petit utilitaire de création de DOM (sans framework).
// h('div', { class: 'x', onclick: fn }, 'texte', autreNoeud, [tableau, de, noeuds])

export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'selected') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  append(el, children);
  return el;
}

export function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function frag(...children) {
  return append(document.createDocumentFragment(), children);
}

export function clear(el) {
  el.replaceChildren();
  return el;
}

export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Identifiant stable pour un élément de liste : son `id` s'il existe, sinon son index. */
export function elemId(item, index) {
  return item && typeof item === 'object' && item.id != null ? String(item.id) : String(index);
}

/** Normalise "texte" | { id, title, text } en objet. */
export function asTextItem(item, index) {
  if (item == null) return null;
  if (typeof item === 'string') return { id: String(index), text: item };
  return { id: elemId(item, index), title: item.title, text: item.text ?? '', ...item };
}
