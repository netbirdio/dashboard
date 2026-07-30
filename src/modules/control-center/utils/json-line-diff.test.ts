import { describe, expect, it } from "vitest";
import { diffBodies, diffLines, formatBody } from "./json-line-diff";

// The code view renders these: a create is all additions, a delete is all
// removals, and a modification is a real line diff of the two JSON bodies.

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
    // The braces and the "keep" line survive as context; only "n" flips.
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
    // name line is identical → context; the enabled line changes.
    expect(out.some((l) => l.kind === "remove" && l.text.includes("false"))).toBe(true);
    expect(out.some((l) => l.kind === "add" && l.text.includes("true"))).toBe(true);
    expect(out.some((l) => l.kind === "context" && l.text.includes('"name"'))).toBe(true);
  });

  it("an undefined after (DELETE) removes the whole before body", () => {
    const out = diffBodies({ name: "A" }, undefined);
    expect(out.every((l) => l.kind === "remove")).toBe(true);
  });
});
