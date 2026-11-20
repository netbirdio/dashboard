import { describe, expect, it } from "vitest";
import {
  addPeersToMembers,
  buildGroupsByPeerId,
  groupPeerIds,
  groupsContainingAnyPeer,
  removePeersFromMembers,
  withPeersAdded,
  withPeersRemoved,
} from "@/modules/groups/groupMembers";

// The PUT replaces the member list, so every existing member has to survive.
const idMembers = ["p1", "p2", "p3"];
const legacyMembers = [
  { id: "p1", name: "one" },
  { id: "p2", name: "two" },
  { id: "p3", name: "three" },
] as unknown as string[];

describe.each([
  ["ids", idMembers],
  ["legacy objects", legacyMembers],
])("group members as %s", (_, members) => {
  it("reads the ids", () => {
    expect(groupPeerIds({ peers: members })).toEqual(["p1", "p2", "p3"]);
  });

  it("keeps existing members when adding a peer", () => {
    expect(addPeersToMembers(members, ["p4"])).toEqual([
      "p1",
      "p2",
      "p3",
      "p4",
    ]);
  });

  it("does not duplicate a peer that is already a member", () => {
    expect(addPeersToMembers(members, ["p2"])).toEqual(["p1", "p2", "p3"]);
  });

  it("removes only the target", () => {
    expect(removePeersFromMembers(members, ["p2"])).toEqual(["p1", "p3"]);
  });

  it("leaves members untouched when the target is not a member", () => {
    expect(removePeersFromMembers(members, ["nope"])).toEqual([
      "p1",
      "p2",
      "p3",
    ]);
  });

  it("does not mutate its input", () => {
    const copy = JSON.stringify(members);
    addPeersToMembers(members, ["p9"]);
    removePeersFromMembers(members, ["p1"]);
    expect(JSON.stringify(members)).toBe(copy);
  });
});

describe("group without members", () => {
  it("yields an empty list", () => {
    expect(groupPeerIds({})).toEqual([]);
    expect(addPeersToMembers(undefined, ["p1"])).toEqual(["p1"]);
    expect(removePeersFromMembers(undefined, ["p1"])).toEqual([]);
  });
});

describe("buildGroupsByPeerId", () => {
  it("indexes id and legacy object members alike", () => {
    const a = { id: "ga", name: "A", peers: ["p1", "p2"] };
    const b = {
      id: "gb",
      name: "B",
      peers: [{ id: "p2", name: "two" }] as unknown as string[],
    };
    const map = buildGroupsByPeerId([a, b, { id: "gc", name: "C" }]);
    expect(map.get("p1")).toEqual([a]);
    expect(map.get("p2")).toEqual([a, b]);
    expect(map.has("p3")).toBe(false);
  });

  it("is empty without groups", () => {
    expect(buildGroupsByPeerId(undefined).size).toBe(0);
  });
});

describe("bulk helpers", () => {
  const groups = [
    { id: "ga", name: "A", peers: ["p1", "p2"] },
    {
      id: "gb",
      name: "B",
      peers: [{ id: "p2" }, { id: "p3" }] as unknown as string[],
    },
    { id: "gc", name: "C", peers: ["p4"] },
  ];

  it("finds the groups holding any of the peers", () => {
    expect(
      groupsContainingAnyPeer(groups, ["p2"]).map((g) => g.id),
    ).toEqual(["ga", "gb"]);
    expect(groupsContainingAnyPeer(undefined, ["p2"])).toEqual([]);
  });

  it("adds peers to every group and keeps the other members", () => {
    const result = withPeersAdded(groups, ["p9"]);
    expect(result.map((g) => g.peers)).toEqual([
      ["p1", "p2", "p9"],
      ["p2", "p3", "p9"],
      ["p4", "p9"],
    ]);
  });

  it("removes only the given peers from every group", () => {
    const result = withPeersRemoved(groups, ["p2", "p4"]);
    expect(result.map((g) => g.peers)).toEqual([["p1"], ["p3"], []]);
  });
});
