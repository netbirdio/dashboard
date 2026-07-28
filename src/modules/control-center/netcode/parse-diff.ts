// Parses the unified diff the netcode backend produces (difflib, 3 lines of
// context over the YAML rendering of both configurations) into rows carrying
// real old/new line numbers, so the viewer can render it like git does.

export type DiffLineKind = "add" | "remove" | "context" | "hunk" | "meta";

export type DiffLine = {
  kind: DiffLineKind;
  /** Line content with the +/- marker stripped */
  content: string;
  oldLine?: number;
  newLine?: number;
};

export type DiffStatsSummary = {
  additions: number;
  deletions: number;
  hunks: number;
};

export type ParsedDiff = {
  lines: DiffLine[];
  stats: DiffStatsSummary;
};

const HUNK_HEADER = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

export function parseUnifiedDiff(diff: string): ParsedDiff {
  const lines: DiffLine[] = [];
  const stats: DiffStatsSummary = { additions: 0, deletions: 0, hunks: 0 };

  if (!diff?.trim()) return { lines, stats };

  // A trailing newline would otherwise produce a phantom empty context row
  const rawLines = diff.replace(/\n$/, "").split("\n");

  let oldLine = 0;
  let newLine = 0;

  for (const raw of rawLines) {
    const hunk = HUNK_HEADER.exec(raw);
    if (hunk) {
      oldLine = Number(hunk[1]);
      newLine = Number(hunk[2]);
      stats.hunks += 1;
      lines.push({ kind: "hunk", content: raw });
      continue;
    }

    // File headers and difflib's timestamp lines carry no line numbers
    if (
      raw.startsWith("---") ||
      raw.startsWith("+++") ||
      raw.startsWith("diff ") ||
      raw.startsWith("index ") ||
      raw.startsWith("\\ ")
    ) {
      lines.push({ kind: "meta", content: raw });
      continue;
    }

    if (raw.startsWith("+")) {
      lines.push({ kind: "add", content: raw.slice(1), newLine });
      newLine += 1;
      stats.additions += 1;
      continue;
    }

    if (raw.startsWith("-")) {
      lines.push({ kind: "remove", content: raw.slice(1), oldLine });
      oldLine += 1;
      stats.deletions += 1;
      continue;
    }

    // Context lines are prefixed with a single space; blank lines may arrive
    // with no prefix at all
    lines.push({
      kind: "context",
      content: raw.startsWith(" ") ? raw.slice(1) : raw,
      oldLine,
      newLine,
    });
    oldLine += 1;
    newLine += 1;
  }

  return { lines, stats };
}
