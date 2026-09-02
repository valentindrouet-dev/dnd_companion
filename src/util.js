export function slug(s) {
  return String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function plural(n, one, many = one + 's') { return n > 1 ? many : one; }

/** Tri naturel des numéros de salle : 1, 1a, 1b, 2, 10, 10a, 13c–13d… */
export function compareRoomNumbers(a, b) {
  const pa = parseNumber(a), pb = parseNumber(b);
  if (pa.n !== pb.n) return pa.n - pb.n;
  return pa.s.localeCompare(pb.s, 'fr');
}
function parseNumber(x) {
  const m = String(x ?? '').trim().match(/^(\d+)(.*)$/);
  return m ? { n: Number(m[1]), s: m[2].toLowerCase() } : { n: Number.MAX_SAFE_INTEGER, s: String(x ?? '').toLowerCase() };
}
