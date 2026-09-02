// Routeur par fragment (#/…) — fonctionne sans configuration serveur (GitHub Pages).
//   #/                      accueil
//   #/a/:adv                vue d'ensemble d'une aventure
//   #/a/:adv/r/:room        page d'une salle
//   #/a/:adv/liste          liste des salles triée par numéro
//   #/bestiaire[/:id]       bestiaire
//   #/index                 index alphabétique
//   #/recoltes              tables de récolte
//   #/objets                objets magiques
//   #/reglages              réglages

export function parseRoute() {
  const raw = location.hash.replace(/^#\/?/, '');
  const p = raw.split('/').filter(Boolean).map(decodeURIComponent);
  if (p.length === 0) return { name: 'home' };
  if (p[0] === 'a' && p[1]) {
    if (p[2] === 'r' && p[3]) return { name: 'room', adv: p[1], room: p[3] };
    if (p[2] === 'liste') return { name: 'roomlist', adv: p[1] };
    return { name: 'adventure', adv: p[1] };
  }
  if (p[0] === 'bestiaire') return { name: 'bestiary', monster: p[1] || null };
  if (p[0] === 'index') return { name: 'glossary' };
  if (p[0] === 'recoltes') return { name: 'loot' };
  if (p[0] === 'objets') return { name: 'magic' };
  if (p[0] === 'reglages') return { name: 'settings' };
  return { name: 'home' };
}

export function navigate(path) {
  const target = '#/' + String(path).replace(/^#?\/?/, '');
  if (location.hash === target) return;
  location.hash = target;
}

export function roomPath(advId, roomId) { return `a/${encodeURIComponent(advId)}/r/${encodeURIComponent(roomId)}`; }
export function advPath(advId) { return `a/${encodeURIComponent(advId)}`; }
export function listPath(advId) { return `a/${encodeURIComponent(advId)}/liste`; }

export function onRoute(fn) { addEventListener('hashchange', fn); }
