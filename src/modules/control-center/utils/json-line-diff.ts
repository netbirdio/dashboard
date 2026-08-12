// A tiny line-level diff used by the Review & Deploy code view to render an API
// request body GitHub-style. No dependency: creates are all-add, deletes are
// all-remove, and modifications use a classic LCS line diff (fine for the small
// JSON payloads a single change produces).

export type DiffLineKind = "add" | "remove" | "context";

export interface DiffLine {
  kind: DiffLineKind;
  text: string;
}

const splitLines = (s: string): string[] => (s === "" ? [] : s.split("\n"));

// Longest-common-subsequence line diff. Bottom-up DP table, then walk it from
// the top-left preferring removals on ties so identical blocks stay aligned.
function lcsDiff(a: string[], b: string[]): DiffLine[] {
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

// Diff two already-formatted strings. `null` before → pure additions (create);
// `null` after → pure removals (delete).
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

// Pretty-print a request body the way the diff renders it (stable 2-space
// JSON). Undefined bodies (DELETE has none) become null so the caller can
// signal "no body on this side".
export function formatBody(body: unknown): string | null {
  if (body === undefined) return null;
  return JSON.stringify(body, null, 2);
}

// Convenience: diff two request bodies directly.
export function diffBodies(
  before: unknown,
  after: unknown,
): DiffLine[] {
  return diffLines(formatBody(before), formatBody(after));
}

// Added / removed line counts for the GitHub-style diffstat.
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
