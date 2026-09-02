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

/** Rose des vents : direction de A vers B à partir de leurs positions sur la carte. */
const COMPASS = [
  ['E', 'est', 0], ['NE', 'nord-est', 45], ['N', 'nord', 90], ['NO', 'nord-ouest', 135],
  ['O', 'ouest', 180], ['SO', 'sud-ouest', 225], ['S', 'sud', 270], ['SE', 'sud-est', 315],
];

export function direction(from, to) {
  if (!from || !to) return null;
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];            // sur la carte, y croît vers le sud
  if (Math.abs(dx) < 0.6 && Math.abs(dy) < 0.6) return null;
  let deg = (Math.atan2(-dy, dx) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  const i = Math.round(deg / 45) % 8;
  const [short, long] = COMPASS.find(([, , a]) => a === i * 45) || COMPASS[0];
  return { short, long, angle: deg };
}
