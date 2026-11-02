// Line-level diff for the Review & Deploy code view.

export type DiffLineKind = "add" | "remove" | "context";

export interface DiffLine {
  kind: DiffLineKind;
  text: string;
}

const splitLines = (s: string): string[] => (s === "" ? [] : s.split("\n"));

// Past this many trimmed lines per side the LCS matrix allocates tens of millions
// of cells synchronously in render, so the diff falls back to a multiset classification.
const MAX_LCS_WINDOW = 1500;

// Order-insensitive fallback: a line is context while the other side still has an
// unmatched copy. O(n + m); positions are not compared.
function multisetDiff(a: string[], b: string[]): DiffLine[] {
  const remaining = new Map<string, number>();
  for (const line of b) remaining.set(line, (remaining.get(line) ?? 0) + 1);
  const out: DiffLine[] = [];
  for (const line of a) {
    const left = remaining.get(line) ?? 0;
    if (left > 0) {
      remaining.set(line, left - 1);
      out.push({ kind: "context", text: line });
    } else {
      out.push({ kind: "remove", text: line });
    }
  }
  // What no a-line consumed is an addition; emitted in b's order.
  for (const line of b) {
    const left = remaining.get(line) ?? 0;
    if (left > 0) {
      remaining.set(line, left - 1);
      out.push({ kind: "add", text: line });
    }
  }
  return out;
}

function lcsDiff(a: string[], b: string[]): DiffLine[] {
  // JSON bodies are mostly identical line for line, so trimming the common
  // prefix and suffix keeps the quadratic matrix at the changed region only.
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) {
    start++;
  }
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);
  const mid =
    midA.length > MAX_LCS_WINDOW || midB.length > MAX_LCS_WINDOW
      ? multisetDiff(midA, midB)
      : lcsDiffCore(midA, midB);
  const context = (text: string): DiffLine => ({ kind: "context", text });
  return [...a.slice(0, start).map(context), ...mid, ...a.slice(endA).map(context)];
}

// Ties prefer removals so identical blocks stay aligned.
function lcsDiffCore(a: string[], b: string[]): DiffLine[] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(0),
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        a[i] === b[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ kind: "context", text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ kind: "remove", text: a[i] });
      i++;
    } else {
      out.push({ kind: "add", text: b[j] });
      j++;
    }
  }
  while (i < n) out.push({ kind: "remove", text: a[i++] });
  while (j < m) out.push({ kind: "add", text: b[j++] });
  return out;
}

export function diffLines(
  before: string | null,
  after: string | null,
): DiffLine[] {
  if (before === null && after === null) return [];
  if (before === null) {
    return splitLines(after ?? "").map((text) => ({ kind: "add", text }));
  }
  if (after === null) {
    return splitLines(before).map((text) => ({ kind: "remove", text }));
  }
  return lcsDiff(splitLines(before), splitLines(after));
}

// A DELETE has no body, so undefined maps to null.
export function formatBody(body: unknown): string | null {
  if (body === undefined) return null;
  return JSON.stringify(body, null, 2);
}

export function diffBodies(
  before: unknown,
  after: unknown,
): DiffLine[] {
  return diffLines(formatBody(before), formatBody(after));
}

export function diffStat(lines: DiffLine[]): {
  additions: number;
  deletions: number;
} {
  let additions = 0;
  let deletions = 0;
  for (const line of lines) {
    if (line.kind === "add") additions++;
    else if (line.kind === "remove") deletions++;
  }
  return { additions, deletions };
}
