import { describe, expect, it } from "vitest";
import { Edge, Node } from "@xyflow/react";
import {
  applyDraftBuildLayout,
  resolveNodeOverlaps,
} from "./draft-build-layout";
import { FRAME_GRID_BASE_X } from "./helpers";

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

const node = (
  id: string,
  type: string,
  data: Record<string, unknown> = {},
): Node => ({
  id,
  type,
  position: { x: 0, y: 0 },
  measured: { width: 250, height: 80 },
  data,
});
const policyNode = (id: string, name: string): Node => ({
  ...node(id, "policyNode", { policy: { name } }),
  measured: { width: 160, height: 36 },
});
const frameNode = (id: string, name: string): Node => ({
  ...node(id, "networkNode", { frame: true, network: { id, name } }),
  measured: { width: 400, height: 300 },
  style: { width: 400, height: 300 },
});
const edge = (source: string, target: string): Edge => ({
  id: `${source}-${target}`,
  source,
  target,
});
const at = (nodes: Node[], id: string) =>
  nodes.find((n) => n.id === id)!.position;

describe("applyDraftBuildLayout", () => {
  // Source → policy → destination must read left-to-right for EVERY
  // destination type. The hierarchical layout buckets by node type, so a
  // destination peer starts life stacked on the sources at x 0 and a
  // standalone resource inside the frame grid's territory.
  const cases: Array<[string, string]> = [
    ["peer", "peerNode"],
    ["group", "destinationGroupNode"],
    ["resource", "resourceNode"],
  ];

  cases.forEach(([label, type]) => {
    it(`puts a destination ${label} right of the policy`, () => {
      const nodes = [
        node("src", "peerNode", { placeholderName: "Server" }),
        node("dst", type, { placeholderName: "Agent" }),
        policyNode("pol", "P"),
      ];
      const { updatedNodes } = applyDraftBuildLayout(nodes, [
        edge("src", "pol"),
        edge("pol", "dst"),
      ]);

      expect(at(updatedNodes, "src").x).toBe(0);
      expect(at(updatedNodes, "pol").x).toBe(500);
      expect(at(updatedNodes, "dst").x).toBe(1000);
    });

    it(`puts a destination ${label} right of the policy with frames on the canvas`, () => {
      const nodes = [
        node("src", "peerNode", { placeholderName: "Server" }),
        node("dst", type, { placeholderName: "Agent" }),
        policyNode("pol", "P"),
        frameNode("net", "Net"),
      ];
      const { updatedNodes } = applyDraftBuildLayout(nodes, [
        edge("src", "pol"),
        edge("pol", "dst"),
      ]);

      expect(at(updatedNodes, "src").x).toBe(0);
      expect(at(updatedNodes, "pol").x).toBe(500);
      expect(at(updatedNodes, "dst").x).toBe(1000);
      // The frame grid clears the destination column instead of sharing
      // its band (and being nudged apart by the overlap pass).
      expect(at(updatedNodes, "net").x).toBeGreaterThan(1250);
    });
  });

  it("keeps the live frame-grid origin when frames are the only destinations", () => {
    // Live-parity: the networks overview has nothing but frames on the
    // destination side, so entering draft must not shift the grid.
    const nodes = [
      node("src", "groupNode", { group: { id: "g", name: "Src" } }),
      policyNode("pol", "P"),
      frameNode("net", "Net"),
    ];
    const { updatedNodes } = applyDraftBuildLayout(nodes, [
      edge("src", "pol"),
      edge("pol", "net"),
    ]);

    expect(at(updatedNodes, "net").x).toBe(FRAME_GRID_BASE_X);
  });

  it("re-centers a lone source left behind by the destination restack", () => {
    // Both peers start in the same layout bucket, centered as a pair; once
    // the destination moves to its own column the source must not stay at
    // the pair's top offset.
    const nodes = [
      node("src", "peerNode", { placeholderName: "Server" }),
      node("dst", "peerNode", { placeholderName: "Agent" }),
      policyNode("pol", "P"),
    ];
    const { updatedNodes } = applyDraftBuildLayout(nodes, [
      edge("src", "pol"),
      edge("pol", "dst"),
    ]);

    expect(at(updatedNodes, "src").y).toBe(0);
    expect(at(updatedNodes, "dst").y).toBe(0);
  });
});
