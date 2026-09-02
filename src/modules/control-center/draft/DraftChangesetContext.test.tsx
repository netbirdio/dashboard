import { act, renderHook } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import { Group } from "@/interfaces/Group";
import { Policy } from "@/interfaces/Policy";
import { reduceRemoveChange } from "@/modules/control-center/utils/change-cascade";
import {
  DraftChange,
  DraftChangesetProvider,
  getCanvasWarnings,
  getChangeIssue,
  hasBlockingIssues,
  InstallPeerChange,
  useDraftChangeset,
} from "./DraftChangesetContext";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <DraftChangesetProvider>{children}</DraftChangesetProvider>
);

const setup = () => renderHook(() => useDraftChangeset(), { wrapper });

const makePolicy = (
  id: string,
  rule: Partial<Policy["rules"][number]> = {},
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

// trackUpdatePolicy reads both-sides-bare as a deletion, so these need a policy
// that actually authorizes something.
const makeSidedPolicy = (id: string) =>
  makePolicy(id, {
    sources: [{ name: "A" } as Group],
    destinations: [{ name: "B" } as Group],
  });

describe("group changes", () => {
  it("a rename of a draft-only group folds into its create change", () => {
    const { result } = setup();
    act(() =>
      result.current.trackCreateGroup({ clientId: "group-new-1", name: "G" }),
    );
    act(() => result.current.trackRenameGroup({ from: "G", to: "G2" }));

    expect(result.current.changes).toHaveLength(1);
    expect(result.current.changes[0]).toMatchObject({
      type: "create-group",
      name: "G2",
    });
  });

  it("renaming an existing group back to its original removes the change", () => {
    const { result } = setup();
    act(() =>
      result.current.trackRenameGroup({ groupId: "g1", from: "A", to: "B" }),
    );
    expect(result.current.changes).toHaveLength(1);
    act(() =>
      result.current.trackRenameGroup({ groupId: "g1", from: "B", to: "A" }),
    );
    expect(result.current.changes).toHaveLength(0);
  });

  it("members added to a draft-only group land in its create change", () => {
    const { result } = setup();
    act(() =>
      result.current.trackCreateGroup({ clientId: "group-new-1", name: "G" }),
    );
    act(() =>
      result.current.trackAddGroupMembers({
        groupName: "G",
        peerIds: ["p1", "draft-a"],
      }),
    );
    expect(result.current.changes[0]).toMatchObject({
      type: "create-group",
      peerIds: ["p1", "draft-a"],
    });
  });

  it("rename + drag-added members share ONE update change per existing group", () => {
    const { result } = setup();
    act(() =>
      result.current.trackRenameGroup({ groupId: "g1", from: "A", to: "B" }),
    );
    act(() =>
      result.current.trackAddGroupMembers({
        groupId: "g1",
        groupName: "B",
        peerIds: ["p1"],
      }),
    );
    expect(result.current.changes).toHaveLength(1);
    expect(result.current.changes[0]).toMatchObject({
      type: "update-group",
      name: "B",
      peerIds: ["p1"],
    });
  });

  it("group renames follow into recorded policy changes (name-referenced draft groups)", () => {
    const { result } = setup();
    const policy = makePolicy("new-1", {
      sources: [{ name: "G" } as Group],
      destinations: [{ id: "x", name: "X" } as Group],
    });
    act(() =>
      result.current.trackCreatePolicy({ clientId: "new-1", policy }),
    );
    act(() => result.current.trackRenameGroup({ from: "G", to: "G2" }));

    const change = result.current.changes.find(
      (c) => c.type === "create-policy",
    );
    expect(
      (change as { policy: Policy }).policy.rules[0].sources,
    ).toEqual([{ name: "G2" }]);
  });

  it("replacePeerIdInGroups renames a placeholder member to the real peer id", () => {
    const { result } = setup();
    act(() =>
      result.current.trackCreateGroup({
        clientId: "group-new-1",
        name: "G",
        peerIds: ["draft-a", "p9"],
      }),
    );
    act(() =>
      result.current.trackAddGroupMembers({
        groupId: "g1",
        groupName: "X",
        peerIds: ["draft-a"],
      }),
    );
    act(() => result.current.replacePeerIdInGroups("draft-a", "real-1"));

    expect(result.current.changes[0]).toMatchObject({
      peerIds: ["real-1", "p9"],
    });
    expect(result.current.changes[1]).toMatchObject({ peerIds: ["real-1"] });
  });

  it("re-adding a removed EXISTING member reverts the change instead of adding it", () => {
    const { result } = setup();
    act(() =>
      result.current.trackRemoveGroupMembers({
        groupId: "g1",
        groupName: "G",
        peerIds: ["p1"],
      }),
    );
    expect(result.current.changes[0]).toMatchObject({
      type: "update-group",
      removedPeerIds: ["p1"],
    });

    act(() =>
      result.current.trackAddGroupMembers({
        groupId: "g1",
        groupName: "G",
        peerIds: ["p1"],
      }),
    );
    expect(result.current.changes).toHaveLength(0);
  });

  it("removing an existing member again after a revert is still tracked", () => {
    const { result } = setup();
    act(() =>
      result.current.trackRemoveGroupMembers({
        groupId: "g1",
        groupName: "G",
        peerIds: ["p1"],
      }),
    );
    act(() =>
      result.current.trackAddGroupMembers({
        groupId: "g1",
        groupName: "G",
        peerIds: ["p1"],
      }),
    );
    act(() =>
      result.current.trackRemoveGroupMembers({
        groupId: "g1",
        groupName: "G",
        peerIds: ["p1"],
      }),
    );
    expect(result.current.changes).toHaveLength(1);
    expect(result.current.changes[0]).toMatchObject({
      type: "update-group",
      peerIds: [],
      removedPeerIds: ["p1"],
    });
  });

  // pendingOnly is the sweep of an absorbed placeholder: its membership was only
  // ever a pending add, so the cancel must not read as removing a live member.
  it("pendingOnly nets a pending add out and drops the emptied change", () => {
    const { result } = setup();
    act(() =>
      result.current.trackAddGroupMembers({
        groupId: "g1",
        groupName: "G",
        peerIds: ["draft-a"],
      }),
    );
    act(() =>
      result.current.trackRemoveGroupMembers({
        groupId: "g1",
        groupName: "G",
        peerIds: ["draft-a"],
        pendingOnly: true,
      }),
    );
    expect(result.current.changes).toHaveLength(0);
  });

  it("pendingOnly creates no change where none exists", () => {
    const { result } = setup();
    act(() =>
      result.current.trackRemoveGroupMembers({
        groupId: "g1",
        groupName: "G",
        peerIds: ["draft-a"],
        pendingOnly: true,
      }),
    );
    expect(result.current.changes).toHaveLength(0);
  });

  it("pendingOnly never records a live member as removed", () => {
    const { result } = setup();
    act(() =>
      result.current.trackAddGroupMembers({
        groupId: "g1",
        groupName: "G",
        peerIds: ["draft-a"],
        resourceIds: ["r1"],
      }),
    );
    act(() =>
      result.current.trackRemoveGroupMembers({
        groupId: "g1",
        groupName: "G",
        // p-live is NOT a pending add.
        peerIds: ["draft-a", "p-live"],
        pendingOnly: true,
      }),
    );
    expect(result.current.changes).toHaveLength(1);
    expect(result.current.changes[0]).toMatchObject({
      type: "update-group",
      peerIds: [],
      resourceIds: ["r1"],
    });
    expect(
      (result.current.changes[0] as { removedPeerIds?: string[] })
        .removedPeerIds ?? [],
    ).toEqual([]);
  });

  it("a revert keeps unrelated pending edits on the same group", () => {
    const { result } = setup();
    act(() =>
      result.current.trackRenameGroup({ groupId: "g1", from: "A", to: "B" }),
    );
    act(() =>
      result.current.trackRemoveGroupMembers({
        groupId: "g1",
        groupName: "B",
        peerIds: ["p1"],
      }),
    );
    act(() =>
      result.current.trackAddGroupMembers({
        groupId: "g1",
        groupName: "B",
        peerIds: ["p1"],
      }),
    );
    expect(result.current.changes).toHaveLength(1);
    expect(result.current.changes[0]).toMatchObject({
      type: "update-group",
      name: "B",
      peerIds: [],
      removedPeerIds: [],
    });
  });

  it("deleting a draft-only group drops its create change AND its name refs", () => {
    const { result } = setup();
    act(() =>
      result.current.trackCreateGroup({ clientId: "group-new-1", name: "G" }),
    );
    act(() =>
      result.current.trackCreateResource({
        clientId: "new-r1",
        name: "res",
        address: "10.0.0.1",
        networkClientId: "new-n1",
        networkName: "N",
        groupIds: ["G"],
      }),
    );
    act(() =>
      result.current.trackCreateRouter({
        clientId: "new-rt1",
        networkClientId: "new-n1",
        networkName: "N",
        groupId: "G",
        groupName: "G",
      }),
    );
    act(() => result.current.trackDeleteGroup({ name: "G" }));
    // A dangling "G" would deploy as a literal group id and fail mid-run.
    expect(result.current.changes).toEqual([
      expect.objectContaining({ type: "create-resource", groupIds: [] }),
    ]);
  });

  it("deleting an existing group supersedes its pending update", () => {
    const { result } = setup();
    act(() =>
      result.current.trackRenameGroup({ groupId: "g1", from: "A", to: "B" }),
    );
    act(() => result.current.trackDeleteGroup({ groupId: "g1", name: "A" }));
    expect(result.current.changes).toHaveLength(1);
    expect(result.current.changes[0].type).toBe("delete-group");
  });
});

describe("untrackNewGroup cascades like the review panel", () => {
  const seed = (r: ReturnType<typeof setup>["result"]) => {
    act(() => r.current.trackCreateGroup({ clientId: "group-new-1", name: "G" }));
    act(() =>
      r.current.trackCreateResource({
        clientId: "new-r1",
        name: "res",
        address: "10.0.0.1",
        networkClientId: "new-n1",
        networkName: "N",
        groupIds: ["G"],
      }),
    );
    act(() =>
      r.current.trackCreateRouter({
        clientId: "new-rt1",
        networkClientId: "new-n1",
        networkName: "N",
        groupId: "G",
        groupName: "G",
      }),
    );
  };

  it("drops the group's name from a draft resource and drops its router", () => {
    const { result } = setup();
    seed(result);
    act(() => result.current.untrackNewGroup("G"));

    expect(
      result.current.changes.some((c) => c.type === "create-group"),
    ).toBe(false);
    expect(result.current.changes).toEqual([
      expect.objectContaining({ type: "create-resource", groupIds: [] }),
    ]);
  });

  it("matches reduceRemoveChange exactly, so both removal paths agree", () => {
    const canvas = setup();
    seed(canvas.result);
    act(() => canvas.result.current.untrackNewGroup("G"));

    const panel = setup();
    seed(panel.result);
    const target = panel.result.current.changes.find(
      (c) => c.type === "create-group",
    )!;
    act(() =>
      panel.result.current.replaceChanges(
        reduceRemoveChange(panel.result.current.changes, target),
      ),
    );

    const shape = (cs: DraftChange[]) =>
      cs.map(({ id, ...rest }) => rest);
    expect(shape(canvas.result.current.changes)).toEqual(
      shape(panel.result.current.changes),
    );
  });
});

describe("policy changes", () => {
  it("edits to a draft-created policy fold into its create change", () => {
    const { result } = setup();
    act(() =>
      result.current.trackCreatePolicy({
        clientId: "new-1",
        policy: makeSidedPolicy("new-1"),
      }),
    );
    act(() =>
      result.current.trackUpdatePolicy({
        policyId: "new-1",
        policy: { ...makeSidedPolicy("new-1"), name: "Renamed" },
      }),
    );
    expect(result.current.changes).toHaveLength(1);
    expect(result.current.changes[0]).toMatchObject({
      type: "create-policy",
      name: "Renamed",
    });
  });

  it("edits to a blank policy WITHOUT a create change are no-ops (stays out of changeset)", () => {
    const { result } = setup();
    act(() =>
      result.current.trackUpdatePolicy({
        policyId: "new-9",
        policy: makePolicy("new-9"),
      }),
    );
    expect(result.current.changes).toHaveLength(0);
  });

  it("a full edit of an existing policy supersedes earlier updates and toggles", () => {
    const { result } = setup();
    const policy = makeSidedPolicy("p1");
    act(() =>
      result.current.trackSetPolicyEnabled({
        policyId: "p1",
        name: "p1",
        enabled: false,
        originalEnabled: true,
        policy,
      }),
    );
    act(() =>
      result.current.trackUpdatePolicy({ policyId: "p1", policy }),
    );
    expect(result.current.changes).toHaveLength(1);
    expect(result.current.changes[0]).toMatchObject({
      type: "update-policy",
      origin: "edit",
    });
  });

  it("toggling an existing policy back to its live state removes the change", () => {
    const { result } = setup();
    const policy = makePolicy("p1");
    act(() =>
      result.current.trackSetPolicyEnabled({
        policyId: "p1",
        name: "p1",
        enabled: false,
        originalEnabled: true,
        policy,
      }),
    );
    expect(result.current.changes).toHaveLength(1);
    act(() =>
      result.current.trackSetPolicyEnabled({
        policyId: "p1",
        name: "p1",
        enabled: true,
        originalEnabled: true,
        policy,
      }),
    );
    expect(result.current.changes).toHaveLength(0);
  });

  it("deleting a draft-created policy just drops its create change", () => {
    const { result } = setup();
    act(() =>
      result.current.trackCreatePolicy({
        clientId: "new-1",
        policy: makePolicy("new-1"),
      }),
    );
    act(() =>
      result.current.trackDeletePolicy({ policyId: "new-1", name: "new-1" }),
    );
    expect(result.current.changes).toHaveLength(0);
  });

  // One bare side is enough: the API rejects such a rule and the deploy sink
  // asserts on isDeployablePolicy, so recording an update here produced a change
  // the deploy was guaranteed to refuse — mid-run, after earlier changes landed.
  it("an existing policy left with nothing on ONE side deploys as a delete", () => {
    const { result } = setup();
    act(() =>
      result.current.trackUpdatePolicy({
        policyId: "p1",
        policy: makeSidedPolicy("p1"),
      }),
    );
    act(() =>
      result.current.trackUpdatePolicy({
        policyId: "p1",
        // Its only source group is gone; the destination is untouched.
        policy: makePolicy("p1", { destinations: [{ name: "B" } as Group] }),
      }),
    );
    expect(result.current.changes).toEqual([
      expect.objectContaining({ type: "delete-policy", policyId: "p1" }),
    ]);
  });

  it("an existing policy left with nothing on either side deploys as a delete", () => {
    const { result } = setup();
    act(() =>
      result.current.trackUpdatePolicy({
        policyId: "p1",
        policy: makeSidedPolicy("p1"),
      }),
    );
    act(() =>
      result.current.trackUpdatePolicy({
        policyId: "p1",
        policy: makePolicy("p1"),
      }),
    );
    expect(result.current.changes).toHaveLength(1);
    expect(result.current.changes[0]).toMatchObject({
      type: "delete-policy",
      policyId: "p1",
    });
  });

  it("emptying a policy twice records one delete", () => {
    const { result } = setup();
    act(() =>
      result.current.trackUpdatePolicy({ policyId: "p1", policy: makePolicy("p1") }),
    );
    act(() =>
      result.current.trackUpdatePolicy({ policyId: "p1", policy: makePolicy("p1") }),
    );
    expect(result.current.changes).toHaveLength(1);
    expect(result.current.changes[0].type).toBe("delete-policy");
  });

  // update-policy deploys BEFORE delete-policy, so a policy carrying both is
  // written and then destroyed.
  it("rebuilding an emptied policy drops the delete instead of updating then deleting", () => {
    const { result } = setup();
    act(() =>
      result.current.trackUpdatePolicy({ policyId: "p1", policy: makePolicy("p1") }),
    );
    expect(result.current.changes[0].type).toBe("delete-policy");

    act(() =>
      result.current.trackUpdatePolicy({
        policyId: "p1",
        policy: makeSidedPolicy("p1"),
      }),
    );
    expect(result.current.changes).toEqual([
      expect.objectContaining({ type: "update-policy", policyId: "p1" }),
    ]);
  });

  it("deleting an emptied policy outright records ONE delete, not two", () => {
    const { result } = setup();
    act(() =>
      result.current.trackUpdatePolicy({ policyId: "p1", policy: makePolicy("p1") }),
    );
    // The node survives an emptying, so its menu still offers Delete.
    act(() => result.current.trackDeletePolicy({ policyId: "p1", name: "p1" }));

    expect(
      result.current.changes.filter((c) => c.type === "delete-policy"),
    ).toHaveLength(1);
  });

  it("a toggle cannot contradict a policy already marked for deletion", () => {
    const { result } = setup();
    act(() => result.current.trackDeletePolicy({ policyId: "p1", name: "p1" }));
    act(() =>
      result.current.trackSetPolicyEnabled({
        policyId: "p1",
        name: "p1",
        enabled: false,
        originalEnabled: true,
        policy: makeSidedPolicy("p1"),
      }),
    );
    expect(result.current.changes).toEqual([
      expect.objectContaining({ type: "delete-policy", policyId: "p1" }),
    ]);
  });

  it("emptying a DRAFT policy drops its create instead of recording a delete", () => {
    const { result } = setup();
    act(() =>
      result.current.trackCreatePolicy({
        clientId: "new-1",
        policy: makeSidedPolicy("new-1"),
      }),
    );
    act(() =>
      result.current.trackUpdatePolicy({
        policyId: "new-1",
        policy: makePolicy("new-1"),
      }),
    );
    expect(result.current.changes).toHaveLength(0);
  });

  it("deleting an existing policy supersedes its pending update", () => {
    const { result } = setup();
    act(() =>
      result.current.trackUpdatePolicy({
        policyId: "p1",
        policy: makeSidedPolicy("p1"),
      }),
    );
    act(() =>
      result.current.trackDeletePolicy({ policyId: "p1", name: "p1" }),
    );
    expect(result.current.changes).toHaveLength(1);
    expect(result.current.changes[0].type).toBe("delete-policy");
  });

  it("patchPendingPolicyUpdate records nothing for a policy without a pending edit", () => {
    const { result } = setup();
    act(() =>
      result.current.patchPendingPolicyUpdate({
        policyId: "p1",
        policy: makePolicy("p1", { sources: [{ name: "A" } as Group] }),
      }),
    );
    expect(result.current.changes).toHaveLength(0);
  });

  it("a deferred strip does not resurrect a change untracked in the same gesture", () => {
    const { result } = setup();
    act(() => {
      result.current.trackUpdatePolicy({
        policyId: "p1",
        policy: makeSidedPolicy("p1"),
      });
      result.current.trackCreateResource({
        clientId: "new-r1",
        name: "DB",
        address: "10.0.0.5",
        networkClientId: "new-n1",
        networkName: "Office",
        groupIds: [],
      });
    });
    // deferPolicyStrips runs updateDraftPolicy in a setTimeout, so the strip
    // lands through a context captured BEFORE the removal's own writes.
    const preRemoval = result.current;
    act(() => {
      result.current.untrackResource("new-r1");
      preRemoval.patchPendingPolicyUpdate({
        policyId: "p1",
        policy: makePolicy("p1", { sources: [{ name: "A" } as Group] }),
      });
    });
    expect(result.current.changes).toHaveLength(1);
    expect(result.current.changes[0]).toMatchObject({
      type: "update-policy",
      policyId: "p1",
      policy: { rules: [{ destinations: [] }] },
    });
  });

  it("two policies stripped in one gesture both keep their re-recorded edits", () => {
    const { result } = setup();
    act(() => {
      result.current.trackUpdatePolicy({
        policyId: "p1",
        policy: makeSidedPolicy("p1"),
      });
      result.current.trackUpdatePolicy({
        policyId: "p2",
        policy: makeSidedPolicy("p2"),
      });
    });
    const preRemoval = result.current;
    const stripped = (id: string) =>
      makePolicy(id, { destinations: [{ name: "B" } as Group] });
    act(() => {
      preRemoval.patchPendingPolicyUpdate({ policyId: "p1", policy: stripped("p1") });
      preRemoval.patchPendingPolicyUpdate({ policyId: "p2", policy: stripped("p2") });
    });
    const updates = result.current.changes.filter(
      (c) => c.type === "update-policy",
    );
    expect(updates).toHaveLength(2);
    updates.forEach((c) =>
      expect(c).toMatchObject({ policy: { rules: [{ sources: [] }] } }),
    );
  });
});

describe("network / resource / router changes", () => {
  const resourceParams = {
    clientId: "new-r1",
    name: "DB",
    address: "10.0.0.5",
    networkClientId: "new-n1",
    networkName: "Office",
    groupIds: [] as string[],
  };

  it("records networks and folds edits into the create change", () => {
    const { result } = setup();
    act(() =>
      result.current.trackCreateNetwork({ clientId: "new-n1", name: "Office" }),
    );
    act(() =>
      result.current.updateDraftNetwork({ clientId: "new-n1", name: "HQ" }),
    );
    expect(result.current.changes).toHaveLength(1);
    expect(result.current.changes[0]).toMatchObject({
      type: "create-network",
      name: "HQ",
    });
  });

  it("network renames follow into dependent resource/router labels", () => {
    const { result } = setup();
    act(() =>
      result.current.trackCreateNetwork({ clientId: "new-n1", name: "Office" }),
    );
    act(() => result.current.trackCreateResource(resourceParams));
    act(() =>
      result.current.trackCreateRouter({
        clientId: "new-x",
        networkClientId: "new-n1",
        networkName: "Office",
        peerId: "p1",
        peerName: "server-1",
      }),
    );
    act(() =>
      result.current.updateDraftNetwork({ clientId: "new-n1", name: "HQ" }),
    );
    const named = result.current.changes.filter(
      (c) => "networkName" in c && c.networkName === "HQ",
    );
    expect(named).toHaveLength(2);
  });

  it("resource edits upsert by clientId (one change per resource)", () => {
    const { result } = setup();
    act(() => result.current.trackCreateResource(resourceParams));
    act(() =>
      result.current.trackCreateResource({
        ...resourceParams,
        address: "10.0.0.9",
      }),
    );
    expect(result.current.changes).toHaveLength(1);
    expect(result.current.changes[0]).toMatchObject({ address: "10.0.0.9" });
  });

  it("routers dedup per (network, peer/group) pair", () => {
    const { result } = setup();
    const router = {
      clientId: "new-x",
      networkClientId: "new-n1",
      networkName: "Office",
      peerId: "p1",
    };
    act(() => result.current.trackCreateRouter(router));
    act(() => result.current.trackCreateRouter({ ...router, clientId: "new-y" }));
    expect(result.current.changes).toHaveLength(1);
  });

  it("removing a draft network detaches its resources and drops its routers", () => {
    const { result } = setup();
    act(() =>
      result.current.trackCreateNetwork({ clientId: "new-n1", name: "Office" }),
    );
    act(() => result.current.trackCreateResource(resourceParams));
    act(() =>
      result.current.trackCreateRouter({
        clientId: "new-x",
        networkClientId: "new-n1",
        networkName: "Office",
        peerId: "p1",
      }),
    );
    act(() => result.current.untrackNetwork("new-n1"));
    // The resource survives — a group-held one has no node of its own, so a
    // dropped create would vanish silently — and blocks as "No Network".
    expect(result.current.changes).toEqual([
      expect.objectContaining({
        type: "create-resource",
        networkClientId: undefined,
        networkId: undefined,
        networkName: "",
      }),
    ]);
    expect(
      getChangeIssue(result.current.changes[0], result.current.changes)?.label,
    ).toBe("No Network");
  });

  it("removing a draft resource drops it from group memberships too", () => {
    const { result } = setup();
    act(() =>
      result.current.trackCreateGroup({
        clientId: "group-new-1",
        name: "G",
        resourceIds: ["new-r1", "r-real"],
      }),
    );
    act(() => result.current.trackCreateResource(resourceParams));
    act(() => result.current.untrackResource("new-r1"));
    expect(result.current.changes).toHaveLength(1);
    expect(result.current.changes[0]).toMatchObject({
      type: "create-group",
      resourceIds: ["r-real"],
    });
  });

  it("addGroupToDraftResource adds group refs to the resource change", () => {
    const { result } = setup();
    act(() => result.current.trackCreateResource(resourceParams));
    act(() => result.current.addGroupToDraftResource("new-r1", "g-1"));
    act(() => result.current.addGroupToDraftResource("new-r1", "g-1"));
    expect(result.current.changes[0]).toMatchObject({ groupIds: ["g-1"] });
  });

  it("placeholder upgrade renames router peer ids", () => {
    const { result } = setup();
    act(() =>
      result.current.trackCreateRouter({
        clientId: "new-x",
        networkClientId: "new-n1",
        networkName: "Office",
        peerId: "draft-a",
        peerName: "Server",
      }),
    );
    act(() =>
      result.current.replacePeerIdInGroups("draft-a", "real-1", "server-1"),
    );
    expect(result.current.changes[0]).toMatchObject({
      peerId: "real-1",
      peerName: "server-1",
    });
  });

  it("group renames follow into resource groupIds and router group refs", () => {
    const { result } = setup();
    act(() =>
      result.current.trackCreateGroup({ clientId: "group-new-1", name: "G" }),
    );
    act(() =>
      result.current.trackCreateResource({
        ...resourceParams,
        groupIds: ["G"],
      }),
    );
    act(() =>
      result.current.trackCreateRouter({
        clientId: "new-x",
        networkClientId: "new-n1",
        networkName: "Office",
        groupId: "G",
        groupName: "G",
      }),
    );
    act(() => result.current.trackRenameGroup({ from: "G", to: "G2" }));
    expect(
      result.current.changes.find((c) => c.type === "create-resource"),
    ).toMatchObject({ groupIds: ["G2"] });
    expect(
      result.current.changes.find((c) => c.type === "create-router"),
    ).toMatchObject({ groupId: "G2", groupName: "G2" });
  });

  it("update-network coalesces per network id", () => {
    const { result } = setup();
    act(() =>
      result.current.trackUpdateNetwork({
        networkId: "n1",
        name: "HQ",
        originalName: "Office",
      }),
    );
    act(() =>
      result.current.trackUpdateNetwork({
        networkId: "n1",
        name: "HQ2",
        originalName: "Office",
        description: "desc",
      }),
    );
    expect(result.current.changes).toHaveLength(1);
    expect(result.current.changes[0]).toMatchObject({
      type: "update-network",
      networkId: "n1",
      name: "HQ2",
      description: "desc",
    });
  });

  it("update-network reverting to the live name + description drops the change", () => {
    const { result } = setup();
    act(() =>
      result.current.trackUpdateNetwork({
        networkId: "n1",
        name: "HQ",
        originalName: "Office",
      }),
    );
    expect(result.current.changes).toHaveLength(1);
    act(() =>
      result.current.trackUpdateNetwork({
        networkId: "n1",
        name: "Office",
        originalName: "Office",
      }),
    );
    expect(result.current.changes).toHaveLength(0);
  });

  it("update-router coalesces per router id (a later edit supersedes)", () => {
    const { result } = setup();
    act(() =>
      result.current.trackUpdateRouter({
        routerId: "r1",
        networkId: "n1",
        networkName: "Office",
        peerId: "p1",
        metric: 100,
      }),
    );
    act(() =>
      result.current.trackUpdateRouter({
        routerId: "r1",
        networkId: "n1",
        networkName: "Office",
        peerId: "p2",
        metric: 200,
      }),
    );
    expect(result.current.changes).toHaveLength(1);
    expect(result.current.changes[0]).toMatchObject({
      type: "update-router",
      routerId: "r1",
      peerId: "p2",
      metric: 200,
    });
  });

  const updateResourceParams = {
    resourceId: "r1",
    networkId: "n1",
    name: "DB",
    networkName: "Office",
    address: "10.0.0.5",
    enabled: true,
    groupIds: ["g1"],
  };

  it("update-resource reverting to the live state drops the change", () => {
    const { result } = setup();
    const original = {
      enabled: true,
      name: "DB",
      address: "10.0.0.5",
      groupIds: ["g1"],
    };
    act(() =>
      result.current.trackUpdateResource({
        ...updateResourceParams,
        enabled: false,
        original,
      }),
    );
    expect(result.current.changes).toHaveLength(1);
    act(() =>
      result.current.trackUpdateResource({
        ...updateResourceParams,
        enabled: true,
        original,
      }),
    );
    expect(result.current.changes).toHaveLength(0);
  });

  it("deleting a network drops its pending update-router / update-network", () => {
    const { result } = setup();
    act(() =>
      result.current.trackUpdateNetwork({
        networkId: "n1",
        name: "HQ",
        originalName: "Office",
      }),
    );
    act(() =>
      result.current.trackUpdateRouter({
        routerId: "rt1",
        networkId: "n1",
        networkName: "Office",
        peerId: "p1",
      }),
    );
    expect(result.current.changes).toHaveLength(2);
    act(() =>
      result.current.trackDeleteNetwork({ networkId: "n1", name: "Office" }),
    );
    expect(result.current.changes).toEqual([
      expect.objectContaining({ type: "delete-network", networkId: "n1" }),
    ]);
  });

  it("group renames also follow into update-resource / update-router", () => {
    const { result } = setup();
    act(() =>
      result.current.trackUpdateResource({
        ...updateResourceParams,
        groupIds: ["G"],
      }),
    );
    act(() =>
      result.current.trackUpdateRouter({
        routerId: "rt1",
        networkId: "n1",
        networkName: "Office",
        groupId: "G",
        groupName: "G",
      }),
    );
    act(() => result.current.trackRenameGroup({ from: "G", to: "G2" }));
    expect(
      result.current.changes.find((c) => c.type === "update-resource"),
    ).toMatchObject({ groupIds: ["G2"] });
    expect(
      result.current.changes.find((c) => c.type === "update-router"),
    ).toMatchObject({ groupId: "G2", groupName: "G2" });
  });
});

describe("canvas warnings", () => {
  const policyNode = (id: string, rule: Partial<Policy["rules"][number]>) => ({
    id: `policy-${id}`,
    type: "policyNode",
    data: { policy: makePolicy(id, rule) },
  });

  it("warns about a complete-looking policy referencing a placeholder peer", () => {
    const nodes = [
      policyNode("new-1", {
        sources: [{ id: "g1", name: "Ops" } as Group],
        destinationResource: { id: "draft-abc", type: "host" },
      }),
    ];
    const warnings = getCanvasWarnings(nodes, []);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("isn't installed yet");
  });

  it("stays silent for visibly incomplete policies", () => {
    const nodes = [
      policyNode("new-1", {
        destinationResource: { id: "draft-abc", type: "host" },
      }),
    ];
    expect(getCanvasWarnings(nodes, [])).toHaveLength(0);
  });

  it("warns about a standalone draft resource that never became trackable", () => {
    const nodes = [
      {
        id: "resource-new-1",
        type: "resourceNode",
        data: { resource: { name: "Internal API" } },
      },
    ];
    const warnings = getCanvasWarnings(nodes, []);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("no network assigned");
  });

  it("does not warn about a tracked draft resource", () => {
    const nodes = [
      {
        id: "resource-new-1",
        type: "resourceNode",
        data: { resource: { name: "Internal API" } },
      },
    ];
    const changes = [
      {
        id: "c1",
        type: "create-resource",
        clientId: "new-1",
        name: "Internal API",
        address: "10.0.0.1",
        networkName: "Net",
        groupIds: [],
      },
    ] as any;
    expect(getCanvasWarnings(nodes, changes)).toHaveLength(0);
  });

  it("warns about a policy referencing an untracked draft resource", () => {
    const nodes = [
      policyNode("new-1", {
        sources: [{ id: "g1", name: "Ops" } as Group],
        destinationResource: { id: "new-x", type: "host" },
      }),
    ];
    const warnings = getCanvasWarnings(nodes, []);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("resource without a network");
  });
});

describe("getChangeIssue / hasBlockingIssues", () => {
  const resourceChange = (net: {
    networkId?: string;
    networkClientId?: string;
    networkName?: string;
  }): DraftChange =>
    ({
      id: "c1",
      type: "create-resource",
      clientId: "new-1",
      name: "Internal API",
      address: "10.0.0.1",
      networkName: net.networkName ?? "",
      networkId: net.networkId,
      networkClientId: net.networkClientId,
      groupIds: [],
    }) as DraftChange;

  it("flags a create-resource with no network as a 'No Network' issue", () => {
    const issue = getChangeIssue(resourceChange({}), []);
    expect(issue?.label).toBe("No Network");
    expect(issue?.message).toContain("no network assigned");
  });

  it("has no issue once the resource has an API network id", () => {
    expect(getChangeIssue(resourceChange({ networkId: "net-1" }), [])).toBeUndefined();
  });

  it("has no issue for a draft-network (client id) resource", () => {
    expect(
      getChangeIssue(resourceChange({ networkClientId: "new-net" }), []),
    ).toBeUndefined();
  });

  it("flags an update-policy whose policy lost a side as Incomplete", () => {
    const emptied: DraftChange = {
      id: "up1",
      type: "update-policy",
      policyId: "p1",
      name: "P",
      origin: "edit",
      policy: makePolicy("p1", { sources: [{ name: "A" } as Group] }),
    };
    const issue = getChangeIssue(emptied, [emptied]);
    expect(issue?.label).toBe("Incomplete");
    expect(hasBlockingIssues([emptied])).toBe(true);
  });

  it("leaves a two-sided update-policy without an issue", () => {
    const complete: DraftChange = {
      id: "up2",
      type: "update-policy",
      policyId: "p1",
      name: "P",
      origin: "edit",
      policy: makeSidedPolicy("p1"),
    };
    expect(getChangeIssue(complete, [complete])).toBeUndefined();
  });

  it("flags an uninstalled placeholder peer as an 'Install' issue", () => {
    const server = {
      id: "i1",
      type: "install-peer",
      clientId: "draft-1",
      name: "Server",
      kind: "server",
    } as DraftChange;
    const issue = getChangeIssue(server, [server]);
    expect(issue?.label).toBe("Install");
    expect(issue?.message).toContain("must be installed");
    expect(hasBlockingIssues([server])).toBe(true);
  });

  it("an installed placeholder peer carries no issue and doesn't block", () => {
    const installed = {
      id: "i1",
      type: "install-peer",
      clientId: "draft-1",
      name: "Server",
      kind: "server",
      setupKeyId: "sk-1",
      installedPeerId: "peer-1",
    } as DraftChange;
    expect(getChangeIssue(installed, [installed])).toBeUndefined();
    expect(hasBlockingIssues([installed])).toBe(false);
  });

  it("markInstallPeerInstalled keeps the entry and adopts the real peer", () => {
    const { result } = setup();
    act(() =>
      result.current.trackInstallPeer({
        clientId: "draft-1",
        name: "Server",
        kind: "server",
      }),
    );
    act(() =>
      result.current.markInstallPeerInstalled("draft-1", {
        id: "peer-1",
        name: "server-01",
      }),
    );

    expect(result.current.changes).toHaveLength(1);
    expect(result.current.changes[0]).toMatchObject({
      type: "install-peer",
      clientId: "draft-1",
      installedPeerId: "peer-1",
      name: "server-01",
    });
    expect(hasBlockingIssues(result.current.changes)).toBe(false);
  });

  it("hasBlockingIssues is true when any change carries an issue", () => {
    expect(hasBlockingIssues([resourceChange({ networkId: "net-1" })])).toBe(
      false,
    );
    expect(
      hasBlockingIssues([
        resourceChange({ networkId: "net-1" }),
        resourceChange({}),
      ]),
    ).toBe(true);
  });
});

// The second deletion's write SUPERSEDES the first one's, so unless the tags
// accumulate the first group's id disappears from the changeset and the deploy strips a
// group whose deletion the user cancelled.
describe("sequential group deletions keep every restore tag", () => {
  const ops = { id: "g1", name: "Ops" } as Group;
  const dev = { id: "g2", name: "Dev" } as Group;
  const prod = { id: "g3", name: "Prod" } as Group;
  const sourced = (sources: Group[]) =>
    makePolicy("p1", { sources, destinations: [prod] });

  // What deleteGroups records for two deletions performed one after the other.
  const deleteBoth = (result: { current: ReturnType<typeof useDraftChangeset> }) => {
    act(() =>
      result.current.trackUpdatePolicy({
        policyId: "p1",
        policy: sourced([dev]),
        groupDeletion: { groupIds: ["g1"], basePolicy: sourced([ops, dev]) },
      }),
    );
    act(() => result.current.trackDeleteGroup({ groupId: "g1", name: "Ops" }));
    // The second pass reads the CANVAS policy, which the first deletion already
    // stripped — so this baseline no longer holds Ops.
    act(() =>
      result.current.trackUpdatePolicy({
        policyId: "p1",
        policy: sourced([]),
        groupDeletion: { groupIds: ["g2"], basePolicy: sourced([dev]) },
      }),
    );
    act(() => result.current.trackDeleteGroup({ groupId: "g2", name: "Dev" }));
  };

  const policyWrite = (changes: DraftChange[]) =>
    changes.find((c) => c.type === "update-policy" || c.type === "delete-policy");

  it("unions the stripped ids and keeps the EARLIEST baseline", () => {
    const { result } = setup();
    deleteBoth(result);

    const write = policyWrite(result.current.changes);
    const tag = write && "groupDeletion" in write ? write.groupDeletion : undefined;
    expect(tag?.groupIds).toEqual(["g1", "g2"]);
    expect(tag?.basePolicy.rules?.[0].sources).toEqual([ops, dev]);
  });

  it("puts the first group back when its deletion is discarded", () => {
    const { result } = setup();
    deleteBoth(result);

    const target = result.current.changes.find(
      (c) => c.type === "delete-group" && c.groupId === "g1",
    )!;
    const next = reduceRemoveChange(result.current.changes, target);

    const write = policyWrite(next);
    expect(write?.type).toBe("update-policy");
    expect(
      write?.type === "update-policy" && write.policy.rules?.[0].sources,
    ).toEqual([ops]);
    expect(next.filter((c) => c.type === "delete-group")).toHaveLength(1);
  });

  // Clearing the tag here is what let a cancelled deletion still deploy: the edit is
  // computed from the already-stripped canvas, so the strip survives inside it.
  it("rebases the tag onto a hand edit instead of clearing it", () => {
    const { result } = setup();
    deleteBoth(result);
    // No groupDeletion: this write is the user's, not the deletion's.
    act(() =>
      result.current.trackUpdatePolicy({
        policyId: "p1",
        policy: sourced([prod]),
      }),
    );

    const write = policyWrite(result.current.changes);
    const tag = write && "groupDeletion" in write ? write.groupDeletion : undefined;
    expect(tag?.groupIds).toEqual(["g1", "g2"]);
    expect(tag?.handEdited).toBe(true);
    // The new baseline is the EDIT with both stripped groups put back, so a
    // discard can restore them without reverting the edit.
    expect(tag?.basePolicy.rules?.[0].sources).toEqual([prod, ops, dev]);
  });

  it("restores a group into the hand edit rather than over it", () => {
    const { result } = setup();
    deleteBoth(result);
    act(() =>
      result.current.trackUpdatePolicy({
        policyId: "p1",
        policy: sourced([prod]),
      }),
    );

    const target = result.current.changes.find(
      (c) => c.type === "delete-group" && c.groupId === "g1",
    )!;
    const next = reduceRemoveChange(result.current.changes, target);

    const write = policyWrite(next);
    expect(write?.type).toBe("update-policy");
    expect(
      write?.type === "update-policy" && write.policy.rules?.[0].sources,
    ).toEqual([prod, ops]);
  });

  it("keeps a hand-edited write alive when the LAST deletion is discarded", () => {
    const { result } = setup();
    deleteBoth(result);
    act(() =>
      result.current.trackUpdatePolicy({
        policyId: "p1",
        policy: sourced([prod]),
      }),
    );

    let changes = result.current.changes;
    for (const groupId of ["g1", "g2"]) {
      const target = changes.find(
        (c) => c.type === "delete-group" && c.groupId === groupId,
      )!;
      changes = reduceRemoveChange(changes, target);
    }

    // Untagged, the write would have been dropped with the last deletion and the edit lost.
    const write = policyWrite(changes);
    expect(write?.type).toBe("update-policy");
    expect(
      write?.type === "update-policy" && write.policy.rules?.[0].sources,
    ).toEqual([prod, ops, dev]);
    expect(write && "groupDeletion" in write && write.groupDeletion).toBeUndefined();
  });
});

// `handEdited` used to be set only when the edit came AFTER a deletion. In this order
// the deletion's write supersedes the edit, so the tag arrives as `incoming` with no
// earlier tag to inherit the flag from, and the discard dropped the user's edit.
describe("a hand edit made BEFORE a group deletion", () => {
  const ops = { id: "g1", name: "Ops" } as Group;
  const dev = { id: "g2", name: "Dev" } as Group;
  const prod = { id: "g3", name: "Prod" } as Group;
  const named = (name: string, sources: Group[]) => ({
    ...makePolicy("p1", { sources, destinations: [prod] }),
    name,
  });

  const editThenDelete = (result: {
    current: ReturnType<typeof useDraftChangeset>;
  }) => {
    // The user's own edit: a rename, with no deletion pending.
    act(() =>
      result.current.trackUpdatePolicy({
        policyId: "p1",
        policy: named("P renamed", [ops, dev]),
      }),
    );
    // deleteGroups reads the CANVAS policy, which already carries the rename.
    act(() =>
      result.current.trackUpdatePolicy({
        policyId: "p1",
        policy: named("P renamed", [dev]),
        groupDeletion: {
          groupIds: ["g1"],
          basePolicy: named("P renamed", [ops, dev]),
        },
      }),
    );
    act(() => result.current.trackDeleteGroup({ groupId: "g1", name: "Ops" }));
  };

  it("marks the deletion's write as carrying the user's own work", () => {
    const { result } = setup();
    editThenDelete(result);

    const write = result.current.changes.find(
      (c) => c.type === "update-policy",
    );
    const tag = write && "groupDeletion" in write ? write.groupDeletion : undefined;
    expect(tag?.groupIds).toEqual(["g1"]);
    expect(tag?.handEdited).toBe(true);
  });

  it("keeps the edit when the deletion is discarded", () => {
    const { result } = setup();
    editThenDelete(result);

    const target = result.current.changes.find(
      (c) => c.type === "delete-group",
    )!;
    const next = reduceRemoveChange(result.current.changes, target);

    const write = next.find((c) => c.type === "update-policy");
    expect(write?.type === "update-policy" && write.policy.name).toBe(
      "P renamed",
    );
    expect(
      write?.type === "update-policy" && write.policy.rules?.[0].sources,
    ).toEqual([ops, dev]);
    expect(
      write && "groupDeletion" in write && write.groupDeletion,
    ).toBeUndefined();
  });
});

// A draft policy is stripped by a group deletion too, since its create-policy deploys
// BEFORE the delete-group. The tag used to be dropped on the way in and, when the strip
// left the policy bare, so was the whole change — leaving nothing to restore.
describe("a group deletion that strips a DRAFT policy", () => {
  const ops = { id: "g1", name: "Ops" } as Group;
  const dev = { id: "g2", name: "Dev" } as Group;
  const prod = { id: "g3", name: "Prod" } as Group;
  const draft = (sources: Group[]) => ({
    ...makePolicy("new-abc", { sources, destinations: [prod] }),
    name: "New Policy",
  });

  // What deleteGroups records for a draft policy: the strip, tagged with the
  // pre-strip policy it was computed from.
  const deleteOps = (
    result: { current: ReturnType<typeof useDraftChangeset> },
    before: Group[],
  ) => {
    act(() =>
      result.current.trackUpdatePolicy({
        policyId: "new-abc",
        policy: draft(before.filter((g) => g.id !== "g1")),
        groupDeletion: { groupIds: ["g1"], basePolicy: draft(before) },
      }),
    );
    act(() => result.current.trackDeleteGroup({ groupId: "g1", name: "Ops" }));
  };

  const createPolicy = (changes: DraftChange[]) =>
    changes.find((c) => c.type === "create-policy");

  it("restores the group when the deletion is discarded", () => {
    const { result } = setup();
    act(() =>
      result.current.trackCreatePolicy({
        clientId: "new-abc",
        policy: draft([ops, dev]),
      }),
    );
    deleteOps(result, [ops, dev]);

    const stripped = createPolicy(result.current.changes);
    expect(
      stripped?.type === "create-policy" && stripped.policy.rules?.[0].sources,
    ).toEqual([dev]);

    const target = result.current.changes.find(
      (c) => c.type === "delete-group",
    )!;
    const restored = createPolicy(
      reduceRemoveChange(result.current.changes, target),
    );
    expect(
      restored?.type === "create-policy" && restored.policy.rules?.[0].sources,
    ).toEqual([ops, dev]);
    expect(
      restored && "groupDeletion" in restored && restored.groupDeletion,
    ).toBeUndefined();
  });

  it("keeps the change — blocked, not dropped — when the strip empties it", () => {
    const { result } = setup();
    act(() =>
      result.current.trackCreatePolicy({
        clientId: "new-abc",
        policy: draft([ops]),
      }),
    );
    deleteOps(result, [ops]);

    // Dropping it here is what stranded the strip: nothing restores a change
    // that is no longer in the changeset.
    const stripped = createPolicy(result.current.changes);
    expect(stripped).toBeDefined();
    // ...and it must not reach the deploy in that state.
    expect(getChangeIssue(stripped!, result.current.changes)?.label).toBe(
      "Incomplete",
    );
    expect(hasBlockingIssues(result.current.changes)).toBe(true);

    const target = result.current.changes.find(
      (c) => c.type === "delete-group",
    )!;
    const restored = createPolicy(
      reduceRemoveChange(result.current.changes, target),
    );
    expect(
      restored?.type === "create-policy" && restored.policy.rules?.[0].sources,
    ).toEqual([ops]);
    expect(
      getChangeIssue(restored!, reduceRemoveChange(result.current.changes, target)),
    ).toBeUndefined();
  });

  it("still drops a draft policy the USER empties, as a request to remove it", () => {
    const { result } = setup();
    act(() =>
      result.current.trackCreatePolicy({
        clientId: "new-abc",
        policy: draft([ops]),
      }),
    );
    // No groupDeletion: this is the user clearing the sources themselves.
    act(() =>
      result.current.trackUpdatePolicy({
        policyId: "new-abc",
        policy: draft([]),
      }),
    );
    expect(createPolicy(result.current.changes)).toBeUndefined();
  });
});

// F2: only POLICIES are stripped when a group is deleted — the API refuses the group
// DELETE for a referencing resource or router just the same. Blocked rather than
// stripped: a resource may have no other group, and only the user can decide which to give up.
describe("a change naming a group marked for deletion", () => {
  const deleteGroup: DraftChange = {
    id: "dg",
    type: "delete-group",
    groupId: "g-servers",
    name: "Servers",
  };
  const resource = (groupIds: string[]): DraftChange => ({
    id: "cr",
    type: "create-resource",
    clientId: "new-1",
    name: "DB",
    address: "10.0.0.5/32",
    networkId: "net-A",
    networkName: "Net A",
    groupIds,
  });
  const router = (groupId?: string): DraftChange => ({
    id: "rt",
    type: "create-router",
    clientId: "new-2",
    networkId: "net-A",
    networkName: "Net A",
    groupId,
    groupName: "Servers",
  });

  it("blocks a create-resource that still names it", () => {
    const changes = [resource(["g-servers"]), deleteGroup];
    const issue = getChangeIssue(changes[0], changes);
    expect(issue?.label).toBe("Group deleted");
    expect(issue?.message).toContain("“Servers”");
    expect(issue?.message).toContain("DB");
    expect(hasBlockingIssues(changes)).toBe(true);
  });

  it("blocks an update-resource the same way", () => {
    const update: DraftChange = {
      id: "ur",
      type: "update-resource",
      resourceId: "r-1",
      networkId: "net-A",
      name: "DB",
      networkName: "Net A",
      address: "10.0.0.5/32",
      enabled: true,
      groupIds: ["g-servers"],
    };
    const changes = [update, deleteGroup];
    expect(getChangeIssue(update, changes)?.label).toBe("Group deleted");
  });

  it("blocks a routing peer whose group is the doomed one", () => {
    const changes = [router("g-servers"), deleteGroup];
    const issue = getChangeIssue(changes[0], changes);
    expect(issue?.label).toBe("Group deleted");
    expect(issue?.message).toContain("Net A");
  });

  it("leaves a resource naming a DIFFERENT group alone", () => {
    const changes = [resource(["g-other"]), deleteGroup];
    expect(getChangeIssue(changes[0], changes)).toBeUndefined();
    expect(hasBlockingIssues(changes)).toBe(false);
  });

  it("leaves a peer-based routing peer alone: it names no group", () => {
    const changes = [router(undefined), deleteGroup];
    expect(getChangeIssue(changes[0], changes)).toBeUndefined();
  });

  it("clears once the group deletion is discarded", () => {
    const withDeletion = [resource(["g-servers"]), deleteGroup];
    expect(hasBlockingIssues(withDeletion)).toBe(true);
    const without = withDeletion.filter((c) => c.type !== "delete-group");
    expect(hasBlockingIssues(without)).toBe(false);
  });

  // The row has no fix of its own — the offending group lives on ANOTHER change — so
  // Review & Deploy must not offer its resolve button, which opened the network picker.
  it("is not resolvable from the row itself", () => {
    const changes = [resource(["g-servers"]), deleteGroup];
    expect(getChangeIssue(changes[0], changes)?.resolvable).toBeFalsy();
  });

  // The deletion blocks it, so the No Network issue must not mask it either way round:
  // both are blocking, and whichever reports first still stops the deploy.
  it("still blocks a resource that ALSO has no network", () => {
    const orphan = { ...resource(["g-servers"]), networkId: undefined };
    const changes = [orphan as DraftChange, deleteGroup];
    expect(hasBlockingIssues(changes)).toBe(true);
  });
});

// F3: removing a placeholder REVOKES its setup key, and undo restores the node and the
// changeset from a snapshot taken before that. The row came back marked Waiting on a key
// the API would refuse, so it waited forever on a registration that could never arrive.
describe("clearInstallPeerKey", () => {
  const install = (over: Partial<InstallPeerChange> = {}) => ({
    clientId: "draft-1",
    name: "Server",
    kind: "server" as const,
    ...over,
  });

  it("takes a Waiting row back to Install so a new key can be generated", () => {
    const { result } = setup();
    act(() => result.current.trackInstallPeer(install()));
    act(() => result.current.markInstallPeerWaiting("draft-1", "sk-1"));

    const waiting = result.current.changes[0];
    expect(getChangeIssue(waiting, result.current.changes)?.label).toBe(
      "Waiting",
    );

    act(() => result.current.clearInstallPeerKey("draft-1"));

    const cleared = result.current.changes[0];
    expect((cleared as InstallPeerChange).setupKeyId).toBeUndefined();
    expect(getChangeIssue(cleared, result.current.changes)?.label).toBe(
      "Install",
    );
    // Still blocking: the peer is no closer to being installed.
    expect(hasBlockingIssues(result.current.changes)).toBe(true);
  });

  it("keeps the entry itself, so an open modal doesn't empty under the user", () => {
    const { result } = setup();
    act(() => result.current.trackInstallPeer(install()));
    act(() => result.current.markInstallPeerWaiting("draft-1", "sk-1"));
    act(() => result.current.clearInstallPeerKey("draft-1"));

    expect(result.current.changes).toHaveLength(1);
    expect(result.current.changes[0].type).toBe("install-peer");
  });

  it("leaves other placeholders untouched", () => {
    const { result } = setup();
    act(() => result.current.trackInstallPeer(install()));
    act(() =>
      result.current.trackInstallPeer(install({ clientId: "draft-2" })),
    );
    act(() => result.current.markInstallPeerWaiting("draft-1", "sk-1"));
    act(() => result.current.markInstallPeerWaiting("draft-2", "sk-2"));

    act(() => result.current.clearInstallPeerKey("draft-1"));

    const byId = (id: string) =>
      result.current.changes.find(
        (c): c is InstallPeerChange =>
          c.type === "install-peer" && c.clientId === id,
      );
    expect(byId("draft-1")?.setupKeyId).toBeUndefined();
    expect(byId("draft-2")?.setupKeyId).toBe("sk-2");
  });

  it("is a no-op for a placeholder that never had a key", () => {
    const { result } = setup();
    act(() => result.current.trackInstallPeer(install()));
    const before = result.current.changes;
    act(() => result.current.clearInstallPeerKey("draft-1"));
    expect(result.current.changes).toBe(before);
  });
});
