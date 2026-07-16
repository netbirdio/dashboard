import { act, renderHook } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { Group } from "@/interfaces/Group";
import { Policy } from "@/interfaces/Policy";
import {
  DraftChangesetProvider,
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

beforeEach(() => window.localStorage.clear());

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

  it("deleting a draft-only group just drops its create change", () => {
    const { result } = setup();
    act(() =>
      result.current.trackCreateGroup({ clientId: "group-new-1", name: "G" }),
    );
    act(() => result.current.trackDeleteGroup({ name: "G" }));
    expect(result.current.changes).toHaveLength(0);
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

describe("policy changes", () => {
  it("edits to a draft-created policy fold into its create change", () => {
    const { result } = setup();
    act(() =>
      result.current.trackCreatePolicy({
        clientId: "new-1",
        policy: makePolicy("new-1"),
      }),
    );
    act(() =>
      result.current.trackUpdatePolicy({
        policyId: "new-1",
        policy: { ...makePolicy("new-1"), name: "Renamed" },
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

  it("deleting an existing policy supersedes its pending update", () => {
    const { result } = setup();
    act(() =>
      result.current.trackUpdatePolicy({
        policyId: "p1",
        policy: makePolicy("p1"),
      }),
    );
    act(() =>
      result.current.trackDeletePolicy({ policyId: "p1", name: "p1" }),
    );
    expect(result.current.changes).toHaveLength(1);
    expect(result.current.changes[0].type).toBe("delete-policy");
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

  it("removing a draft network cascades to its resources and routers", () => {
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
    expect(result.current.changes).toHaveLength(0);
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
});
