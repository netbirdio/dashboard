const SEPARATORS = /[\s._\-/:]+/g;

const normalize = (s: string) => s.toLowerCase().replace(SEPARATORS, "");
const words = (s: string) => s.toLowerCase().split(SEPARATORS).filter(Boolean);

// Returns `max + 1` as soon as the distance is known to exceed `max`.
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prevPrev: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let d = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, prevPrev[j - 2] + 1);
      row.push(d);
      best = Math.min(best, d);
    }
    if (best > max) return max + 1;
    prevPrev = prev;
    prev = row;
  }
  return prev[b.length];
}

function typoBudget(length: number): number {
  if (length >= 8) return 2;
  return length >= 4 ? 1 : 0;
}

export function fuzzyScore(query: string, text: string): number {
  const q = query.trim().toLowerCase();
  const t = text.toLowerCase();
  if (!q || !t) return 0;
  if (t === q) return 100;
  if (t.startsWith(q)) return 90;
  if (t.includes(q)) return 80;
  const nq = normalize(q);
  const nt = normalize(t);
  if (nq && nt.includes(nq)) return 75;

  const queryWords = words(q);
  const textWords = words(t);
  if (queryWords.length > 1 && queryWords.every((w) => nt.includes(w))) return 70;

  const budget = typoBudget(nq.length);
  if (budget > 0) {
    if (editDistance(nq, nt, budget) <= budget) return 60;
    const close = queryWords.every((w) => {
      const b = typoBudget(w.length);
      return textWords.some((tw) => tw.startsWith(w) || (b > 0 && editDistance(w, tw, b) <= b));
    });
    if (close) return 50;
  }
  return 0;
}

function searchableStrings(value: unknown, depth = 0, out: string[] = []): string[] {
  if (typeof value === "string") {
    if (value.length <= 256) out.push(value);
  } else if (Array.isArray(value)) {
    if (depth <= 2) for (const item of value) searchableStrings(item, depth + 1, out);
  } else if (value && typeof value === "object" && depth <= 2) {
    for (const item of Object.values(value)) searchableStrings(item, depth + 1, out);
  }
  return out;
}

const NAMING_FIELDS = ["name", "hostname", "email"];

function namingScore(row: unknown, query: string): number {
  if (!row || typeof row !== "object") return 0;
  const fields = row as Record<string, unknown>;
  return Math.max(0, ...NAMING_FIELDS.map((key) => (typeof fields[key] === "string" ? fuzzyScore(query, fields[key]) : 0)));
}

const NAMED = 70;

export function fuzzySearch<T>(rows: readonly T[], query: string): T[] {
  return rows
    .map((row, index) => ({
      row,
      index,
      named: namingScore(row, query),
      score: Math.max(0, ...searchableStrings(row).map((s) => fuzzyScore(query, s))),
    }))
    .filter((r) => r.score > 0)
    .map((r) => ({ ...r, named: r.named >= NAMED ? r.named : 0 }))
    .sort((a, b) => b.named - a.named || b.score - a.score || a.index - b.index)
    .map((r) => r.row);
}
