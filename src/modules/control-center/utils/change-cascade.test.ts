import { describe, expect, it } from "vitest";
import { DraftChange } from "@/modules/control-center/draft/DraftChangesetContext";
import {
  changeNodeId,
  previewRemoveChange,
  reduceRemoveChange,
} from "@/modules/control-center/utils/change-cascade";

// Minimal change factories — only the fields the cascade reads.
const createGroup = (name: string, resourceIds: string[] = []): DraftChange => ({
  id: `id-cg-${name}`,
  type: "create-group",
  clientId: `group-new-${name}`,
  name,
  peerIds: [],
  resourceIds,
});
const createNetwork = (clientId: string, name = clientId): DraftChange => ({
  id: `id-cn-${clientId}`,
  type: "create-network",
  clientId,
  name,
});
const createResource = (
  clientId: string,
  opts: { networkClientId?: string; groupIds?: string[] } = {},
): DraftChange => ({
  id: `id-cr-${clientId}`,
  type: "create-resource",
  clientId,
  name: clientId,
  address: "10.0.0.1/32",
  networkClientId: opts.networkClientId,
  networkName: "net",
  groupIds: opts.groupIds ?? [],
});
const createRouter = (
  clientId: string,
  opts: { networkClientId?: string; groupId?: string; peerId?: string } = {},
): DraftChange => ({
  id: `id-crt-${clientId}`,
  type: "create-router",
  clientId,
  networkClientId: opts.networkClientId,
  networkName: "net",
  groupId: opts.groupId,
  peerId: opts.peerId,
});
const createPolicy = (
  clientId: string,
  sources: any[],
  destinations: any[],
): DraftChange => ({
  id: `id-cp-${clientId}`,
  type: "create-policy",
  clientId,
  name: clientId,
  policy: { name: clientId, rules: [{ sources, destinations } as any] } as any,
});
const installPeer = (clientId: string): DraftChange => ({
  id: `id-ip-${clientId}`,
  type: "install-peer",
  clientId,
  name: clientId,
  kind: "server",
});

describe("reduceRemoveChange", () => {
  it("create-network detaches resources and drops routers", () => {
    const net = createNetwork("new-net1");
    const res = createResource("new-res1", { networkClientId: "new-net1" });
    const router = createRouter("new-rt1", { networkClientId: "new-net1" });
    const out = reduceRemoveChange([net, res, router], net);

    expect(out.find((c) => c.type === "create-network")).toBeUndefined();
    const keptRes = out.find((c) => c.id === res.id) as any;
    expect(keptRes).toBeDefined();
    expect(keptRes.networkClientId).toBeUndefined();
    expect(keptRes.networkId).toBeUndefined();
    expect(keptRes.networkName).toBe(""); // → flagged "No Network"
    expect(out.find((c) => c.id === router.id)).toBeUndefined();
  });

  it("create-group strips its name from resources, routers, and policies", () => {
    const grp = createGroup("Web");
    const res = createResource("new-res1", { groupIds: ["Web", "keep"] });
    const routerToGroup = createRouter("new-rt1", { groupId: "Web" });
    const policy = createPolicy(
      "new-p1",
      [{ name: "Web" }, { name: "Other" }],
      [{ id: "g-existing" }],
    );
    const out = reduceRemoveChange([grp, res, routerToGroup, policy], grp);

    expect(out.find((c) => c.id === grp.id)).toBeUndefined();
    expect((out.find((c) => c.id === res.id) as any).groupIds).toEqual(["keep"]);
    expect(out.find((c) => c.id === routerToGroup.id)).toBeUndefined();
    const pol = out.find((c) => c.id === policy.id) as any;
    expect(pol.policy.rules[0].sources).toEqual([{ name: "Other" }]);
    expect(pol.policy.rules[0].destinations).toEqual([{ id: "g-existing" }]);
  });

  it("drops a create-policy left one-sided after its only source group is removed", () => {
    const grp = createGroup("Web");
    const policy = createPolicy("new-p1", [{ name: "Web" }], [{ id: "g-dest" }]);
    const out = reduceRemoveChange([grp, policy], grp);
    // Web was the policy's ONLY source → the policy is no longer valid and is
    // dropped along with the group.
    expect(out.find((c) => c.id === policy.id)).toBeUndefined();
    expect(out).toEqual([]);
  });

  it("create-resource is removed from group memberships and policy refs", () => {
    const grp = createGroup("Web", ["new-res1", "other"]);
    const res = createResource("new-res1");
    const policy = createPolicy(
      "new-p1",
      [{ id: "g1" }],
      [{ id: "g2" }],
    );
    (policy as any).policy.rules[0].destinationResource = {
      id: "new-res1",
      type: "host",
    };
    const out = reduceRemoveChange([grp, res, policy], res);

    expect(out.find((c) => c.id === res.id)).toBeUndefined();
    expect((out.find((c) => c.id === grp.id) as any).resourceIds).toEqual([
      "other",
    ]);
    expect(
      (out.find((c) => c.id === policy.id) as any).policy.rules[0]
        .destinationResource,
    ).toBeUndefined();
  });

  it("install-peer removal drops routers through it and clears group membership", () => {
    const peer = installPeer("draft-1");
    const grp = createGroup("Web");
    (grp as any).peerIds = ["draft-1", "real-peer"];
    const router = createRouter("new-rt1", { peerId: "draft-1" });
    const out = reduceRemoveChange([peer, grp, router], peer);

    expect(out.find((c) => c.id === peer.id)).toBeUndefined();
    expect(out.find((c) => c.id === router.id)).toBeUndefined();
    expect((out.find((c) => c.id === grp.id) as any).peerIds).toEqual([
      "real-peer",
    ]);
  });

  it("update/delete changes drop only the target", () => {
    const del: DraftChange = {
      id: "id-del",
      type: "delete-network",
      networkId: "n1",
      name: "n1",
    };
    const other = createGroup("Web");
    const out = reduceRemoveChange([del, other], del);
    expect(out).toEqual([other]);
  });

  it("tolerates a dangling network ref without throwing", () => {
    // create-resource points at a network whose create was already removed.
    const res = createResource("new-res1", { networkClientId: "gone" });
    expect(() => reduceRemoveChange([res], res)).not.toThrow();
    expect(reduceRemoveChange([res], res)).toEqual([]);
  });
});

describe("changeNodeId", () => {
  it("maps each change to its canvas node id", () => {
    expect(changeNodeId(createGroup("Web"))).toBe("group-new-Web");
    expect(changeNodeId(createNetwork("new-n1"))).toBe("network-new-n1");
    expect(changeNodeId(createResource("new-r1"))).toBe("resource-new-r1");
    expect(changeNodeId(installPeer("draft-1"))).toBe("peer-draft-1");
    expect(changeNodeId(createRouter("new-rt1"))).toBeUndefined();
  });
});

describe("previewRemoveChange", () => {
  it("create-network preview counts detached resources and dropped routers", () => {
    const net = createNetwork("new-net1", "Corp");
    const res = createResource("new-res1", { networkClientId: "new-net1" });
    const router = createRouter("new-rt1", { networkClientId: "new-net1" });
    const nodes = [
      { id: "network-new-net1" },
      { id: "resource-new-res1", parentId: "network-new-net1" },
    ];
    const preview = previewRemoveChange(net, [net, res, router], nodes, []);
    expect(preview.summary).toContain("Corp");
    expect(preview.effects.join(" ")).toMatch(/Detaches 1 resource/);
    expect(preview.effects.join(" ")).toMatch(/1 routing-peer change/);
  });

  it("create-group preview counts connected policies", () => {
    const grp = createGroup("Web");
    const nodes = [{ id: "group-new-Web", data: { group: { name: "Web" } } }];
    const edges = [
      { source: "group-new-Web", target: "policy-new-p1" },
      { source: "policy-new-p2", target: "group-new-Web" },
    ];
    const preview = previewRemoveChange(grp, [grp], nodes, edges);
    expect(preview.effects.join(" ")).toMatch(/2 policies/);
  });
});
