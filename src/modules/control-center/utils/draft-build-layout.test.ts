import { describe, expect, it } from "vitest";
import { Node } from "@xyflow/react";
import { resolveNodeOverlaps } from "./draft-build-layout";

const makeNode = (
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
): Node => ({
  id,
  type: "resourceNode",
  position: { x, y },
  measured: { width, height },
  data: {},
});

const intersects = (a: Node, b: Node) => {
  const aw = a.measured!.width!,
    ah = a.measured!.height!;
  const bw = b.measured!.width!,
    bh = b.measured!.height!;
  return (
    a.position.x < b.position.x + bw &&
    a.position.x + aw > b.position.x &&
    a.position.y < b.position.y + bh &&
    a.position.y + ah > b.position.y
  );
};

describe("resolveNodeOverlaps", () => {
  it("moves a small node off a larger one it landed on", () => {
    // Frame-sized anchor with a resource dropped right on top of it.
    const frame = makeNode("frame", 1050, 0, 400, 300);
    const resource = makeNode("res", 1200, 100, 250, 66);
    resolveNodeOverlaps([frame, resource]);

    // The larger node anchors; the smaller one is pushed clear.
    expect(frame.position).toEqual({ x: 1050, y: 0 });
    expect(intersects(frame, resource)).toBe(false);
  });

  it("clears chains of overlaps, not just the first hit", () => {
    const a = makeNode("a", 0, 0, 300, 300);
    const b = makeNode("b", 250, 0, 200, 100);
    const c = makeNode("c", 260, 10, 200, 100);
    resolveNodeOverlaps([a, b, c]);

    expect(intersects(a, b)).toBe(false);
    expect(intersects(a, c)).toBe(false);
    expect(intersects(b, c)).toBe(false);
  });

  it("leaves non-overlapping layouts untouched (entry-layout parity)", () => {
    // Tight column rhythm: 100 pitch, 80-tall nodes — gaps smaller than the
    // resolve margin must NOT be spread apart.
    const col = [0, 100, 200].map((y, i) => makeNode(`n${i}`, 1000, y, 250, 80));
    const before = col.map((n) => ({ ...n.position }));
    resolveNodeOverlaps(col);
    col.forEach((n, i) => expect(n.position).toEqual(before[i]));
  });

  it("ignores frame children and hidden nodes", () => {
    const frame = makeNode("frame", 0, 0, 400, 300);
    const child = { ...makeNode("child", 20, 20, 200, 66), parentId: "frame" };
    const hidden = { ...makeNode("hidden", 10, 10, 200, 66), hidden: true };
    resolveNodeOverlaps([frame, child, hidden]);

    expect(child.position).toEqual({ x: 20, y: 20 });
    expect(hidden.position).toEqual({ x: 10, y: 10 });
  });
});
