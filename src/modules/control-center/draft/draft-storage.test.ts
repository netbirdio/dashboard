import { Node } from "@xyflow/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { DraftChange } from "./DraftChangesetContext";
import {
  clearDraftStorage,
  loadDraftCanvas,
  loadDraftChanges,
  saveDraftCanvas,
  saveDraftChanges,
} from "./draft-storage";

const createGroupChange: DraftChange = {
  id: "1",
  type: "create-group",
  clientId: "group-new-a",
  name: "G",
  peerIds: ["p1", "draft-b"],
  resourceIds: [],
};

describe("draft changes persistence", () => {
  beforeEach(() => window.localStorage.clear());

  it("round-trips changes", () => {
    saveDraftChanges([createGroupChange]);
    expect(loadDraftChanges()).toEqual([createGroupChange]);
  });

  it("clears the key when saving an empty changeset", () => {
    saveDraftChanges([createGroupChange]);
    saveDraftChanges([]);
    expect(loadDraftChanges()).toEqual([]);
    expect(
      window.localStorage.getItem("netbird-control-center-draft-changes"),
    ).toBe(null);
  });

  it("drops persisted entries with unknown change types", () => {
    window.localStorage.setItem(
      "netbird-control-center-draft-changes",
      JSON.stringify([createGroupChange, { id: "2", type: "outdated-type" }]),
    );
    expect(loadDraftChanges()).toEqual([createGroupChange]);
  });

  it("survives corrupt storage", () => {
    window.localStorage.setItem(
      "netbird-control-center-draft-changes",
      "{not json",
    );
    expect(loadDraftChanges()).toEqual([]);
  });
});

describe("draft canvas persistence", () => {
  beforeEach(() => window.localStorage.clear());

  it("serializes addedMembers Sets as arrays and revives them", () => {
    const nodes: Node[] = [
      {
        id: "group-new-a",
        type: "groupNode",
        position: { x: 1, y: 2 },
        data: { group: { name: "G" }, addedMembers: new Set(["p1", "p2"]) },
      },
      {
        id: "peer-draft-x",
        type: "peerNode",
        position: { x: 0, y: 0 },
        data: { placeholderKind: "agent", placeholderName: "Agent" },
      },
    ];
    saveDraftCanvas(nodes, []);

    const loaded = loadDraftCanvas();
    expect(loaded?.nodes).toHaveLength(2);
    const members = loaded?.nodes[0].data?.addedMembers as Set<string>;
    expect(members).toBeInstanceOf(Set);
    expect([...members]).toEqual(["p1", "p2"]);
    expect(loaded?.nodes[1].data).toMatchObject({ placeholderKind: "agent" });
  });

  it("returns null when nothing is stored or the payload is malformed", () => {
    expect(loadDraftCanvas()).toBe(null);
    window.localStorage.setItem(
      "netbird-control-center-draft-canvas",
      JSON.stringify({ nodes: "nope" }),
    );
    expect(loadDraftCanvas()).toBe(null);
  });

  it("clearDraftStorage removes both keys", () => {
    saveDraftChanges([createGroupChange]);
    saveDraftCanvas([], []);
    clearDraftStorage();
    expect(loadDraftChanges()).toEqual([]);
    expect(loadDraftCanvas()).toBe(null);
  });
});
