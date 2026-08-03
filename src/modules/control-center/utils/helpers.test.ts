import { Node } from "@xyflow/react";
import { describe, expect, it } from "vitest";
import { Group } from "@/interfaces/Group";
import { Policy } from "@/interfaces/Policy";
import {
  deriveResourceType,
  getDraftResource,
  getGroupCountLabel,
  getIpPlaceholderFromRange,
  getPlaceholderHostname,
  canDropGroupIntoNetwork,
  getFirstGroup,
  getPlaceholderPeer,
  getPoliciesTargetingResources,
  getPolicyRegroupUpdates,
  isCompleteDraftResource,
  isDeployablePolicy,
  isTrackablePolicy,
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

describe("isTrackablePolicy — both-sides policies enter the changeset even with an uninstalled peer", () => {
  it("a one-sided policy is not trackable (visibly unfinished)", () => {
    expect(
      isTrackablePolicy(makePolicy("p", { sources: [{ name: "G" } as Group] })),
    ).toBe(false);
  });

  it("a policy referencing an uninstalled placeholder peer IS trackable", () => {
    // The difference from isDeployablePolicy: trackable, so it shows in Review
    // & Deploy (as a blocking issue), rather than vanishing.
    const policy = makePolicy("p", {
      sourceResource: { id: "draft-x", type: "peer" },
      destinations: [{ name: "G" } as Group],
    });
    expect(isTrackablePolicy(policy)).toBe(true);
    expect(isDeployablePolicy(policy)).toBe(false);
  });

  it("still requires referenced draft resources to be tracked", () => {
    const policy = makePolicy("p", {
      sources: [{ name: "G" } as Group],
      destinationResource: { id: "new-r1", type: "host" },
    });
    expect(isTrackablePolicy(policy, new Set())).toBe(false);
    expect(isTrackablePolicy(policy, new Set(["new-r1"]))).toBe(true);
  });
});

describe("getGroupCountLabel", () => {
  it("formats peer and resource counts", () => {
    expect(getGroupCountLabel(undefined)).toBe("No Peers");
    expect(getGroupCountLabel({ name: "g", peers_count: 3 } as Group)).toBe(
      "3 Peers",
    );
    expect(
      getGroupCountLabel({ name: "g", resources_count: 2 } as Group),
    ).toBe("2 Resources");
    // Resources lead once the group holds any.
    expect(
      getGroupCountLabel({
        name: "g",
        peers_count: 1,
        resources_count: 2,
      } as Group),
    ).toBe("2 Resources, 1 Peer");
  });
});

describe("draft resources", () => {
  it("derives the display type from the address", () => {
    expect(deriveResourceType("service.internal")).toBe("domain");
    expect(deriveResourceType("*.example.com")).toBe("domain");
    expect(deriveResourceType("192.168.1.0/24")).toBe("subnet");
    expect(deriveResourceType("10.0.0.5")).toBe("host");
  });

  it("getDraftResource builds a pseudo-resource with the new-… id", () => {
    const resource = getDraftResource(
      node("resource-new-r1", {
        resource: { name: "DB", address: "10.0.0.5" },
      }),
    );
    expect(resource).toMatchObject({ id: "new-r1", name: "DB", type: "host" });
    // Real resources are not draft resources.
    expect(getDraftResource(node("resource-r1", { resource: {} }))).toBe(
      undefined,
    );
  });

  it("isCompleteDraftResource requires name + address + network", () => {
    const incomplete = node("resource-new-r1", {
      resource: { name: "DB" },
    });
    const complete = node("resource-new-r1", {
      resource: { name: "DB", address: "10.0.0.5" },
      draftNetwork: { networkClientId: "new-n1", name: "Office" },
    });
    expect(isCompleteDraftResource(incomplete)).toBe(false);
    expect(isCompleteDraftResource(complete)).toBe(true);
  });

  it("isCompleteDraftResource fails when the name is missing (not just empty)", () => {
    // getDraftResource defaults name to "Resource"; the gate must check the raw
    // name so an address+network resource with no user-set name isn't complete.
    const noName = node("resource-new-r1", {
      resource: { address: "10.0.0.5" },
      draftNetwork: { networkClientId: "new-n1", name: "Office" },
    });
    const blankName = node("resource-new-r1", {
      resource: { name: "", address: "10.0.0.5" },
      draftNetwork: { networkClientId: "new-n1", name: "Office" },
    });
    expect(isCompleteDraftResource(noName)).toBe(false);
    expect(isCompleteDraftResource(blankName)).toBe(false);
  });

  it("policies referencing draft resources deploy only when the resource is tracked", () => {
    const policy = makePolicy("p", {
      sources: [{ name: "G" } as Group],
      destinationResource: { id: "new-r1", type: "host" },
    });
    expect(isDeployablePolicy(policy, new Set())).toBe(false);
    expect(isDeployablePolicy(policy, new Set(["new-r1"]))).toBe(true);
  });
});

describe("getPoliciesTargetingResources — policies drawn when an existing network/resource drops", () => {
  const resource = (id: string, groups: (string | Group)[] = []) =>
    ({ id, name: id, address: "1.2.3.4", groups }) as any;

  it("matches a policy targeting the resource directly (destinationResource)", () => {
    const p = makePolicy("p1", {
      sources: [{ id: "g1", name: "All" } as Group],
      destinationResource: { id: "r1", type: "host" } as any,
    });
    const other = makePolicy("p2", {
      destinationResource: { id: "r9", type: "host" } as any,
    });
    expect(getPoliciesTargetingResources([resource("r1")], [p, other])).toEqual(
      [p],
    );
  });

  it("matches a policy whose destination group contains the resource", () => {
    const p = makePolicy("p1", {
      sources: [{ id: "g1", name: "All" } as Group],
      destinations: [{ id: "g2", name: "Servers" } as Group],
    });
    expect(
      getPoliciesTargetingResources(
        [resource("r1", [{ id: "g2", name: "Servers" } as Group])],
        [p],
      ),
    ).toEqual([p]);
    // group ids as plain strings too
    expect(
      getPoliciesTargetingResources([resource("r1", ["g2"])], [p]),
    ).toEqual([p]);
  });

  it("ignores unrelated policies and source-side matches", () => {
    const sourceOnly = makePolicy("p1", {
      sources: [{ id: "g2", name: "Servers" } as Group],
      destinations: [{ id: "g3", name: "Other" } as Group],
    });
    expect(
      getPoliciesTargetingResources([resource("r1", ["g2"])], [sourceOnly]),
    ).toEqual([]);
    expect(getPoliciesTargetingResources([resource("r1")], [])).toEqual([]);
  });

  it("collects matches across several resources without duplicates", () => {
    const p = makePolicy("p1", {
      destinations: [{ id: "g2", name: "Servers" } as Group],
    });
    const result = getPoliciesTargetingResources(
      [resource("r1", ["g2"]), resource("r2", ["g2"])],
      [p],
    );
    expect(result).toEqual([p]);
  });
});

describe("canDropGroupIntoNetwork — group → frame eligibility", () => {
  const frame = (id: string, resources: string[] = []): Node =>
    node(`network-${id}`, {
      frame: true,
      network: { id, name: "Net", resources },
    });
  const groupNode = (group: Group, extra: Record<string, unknown> = {}): Node =>
    node(`group-${group.id ?? "new"}`, { group, ...extra });

  it("allows an empty group", () => {
    const g = groupNode({ id: "g1", name: "Empty" });
    expect(canDropGroupIntoNetwork(g, frame("n1"), [], [])).toBe(true);
  });

  it("rejects a non-empty group with no resources in the network", () => {
    const g = groupNode({ id: "g1", name: "Peers", peers_count: 2 });
    expect(canDropGroupIntoNetwork(g, frame("n1"), [], [])).toBe(false);
  });

  it("rejects an empty-count group with draft-added members", () => {
    const g = groupNode(
      { id: "g1", name: "Drafted" },
      { addedMembers: new Set(["peer-1"]) },
    );
    expect(canDropGroupIntoNetwork(g, frame("n1"), [], [])).toBe(false);
  });

  it("allows a group when one of the network's API resources belongs to it", () => {
    const g = groupNode({ id: "g1", name: "Servers", resources_count: 1 });
    const resources = [
      { id: "r1", name: "DB", address: "1.1.1.1", groups: ["g1"] } as any,
    ];
    expect(canDropGroupIntoNetwork(g, frame("n1", ["r1"]), [], resources)).toBe(
      true,
    );
    // Same resource exists, but in ANOTHER network → rejected.
    expect(canDropGroupIntoNetwork(g, frame("n2"), [], resources)).toBe(false);
  });

  it("allows a group via a draft resource assigned to the frame", () => {
    const g = groupNode({ id: "g1", name: "Servers", resources_count: 1 });
    const draftResource: Node = {
      ...node("resource-new-r1", {
        resource: { id: "new-r1", name: "API", groups: ["g1"] },
      }),
      parentId: "network-n1",
    };
    expect(
      canDropGroupIntoNetwork(g, frame("n1"), [draftResource], []),
    ).toBe(true);
  });
});

describe("getFirstGroup", () => {
  const group = (id: string, name: string, peers_count = 0): Group =>
    ({ id, name, peers_count }) as Group;
  const sourcePolicy = (groupId: string): Policy =>
    ({
      id: `p-${groupId}`,
      rules: [{ sources: [{ id: groupId }] }],
    }) as unknown as Policy;

  it("prefers a non-All group that is a policy source", () => {
    const groups = [group("all", "All", 9), group("g1", "Devs", 1)];
    expect(getFirstGroup(groups, [sourcePolicy("g1")])?.id).toBe("g1");
  });

  it("falls back to All when only All has policies (never an empty group)", () => {
    const groups = [group("all", "All", 9), group("g1", "Devs", 1)];
    expect(getFirstGroup(groups, [sourcePolicy("all")])?.id).toBe("all");
  });

  it("falls back to a non-All group when nothing has policies", () => {
    const groups = [group("all", "All", 9), group("g1", "Devs", 1)];
    expect(getFirstGroup(groups, [])?.id).toBe("g1");
  });

  it("returns All when it is the only group", () => {
    expect(getFirstGroup([group("all", "All", 9)], [])?.id).toBe("all");
  });
});
