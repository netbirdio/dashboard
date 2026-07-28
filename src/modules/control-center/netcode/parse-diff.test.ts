import { describe, expect, it } from "vitest";
import { parseUnifiedDiff } from "@/modules/control-center/netcode/parse-diff";

const DIFF = `--- a/configuration.yaml
+++ b/configuration.yaml
@@ -10,7 +10,8 @@
 groups:
     - id: abc
       name: All
-      peers: []
+      peers:
+        - peer-1
 policies:
     - id: pol-1
@@ -30,4 +31,3 @@
       enabled: true
-      description: gone
 networks: []
`;

describe("parseUnifiedDiff", () => {
  it("classifies every line kind", () => {
    const { lines } = parseUnifiedDiff(DIFF);
    expect(lines.filter((l) => l.kind === "meta")).toHaveLength(2);
    expect(lines.filter((l) => l.kind === "hunk")).toHaveLength(2);
    expect(lines.filter((l) => l.kind === "add")).toHaveLength(2);
    expect(lines.filter((l) => l.kind === "remove")).toHaveLength(2);
  });

  it("strips the +/- marker from the content", () => {
    const { lines } = parseUnifiedDiff(DIFF);
    const added = lines.filter((l) => l.kind === "add").map((l) => l.content);
    expect(added).toEqual(["      peers:", "        - peer-1"]);
    const removed = lines
      .filter((l) => l.kind === "remove")
      .map((l) => l.content);
    expect(removed).toEqual(["      peers: []", "      description: gone"]);
  });

  it("preserves YAML indentation on context lines", () => {
    const { lines } = parseUnifiedDiff(DIFF);
    const context = lines.filter((l) => l.kind === "context");
    expect(context[0].content).toBe("groups:");
    expect(context[1].content).toBe("    - id: abc");
  });

  it("numbers lines from the hunk header, independently per side", () => {
    const { lines } = parseUnifiedDiff(DIFF);
    // First hunk starts at old 10 / new 10
    const firstContext = lines.find((l) => l.kind === "context");
    expect(firstContext?.oldLine).toBe(10);
    expect(firstContext?.newLine).toBe(10);

    // A removal advances only the old side, an addition only the new side
    const removal = lines.find((l) => l.kind === "remove");
    expect(removal?.oldLine).toBe(13);
    expect(removal?.newLine).toBeUndefined();

    const addition = lines.find((l) => l.kind === "add");
    expect(addition?.newLine).toBe(13);
    expect(addition?.oldLine).toBeUndefined();

    // The second hunk header resets both counters
    const secondHunkIndex = lines.findIndex(
      (l, i) => l.kind === "hunk" && i > 2,
    );
    const afterSecondHunk = lines[secondHunkIndex + 1];
    expect(afterSecondHunk.oldLine).toBe(30);
    expect(afterSecondHunk.newLine).toBe(31);
  });

  it("counts additions, deletions and hunks", () => {
    const { stats } = parseUnifiedDiff(DIFF);
    expect(stats).toEqual({ additions: 2, deletions: 2, hunks: 2 });
  });

  it("returns an empty result for an empty diff", () => {
    expect(parseUnifiedDiff("")).toEqual({
      lines: [],
      stats: { additions: 0, deletions: 0, hunks: 0 },
    });
  });

  it("does not emit a phantom row for a trailing newline", () => {
    const { lines } = parseUnifiedDiff("@@ -1,1 +1,1 @@\n context\n");
    expect(lines).toHaveLength(2);
  });
});
