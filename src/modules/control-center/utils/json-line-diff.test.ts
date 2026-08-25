import { describe, expect, it } from "vitest";
import { diffBodies, diffLines, diffStat, formatBody } from "./json-line-diff";

describe("diffLines", () => {
  it("treats a null before as all additions (create)", () => {
    const out = diffLines(null, "a\nb");
    expect(out).toEqual([
      { kind: "add", text: "a" },
      { kind: "add", text: "b" },
    ]);
  });

  it("treats a null after as all removals (delete)", () => {
    const out = diffLines("a\nb", null);
    expect(out).toEqual([
      { kind: "remove", text: "a" },
      { kind: "remove", text: "b" },
    ]);
  });

  it("returns nothing when both sides are null", () => {
    expect(diffLines(null, null)).toEqual([]);
  });

  it("keeps unchanged lines as context and marks the changed one", () => {
    const before = ["{", '  "n": 1,', '  "keep": true', "}"].join("\n");
    const after = ["{", '  "n": 2,', '  "keep": true', "}"].join("\n");
    const out = diffLines(before, after);
    expect(out.filter((l) => l.kind === "context").map((l) => l.text)).toEqual([
      "{",
      '  "keep": true',
      "}",
    ]);
    expect(out.find((l) => l.kind === "remove")?.text).toBe('  "n": 1,');
    expect(out.find((l) => l.kind === "add")?.text).toBe('  "n": 2,');
  });
});

describe("formatBody / diffBodies", () => {
  it("formats an object as 2-space JSON and undefined as null", () => {
    expect(formatBody({ a: 1 })).toBe('{\n  "a": 1\n}');
    expect(formatBody(undefined)).toBeNull();
  });

  it("diffs two objects field-by-field", () => {
    const out = diffBodies({ name: "A", enabled: false }, { name: "A", enabled: true });
    expect(out.some((l) => l.kind === "remove" && l.text.includes("false"))).toBe(true);
    expect(out.some((l) => l.kind === "add" && l.text.includes("true"))).toBe(true);
    expect(out.some((l) => l.kind === "context" && l.text.includes('"name"'))).toBe(true);
  });

  it("an undefined after (DELETE) removes the whole before body", () => {
    const out = diffBodies({ name: "A" }, undefined);
    expect(out.every((l) => l.kind === "remove")).toBe(true);
  });
});

// The Review modal computes a stat for EVERY row at mount, so a large group
// membership must never reach the quadratic LCS matrix.
describe("large inputs", () => {
  it("trims the common prefix/suffix and diffs only the changed window exactly", () => {
    const lines = Array.from({ length: 20000 }, (_, i) => `"peer-${i}",`);
    const before = lines.join("\n");
    const edited = [...lines];
    edited[10000] = '"peer-renamed",';
    const after = edited.join("\n");

    const out = diffLines(before, after);

    expect(out).toHaveLength(20001);
    expect(diffStat(out)).toEqual({ additions: 1, deletions: 1 });
    expect(out[10000]).toEqual({ kind: "remove", text: '"peer-10000",' });
    expect(out[10001]).toEqual({ kind: "add", text: '"peer-renamed",' });
    expect(out[0].kind).toBe("context");
    expect(out.at(-1)?.kind).toBe("context");
  });

  it("falls back to multiset counts when the changed window is huge", () => {
    const base = Array.from({ length: 3000 }, (_, i) => `"peer-${i}",`);
    // Reversing kills the common prefix/suffix so the whole body is the window.
    const reordered = [...base].reverse();
    const removed = new Set(['"peer-10",', '"peer-20",', '"peer-30",']);
    const after = [
      ...reordered.filter((l) => !removed.has(l)),
      '"peer-new-1",',
      '"peer-new-2",',
      '"peer-new-3",',
      '"peer-new-4",',
      '"peer-new-5",',
    ];

    const out = diffLines(base.join("\n"), after.join("\n"));

    // A pure reorder is not a change; only real membership diffs count.
    expect(diffStat(out)).toEqual({ additions: 5, deletions: 3 });
    expect(out.filter((l) => l.kind !== "add")).toHaveLength(base.length);
  });
});
