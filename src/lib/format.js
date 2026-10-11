// ═══ Formatting & text helpers ═══

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** Fiction-year offset used across the product. */
export const UNIVERSE_OFFSET = 930;

export function universeDate(iso) {
  if (!iso) return 'UNKNOWN';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'UNKNOWN';
  return `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear() + UNIVERSE_OFFSET}`;
}

export function universeClock(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return {
    date: `${date.getFullYear() + UNIVERSE_OFFSET}.${p(date.getMonth() + 1)}.${p(date.getDate())}`,
    time: `${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`,
  };
}

const rtf = typeof Intl !== 'undefined' && Intl.RelativeTimeFormat ? new Intl.RelativeTimeFormat('en', { numeric: 'auto', style: 'short' }) : null;

export function timeAgo(iso) {
  if (!iso) return 'never';
  const diff = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diff);
  const units = [
    ['year', 31536e6], ['month', 2592e6], ['week', 6048e5], ['day', 864e5], ['hour', 36e5], ['minute', 6e4],
  ];
  for (const [unit, ms] of units) {
    if (abs >= ms) return rtf ? rtf.format(Math.round(diff / ms), unit) : `${Math.round(abs / ms)} ${unit}s ago`;
  }
  return 'just now';
}

export function shortDateTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}

export function signed(n, digits = 1) {
  if (n === undefined || n === null || Number.isNaN(n)) return '—';
  const v = Number(n);
  const s = Number.isInteger(v) ? String(v) : v.toFixed(digits);
  return v > 0 ? `+${s}` : s;
}

/** Strips trailing "(Ore)" / "(Raw)" qualifiers from material names. */
export function materialBase(name = '') {
  return name.replace(/\s*\((ore|raw|refined)\)\s*$/i, '').trim();
}

export function materialQualifier(name = '') {
  const m = name.match(/\((ore|raw|refined)\)\s*$/i);
  return m ? m[1].toUpperCase() : '';
}

/** Short station labels: "MIC-L5 MODERN ICARUS STATION" -> { code: "MIC-L5", name: "Modern Icarus Station" } */
export function stationParts(raw = '') {
  const m = raw.match(/^([A-Z]{2,4}-L\d)\s+(.*)$/);
  const titleCase = (s) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  if (m) return { code: m[1], name: titleCase(m[2]), short: m[1], rest: titleCase(m[2]).replace(/ Station$/, '') };
  const name = titleCase(raw);
  const [first, ...others] = name.split(' ');
  return { code: '', name, short: first, rest: others.join(' ') };
}

// ═══ Fuzzy search (subsequence scoring) ═══
/**
 * Returns { score, ranges } or null. Higher score is better.
 * Rewards consecutive runs, word-boundary hits and earlier matches.
 */
export function fuzzy(query, text) {
  const q = query.toLowerCase().trim();
  if (!q) return { score: 0, ranges: [] };
  const t = text.toLowerCase();

  const idx = t.indexOf(q);
  if (idx !== -1) {
    const boundary = idx === 0 || /[\s\-_/(]/.test(t[idx - 1]);
    return { score: 100 + (boundary ? 40 : 0) - idx - (t.length - q.length) * 0.2, ranges: [[idx, idx + q.length]] };
  }

  let ti = 0;
  let score = 0;
  let run = 0;
  const ranges = [];
  for (let qi = 0; qi < q.length; qi++) {
    const ch = q[qi];
    if (ch === ' ') continue;
    let found = -1;
    while (ti < t.length) {
      if (t[ti] === ch) { found = ti; break; }
      ti++;
    }
    if (found === -1) return null;
    const boundary = found === 0 || /[\s\-_/(]/.test(t[found - 1]);
    run = ranges.length && ranges[ranges.length - 1][1] === found ? run + 1 : 0;
    score += 1 + run * 3 + (boundary ? 4 : 0) - found * 0.05;
    if (ranges.length && ranges[ranges.length - 1][1] === found) ranges[ranges.length - 1][1] = found + 1;
    else ranges.push([found, found + 1]);
    ti = found + 1;
  }
  return { score, ranges };
}

export function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
export function lerp(a, b, t) { return a + (b - a) * t; }
