/**
 * Loose matching for what a person types against names in the account:
 * "anna laptop" finds `laptop-anna`, "stagng-db" finds `staging-db`.
 * Scores are relative, only good for ranking one search's matches.
 */

const SEPARATORS = /[\s._\-/:]+/g;

const normalize = (s: string) => s.toLowerCase().replace(SEPARATORS, "");
const words = (s: string) => s.toLowerCase().split(SEPARATORS).filter(Boolean);

/** Edit distance with transpositions, giving up once it passes `max`. */
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

/** How well `query` matches `text`: 0 for no match, up to 100 for an exact one. */
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
  // Every word typed appears, in any order: "anna laptop" against `laptop-anna`.
  if (queryWords.length > 1 && queryWords.every((w) => nt.includes(w))) return 70;

  // A typo or two in one word, or in the whole name.
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

/** The strings a row is found by: its own and its direct children's, such as a peer's groups. */
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

/** The rows matching `query`, best match first; rows that tie keep their order. */
export function fuzzySearch<T>(rows: readonly T[], query: string): T[] {
  return rows
    .map((row, index) => ({ row, index, score: Math.max(0, ...searchableStrings(row).map((s) => fuzzyScore(query, s))) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((r) => r.row);
}
