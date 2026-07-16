import { Node } from "@xyflow/react";
import { describe, expect, it } from "vitest";
import { Group } from "@/interfaces/Group";
import { Policy } from "@/interfaces/Policy";
import {
  getGroupCountLabel,
  getIpPlaceholderFromRange,
  getPlaceholderHostname,
  getPlaceholderPeer,
  getPolicyRegroupUpdates,
  isDeployablePolicy,
  PLACEHOLDER_BASE_NAMES,
} from "./helpers";

const node = (id: string, data: Record<string, unknown>): Node => ({
  id,
  type: "peerNode",
  position: { x: 0, y: 0 },
  data,
});

const policyNode = (policy: Policy): Node => ({
  id: `policy-${policy.id}`,
  type: "policyNode",
  position: { x: 0, y: 0 },
  data: { policy },
});

const makePolicy = (
  id: string,
  rule: Partial<Policy["rules"][number]>,
): Policy => ({
  id,
  name: id,
  description: "",
  enabled: true,
  source_posture_checks: [],
  rules: [
    {
      name: id,
      description: "",
      enabled: true,
      sources: [],
      destinations: [],
      bidirectional: true,
      action: "accept",
      protocol: "all",
      ports: [],
      ...rule,
    },
  ],
});

describe("getIpPlaceholderFromRange", () => {
  it("falls back to the NetBird default range", () => {
    expect(getIpPlaceholderFromRange(undefined)).toBe("100.x.x.x");
    expect(getIpPlaceholderFromRange("")).toBe("100.x.x.x");
  });

  it("keeps the octets fixed by the prefix", () => {
    expect(getIpPlaceholderFromRange("10.0.0.0/8")).toBe("10.x.x.x");
    expect(getIpPlaceholderFromRange("10.20.0.0/16")).toBe("10.20.x.x");
    expect(getIpPlaceholderFromRange("192.168.1.0/24")).toBe("192.168.1.x");
  });

  it("treats partially-fixed octets as unknown", () => {
    expect(getIpPlaceholderFromRange("100.64.0.0/10")).toBe("100.x.x.x");
  });

  it("falls back on malformed input", () => {
    expect(getIpPlaceholderFromRange("garbage")).toBe("100.x.x.x");
    expect(getIpPlaceholderFromRange("10.0.0.0")).toBe("100.x.x.x");
    expect(getIpPlaceholderFromRange("fd00::/64")).toBe("100.x.x.x");
  });
});

describe("getPlaceholderPeer", () => {
  it("builds a pseudo peer with the draft id and canvas name", () => {
    const peer = getPlaceholderPeer(
      node("peer-draft-abc", {
        placeholderKind: "agent",
        placeholderName: "Agent (1)",
      }),
    );
    expect(peer).toMatchObject({ id: "draft-abc", name: "Agent (1)" });
  });

  it("falls back to the kind's base name", () => {
    for (const [kind, base] of Object.entries(PLACEHOLDER_BASE_NAMES)) {
      const peer = getPlaceholderPeer(
        node("peer-draft-x", { placeholderKind: kind }),
      );
      expect(peer?.name).toBe(base);
    }
  });

  it("ignores non-placeholders and select nodes with a chosen peer", () => {
    expect(getPlaceholderPeer(node("peer-1", { peer: { id: "1" } }))).toBe(
      undefined,
    );
    expect(
      getPlaceholderPeer(
        node("peer-1", {
          placeholderKind: "user-device",
          peer: { id: "1", name: "laptop" },
        }),
      ),
    ).toBe(undefined);
    expect(getPlaceholderPeer(undefined)).toBe(undefined);
  });
});

describe("getPlaceholderHostname", () => {
  const canvas = [
    node("peer-draft-a", { placeholderKind: "agent", placeholderName: "Agent" }),
    node("peer-draft-b", {
      placeholderKind: "agent",
      placeholderName: "Agent (1)",
    }),
    // Sanitizes to "agent-1" too — collides with Agent (1).
    node("peer-draft-c", {
      placeholderKind: "agent",
      placeholderName: "Agent 1",
    }),
    node("peer-draft-d", {
      placeholderKind: "server",
      placeholderName: "My DB Server!",
    }),
    // Select node with a chosen peer — no longer a placeholder.
    node("peer-1", { placeholderKind: "user-device", peer: { id: "1" } }),
    node("group-1", { group: { name: "All" } }),
  ];

  it("sanitizes the canvas name", () => {
    expect(getPlaceholderHostname(canvas, "peer-draft-a")).toBe("agent");
    expect(getPlaceholderHostname(canvas, "peer-draft-d")).toBe("my-db-server");
  });

  it("keeps hostnames unique across draft peers", () => {
    expect(getPlaceholderHostname(canvas, "peer-draft-b")).toBe("agent-1");
    // Sanitization collision gets the next suffix.
    expect(getPlaceholderHostname(canvas, "peer-draft-c")).toBe("agent-1-1");
  });

  it("returns undefined for unknown or non-placeholder nodes", () => {
    expect(getPlaceholderHostname(canvas, "missing")).toBe(undefined);
    expect(getPlaceholderHostname(canvas, "peer-1")).toBe(undefined);
  });
});

describe("getPolicyRegroupUpdates", () => {
  const group: Group = { name: "G", peers_count: 2, resources_count: 0 };

  it("moves a grouped source peer onto the group", () => {
    const policy = makePolicy("p1", {
      sourceResource: { id: "draft-a", type: "peer" },
      destinations: [{ name: "X" } as Group],
    });
    const updates = getPolicyRegroupUpdates(
      [policyNode(policy)],
      new Set(["draft-a"]),
      group,
    );
    expect(updates).toHaveLength(1);
    const rule = updates[0].rules[0];
    expect(rule.sourceResource).toBe(undefined);
    expect(rule.sources).toEqual([group]);
    // The other side is untouched.
    expect(rule.destinations).toEqual([{ name: "X" }]);
  });

  it("moves a grouped destination peer onto the group", () => {
    const policy = makePolicy("p2", {
      sources: [{ name: "X" } as Group],
      destinationResource: { id: "peer-1", type: "peer" },
    });
    const updates = getPolicyRegroupUpdates(
      [policyNode(policy)],
      new Set(["peer-1"]),
      group,
    );
    expect(updates[0].rules[0].destinationResource).toBe(undefined);
    expect(updates[0].rules[0].destinations).toEqual([group]);
  });

  it("handles both sides and leaves unrelated policies alone", () => {
    const both = makePolicy("p3", {
      sourceResource: { id: "a", type: "peer" },
      destinationResource: { id: "b", type: "peer" },
    });
    const unrelated = makePolicy("p4", {
      sourceResource: { id: "z", type: "peer" },
    });
    const updates = getPolicyRegroupUpdates(
      [policyNode(both), policyNode(unrelated)],
      new Set(["a", "b"]),
      group,
    );
    expect(updates).toHaveLength(1);
    expect(updates[0].id).toBe("p3");
    expect(updates[0].rules[0].sources).toEqual([group]);
    expect(updates[0].rules[0].destinations).toEqual([group]);
  });
});

describe("isDeployablePolicy — only real policies enter the changeset", () => {
  it("a blank policy (no sides) is not deployable", () => {
    expect(isDeployablePolicy(makePolicy("p", {}))).toBe(false);
  });

  it("a policy with only one side is not deployable", () => {
    expect(
      isDeployablePolicy(makePolicy("p", { sources: [{ name: "G" } as Group] })),
    ).toBe(false);
    expect(
      isDeployablePolicy(
        makePolicy("p", { destinationResource: { id: "a", type: "peer" } }),
      ),
    ).toBe(false);
  });

  it("a policy with both sides is deployable", () => {
    expect(
      isDeployablePolicy(
        makePolicy("p", {
          sources: [{ name: "G" } as Group],
          destinationResource: { id: "a", type: "peer" },
        }),
      ),
    ).toBe(true);
  });

  it("a policy referencing an uninstalled placeholder is NOT deployable", () => {
    expect(
      isDeployablePolicy(
        makePolicy("p", {
          sourceResource: { id: "draft-x", type: "peer" },
          destinations: [{ name: "G" } as Group],
        }),
      ),
    ).toBe(false);
    expect(
      isDeployablePolicy(
        makePolicy("p", {
          sources: [{ name: "G" } as Group],
          destinationResource: { id: "draft-y", type: "peer" },
        }),
      ),
    ).toBe(false);
  });

  it("a policy without rules is not deployable", () => {
    expect(
      isDeployablePolicy({ ...makePolicy("p", {}), rules: [] }),
    ).toBe(false);
  });
});

describe("getGroupCountLabel", () => {
  it("formats peer and resource counts", () => {
    expect(getGroupCountLabel(undefined)).toBe("No Peer(s)");
    expect(getGroupCountLabel({ name: "g", peers_count: 3 } as Group)).toBe(
      "3 Peer(s)",
    );
    expect(
      getGroupCountLabel({
        name: "g",
        peers_count: 1,
        resources_count: 2,
      } as Group),
    ).toBe("1 Peer(s), 2 Resource(s)");
  });
});
