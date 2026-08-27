import { describe, expect, it } from "vitest";
import { NetworkResource } from "@/interfaces/Network";
import { DraftChange } from "@/modules/control-center/draft/DraftChangesetContext";
import {
  changeNodeId,
  pendingGroupDeletionWrite,
  pendingResourceViews,
  previewRemoveChange,
  reduceRemoveChange,
} from "@/modules/control-center/utils/change-cascade";

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
    // Empty network name is what flags the resource as "No Network".
    expect(keptRes.networkName).toBe("");
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

  it("create-group removal drops its stale SSH authorized_groups key", () => {
    const grp = createGroup("Web");
    const policy = createPolicy(
      "new-p1",
      [{ name: "Web" }, { name: "Other" }],
      [{ id: "g-dest" }],
    );
    (policy as any).policy.rules[0].protocol = "netbird-ssh";
    (policy as any).policy.rules[0].authorized_groups = {
      Web: ["root"],
      Other: ["admin"],
    };
    const out = reduceRemoveChange([grp, policy], grp);
    const rule = (out.find((c) => c.id === policy.id) as any).policy.rules[0];
    // authorized_groups is keyed by group NAME, so a leftover key is sent as id.
    expect(rule.authorized_groups).toEqual({ Other: ["admin"] });
  });

  it("leaves authorized_groups absent on a rule that never had it", () => {
    const grp = createGroup("Web");
    const policy = createPolicy(
      "new-p1",
      [{ name: "Web" }, { name: "Other" }],
      [{ id: "g-dest" }],
    );
    const out = reduceRemoveChange([grp, policy], grp);
    const rule = (out.find((c) => c.id === policy.id) as any).policy.rules[0];
    expect("authorized_groups" in rule).toBe(false);
  });

  it("create-resource removal prunes an update-group left with nothing to do", () => {
    const update: DraftChange = {
      id: "id-ug-g1",
      type: "update-group",
      groupId: "g1",
      name: "Servers",
      originalName: "Servers",
      peerIds: [],
      resourceIds: ["new-res1"],
    };
    const res = createResource("new-res1");
    const out = reduceRemoveChange([update, res], res);
    expect(out).toEqual([]);
  });

  it("keeps an update-group that still carries other membership", () => {
    const update: DraftChange = {
      id: "id-ug-g1",
      type: "update-group",
      groupId: "g1",
      name: "Servers",
      originalName: "Servers",
      peerIds: [],
      resourceIds: ["new-res1", "keep"],
    };
    const res = createResource("new-res1");
    const out = reduceRemoveChange([update, res], res);
    expect((out.find((c) => c.id === update.id) as any).resourceIds).toEqual([
      "keep",
    ]);
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

  it("install-peer removal prunes an update-group left with nothing to do", () => {
    const peer = installPeer("draft-1");
    const update: DraftChange = {
      id: "id-ug-g1",
      type: "update-group",
      groupId: "g1",
      name: "Servers",
      originalName: "Servers",
      peerIds: ["draft-1"],
      resourceIds: [],
    };
    const out = reduceRemoveChange([update, peer], peer);
    expect(out).toEqual([]);
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

  it("create-group preview ignores a same-named EXISTING group's policies", () => {
    const grp = createGroup("Web");
    // The removal only touches id-less nodes, so the preview must not count
    // the live twin's edges — the dialog would promise more than the action does.
    const nodes = [
      { id: "group-new-Web", data: { group: { name: "Web" } } },
      { id: "group-g9", data: { group: { id: "g9", name: "Web" } } },
    ];
    const edges = [
      { source: "group-new-Web", target: "policy-new-p1" },
      { source: "group-g9", target: "policy-p2" },
      { source: "group-g9", target: "policy-p3" },
    ];
    const preview = previewRemoveChange(grp, [grp], nodes, edges);
    expect(preview.effects.join(" ")).toMatch(/1 policy\b/);
  });
});

// A group DELETE is refused while a policy names the group, so deleting one
// records a write against every referencing policy. Discarding the deletion has
// to undo those too, or the deploy strips the group anyway.
describe("reduceRemoveChange: delete-group restores the policies it emptied", () => {
  const ops = { id: "g1", name: "Ops" };
  const dev = { id: "g2", name: "Dev" };
  const deleteGroup = (groupId: string, name: string): DraftChange => ({
    id: `id-dg-${groupId}`,
    type: "delete-group",
    groupId,
    name,
  });
  // What deleteGroups records: the stripped policy plus what was taken from it.
  const stripped = (
    policyId: string,
    sources: unknown[],
    destinations: unknown[],
    groupIds: string[],
    basePolicy: unknown,
  ): DraftChange => ({
    id: `id-up-${policyId}`,
    type: "update-policy",
    policyId,
    name: "P",
    policy: {
      id: policyId,
      name: "P",
      rules: [{ name: "P", sources, destinations }],
    } as never,
    origin: "edit",
    groupDeletion: { groupIds, basePolicy: basePolicy as never },
  });
  const base = (sources: unknown[], destinations: unknown[]) => ({
    id: "p1",
    name: "P",
    rules: [{ name: "P", sources, destinations }],
  });

  it("drops the policy write when the discarded deletion was its only cause", () => {
    const changes = [
      stripped("p1", [], [dev], ["g1"], base([ops], [dev])),
      deleteGroup("g1", "Ops"),
    ];
    const next = reduceRemoveChange(changes, changes[1]);
    expect(next).toEqual([]);
  });

  it("leaves an unrelated policy write alone", () => {
    const other: DraftChange = {
      id: "id-up-p9",
      type: "update-policy",
      policyId: "p9",
      name: "Other",
      policy: { id: "p9", name: "Other" } as never,
      origin: "edit",
    };
    const changes = [other, deleteGroup("g1", "Ops")];
    expect(reduceRemoveChange(changes, changes[1])).toEqual([other]);
  });

  it("re-applies the deletions that remain instead of dropping the write", () => {
    const changes = [
      stripped("p1", [], [{ id: "g3", name: "Prod" }], ["g1", "g2"],
        base([ops, dev], [{ id: "g3", name: "Prod" }])),
      deleteGroup("g1", "Ops"),
      deleteGroup("g2", "Dev"),
    ];
    const next = reduceRemoveChange(changes, changes[1]);
    const write = next.find((c) => c.type === "update-policy");
    expect(write?.type === "update-policy" && write.policy.rules?.[0].sources)
      .toEqual([ops]);
    expect(
      write?.type === "update-policy" && write.groupDeletion?.groupIds,
    ).toEqual(["g2"]);
    expect(next.filter((c) => c.type === "delete-group")).toHaveLength(1);
  });

  const deletion = (groupIds: string[], basePolicy: unknown): DraftChange => ({
    id: "id-dp-p1",
    type: "delete-policy",
    policyId: "p1",
    name: "P",
    groupDeletion: { groupIds, basePolicy: basePolicy as never },
  });

  it("keeps it a deletion while the OTHER side is still losing its last group", () => {
    // Restoring Ops gives it a source back, but Dev — the only destination — is
    // still marked for deletion.
    const changes = [
      deletion(["g1", "g2"], base([ops], [dev])),
      deleteGroup("g1", "Ops"),
      deleteGroup("g2", "Dev"),
    ];
    const next = reduceRemoveChange(changes, changes[1]);
    const write = next.find(
      (c) => c.type === "update-policy" || c.type === "delete-policy",
    );
    expect(write?.type).toBe("delete-policy");
    expect(write?.groupDeletion?.groupIds).toEqual(["g2"]);
  });

  it("turns it back into an update once BOTH sides have something again", () => {
    // Ops and Extra were sources, Dev the only destination; Ops and Dev are being deleted.
    const extra = { id: "g9", name: "Extra" };
    const changes = [
      deletion(["g1", "g2"], base([ops, extra], [dev])),
      deleteGroup("g1", "Ops"),
      deleteGroup("g2", "Dev"),
    ];
    const next = reduceRemoveChange(changes, changes[2]);
    const write = next.find(
      (c) => c.type === "update-policy" || c.type === "delete-policy",
    );
    expect(write?.type).toBe("update-policy");
    expect(write?.type === "update-policy" && write.policy.rules?.[0].sources)
      .toEqual([extra]);
    expect(
      write?.type === "update-policy" && write.policy.rules?.[0].destinations,
    ).toEqual([dev]);
    expect(write?.groupDeletion?.groupIds).toEqual(["g1"]);
  });

  it("ignores a write that was never deletion-driven, so carries no tag", () => {
    // A hand edit made AFTER a deletion keeps a rebased tag instead — see the
    // handEdited cases in DraftChangesetContext.test.tsx.
    const handEdited: DraftChange = {
      id: "id-up-p1",
      type: "update-policy",
      policyId: "p1",
      name: "P",
      policy: base([ops], [dev]) as never,
      origin: "edit",
    };
    const changes = [handEdited, deleteGroup("g1", "Ops")];
    expect(reduceRemoveChange(changes, changes[1])).toEqual([handEdited]);
  });

  // The bug this guards: clearing the tag on a hand edit left the strip inside the
  // edited policy with nothing recording why, so discarding the delete-group still
  // deployed the revocation the user had just cancelled.
  it("restores the group into a hand-edited write and keeps the edit", () => {
    const prod = { id: "g3", name: "Prod" };
    // Ops was deleted, stripping it from the sources; the user then renamed the
    // policy, so mergeGroupDeletions rebased the tag onto that edit with Ops back.
    const handEdited: DraftChange = {
      id: "id-up-p1",
      type: "update-policy",
      policyId: "p1",
      name: "P v2",
      policy: { ...base([dev], [prod]), name: "P v2" } as never,
      origin: "edit",
      groupDeletion: {
        groupIds: ["g1"],
        basePolicy: { ...base([ops, dev], [prod]), name: "P v2" } as never,
        handEdited: true,
      },
    };
    const next = reduceRemoveChange(
      [handEdited, deleteGroup("g1", "Ops")],
      deleteGroup("g1", "Ops"),
    );
    const write = next.find((c) => c.type === "update-policy");
    expect(write?.type === "update-policy" && write.policy.rules?.[0].sources)
      .toEqual([ops, dev]);
    expect(write?.type === "update-policy" && write.policy.name).toBe("P v2");
    // Nothing is left stripped, so the tag is spent.
    expect(write?.groupDeletion).toBeUndefined();
  });
});

// Discarding a policy write restores the policy from LIVE, which still names every
// group a pending delete-group is about to remove — and that group's DELETE is
// refused while any policy references it.
describe("pendingGroupDeletionWrite", () => {
  const ops = { id: "g1", name: "Ops" };
  const dev = { id: "g2", name: "Dev" };
  const prod = { id: "g3", name: "Prod" };
  const deleteGroup = (groupId: string, name: string): DraftChange => ({
    id: `id-dg-${groupId}`,
    type: "delete-group",
    groupId,
    name,
  });
  const livePolicy = (sources: unknown[], destinations: unknown[]) =>
    ({
      id: "p1",
      name: "P",
      rules: [{ name: "P", sources, destinations }],
    }) as never;

  it("re-records the strip so the group deletion is not stranded", () => {
    const changes = [deleteGroup("g1", "Ops")];
    const owed = pendingGroupDeletionWrite(
      changes,
      livePolicy([ops, dev], [prod]),
      "id-keep",
    );
    expect(owed?.type).toBe("update-policy");
    // Same change id: the discarded write is replaced, not doubled up.
    expect(owed?.id).toBe("id-keep");
    expect(
      owed?.type === "update-policy" && owed.policy.rules?.[0].sources,
    ).toEqual([dev]);
    // Tagged, so discarding the delete-group can still put Ops back.
    expect(owed?.groupDeletion).toEqual({
      groupIds: ["g1"],
      basePolicy: livePolicy([ops, dev], [prod]),
    });
  });

  it("records a deletion when the strip leaves a side bare", () => {
    const owed = pendingGroupDeletionWrite(
      [deleteGroup("g1", "Ops")],
      livePolicy([ops], [prod]),
      "id-keep",
    );
    // A rule with no sources authorizes nothing and the API rejects it.
    expect(owed?.type).toBe("delete-policy");
    expect(owed?.groupDeletion?.groupIds).toEqual(["g1"]);
  });

  it("unions every pending deletion the policy names, not just one", () => {
    const owed = pendingGroupDeletionWrite(
      [deleteGroup("g1", "Ops"), deleteGroup("g3", "Prod")],
      livePolicy([ops, dev], [prod]),
      "id-keep",
    );
    expect(owed?.groupDeletion?.groupIds).toEqual(["g1", "g3"]);
  });

  it("owes nothing when no pending deletion touches the policy", () => {
    expect(
      pendingGroupDeletionWrite(
        [deleteGroup("g9", "Other")],
        livePolicy([ops], [prod]),
        "id-keep",
      ),
    ).toBeUndefined();
    expect(
      pendingGroupDeletionWrite([], livePolicy([ops], [prod]), "id-keep"),
    ).toBeUndefined();
  });
});

// Restoring a deleted network rebuilds its rows, and a pending edit or deletion on a
// CHILD outlives that restore: rows built from live alone draw a resource the changeset
// still removes, or show values the user has already changed.
describe("pendingResourceViews", () => {
  const res = (id: string, name: string): NetworkResource => ({
    id,
    name,
    address: "10.0.0.1",
    enabled: true,
  });
  const live = [res("r1", "API"), res("r2", "DB")];

  it("returns live untouched when nothing is pending", () => {
    expect(pendingResourceViews(live, [])).toEqual(live);
  });

  it("drops a resource marked for deletion", () => {
    const changes: DraftChange[] = [
      {
        id: "dr",
        type: "delete-resource",
        resourceId: "r2",
        networkId: "n1",
        name: "DB",
        networkName: "Net",
      },
    ];
    expect(pendingResourceViews(live, changes).map((r) => r.id)).toEqual(["r1"]);
  });

  it("applies a pending edit rather than showing the live values", () => {
    const changes: DraftChange[] = [
      {
        id: "ur",
        type: "update-resource",
        resourceId: "r1",
        networkId: "n1",
        networkName: "Net",
        name: "API v2",
        address: "10.0.0.9",
        description: "edited",
        enabled: false,
        groupIds: [],
      },
    ];
    const [first, second] = pendingResourceViews(live, changes);
    expect(first).toEqual({
      id: "r1",
      name: "API v2",
      address: "10.0.0.9",
      description: "edited",
      enabled: false,
    });
    expect(second).toBe(live[1]);
  });

  it("ignores changes aimed at other resources, and tolerates no resources", () => {
    const changes: DraftChange[] = [
      {
        id: "dr",
        type: "delete-resource",
        resourceId: "r9",
        networkId: "n1",
        name: "Other",
        networkName: "Net",
      },
    ];
    expect(pendingResourceViews(live, changes)).toEqual(live);
    expect(pendingResourceViews(undefined, changes)).toEqual([]);
  });
});
