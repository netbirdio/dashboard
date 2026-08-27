import { renderHook } from "@testing-library/react";
import { Node } from "@xyflow/react";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

let nodes: Node[] = [];
// Group strips are decided by the edges, so they are part of the fixture.
let edges: { id: string; source: string; target: string }[] = [];
let livePolicies: unknown[] = [];
let pendingChanges: unknown[] = [];
const untrackInstallPeer = vi.fn();
const untrackNewGroup = vi.fn();
const updateDraftPolicy = vi.fn();
const registerArtifacts = vi.fn();
const revokeSetupKey = vi.fn();
const trackRemoveGroupMembers = vi.fn();
const trackDeleteGroup = vi.fn();
const trackUpdatePolicy = vi.fn();
// The Delete confirmation is the only place the user is told what a group
// deletion will take with it, so its wording is under test.
let confirmAnswer = true;
const confirm = vi.fn(
  async (_opts: { title?: string; description?: string }) => confirmAnswer,
);

// utils/nodes pulls in every node component and, through them, the API layer,
// which calls loadConfig() at module scope.
vi.mock("@utils/config", () => ({
  default: () => ({ apiOrigin: "http://localhost", redirectURI: "/" }),
}));
vi.mock("@xyflow/react", () => ({
  useReactFlow: () => ({
    getNodes: () => nodes,
    getEdges: () => edges,
    setNodes: () => {},
    setEdges: () => {},
  }),
}));
vi.mock("@/contexts/DialogProvider", () => ({
  useDialog: () => ({ confirm }),
}));
vi.mock("@/modules/control-center/contexts/ControlCenterContext", () => ({
  useCanvasState: () => ({
    setNodes: (fn: (n: Node[]) => Node[]) => {
      nodes = typeof fn === "function" ? fn(nodes) : fn;
    },
    setEdges: () => {},
    setSelectedDestinationGroup: () => {},
  }),
}));
vi.mock("@/modules/control-center/contexts/ControlCenterPolicyModals", () => ({
  useControlCenterPolicy: () => ({ updateDraftPolicy }),
}));
vi.mock("@/modules/control-center/hooks/useControlCenterData", () => ({
  useControlCenterData: () => ({ groups: [], policies: livePolicies }),
}));
vi.mock("@/modules/control-center/hooks/usePlaceholderArtifacts", () => ({
  usePlaceholderArtifacts: () => ({ registerArtifacts, revokeSetupKey }),
}));
vi.mock("@/modules/control-center/draft/DraftChangesetContext", async () => {
  const actual = await vi.importActual<
    typeof import("@/modules/control-center/draft/DraftChangesetContext")
  >("@/modules/control-center/draft/DraftChangesetContext");
  return {
    ...actual,
    useDraftChangeset: () => ({
      changes: pendingChanges,
      trackCreateGroup: vi.fn(),
      trackRenameGroup: vi.fn(),
      trackDeleteGroup,
      trackUpdatePolicy,
      trackRemoveGroupMembers,
      removeGroupFromDraftResource: vi.fn(),
      untrackNewGroup,
      untrackNetwork: vi.fn(),
      untrackResource: vi.fn(),
      untrackInstallPeer,
    }),
  };
});

const { useDraftGroupActions } = await import(
  "@/modules/control-center/hooks/useDraftGroupActions"
);

const holderGroupNode = () =>
  ({
    id: "group-g1",
    type: "groupNode",
    position: { x: 0, y: 0 },
    data: {
      group: { id: "g1", name: "Servers" },
      draftPeers: [
        { id: "draft-a", name: "Server", setupKeyId: "k-a", boundGroupId: "bg-a" },
        { id: "draft-b", name: "Server 2", setupKeyId: "k-b" },
      ],
      addedMembers: new Set(["draft-a", "draft-b", "peer-real"]),
    },
  }) as unknown as Node;

beforeEach(() => {
  untrackInstallPeer.mockClear();
  untrackNewGroup.mockClear();
  updateDraftPolicy.mockClear();
  registerArtifacts.mockClear();
  revokeSetupKey.mockClear();
  livePolicies = [];
  pendingChanges = [];
  edges = [];
  trackRemoveGroupMembers.mockClear();
  trackDeleteGroup.mockClear();
  trackUpdatePolicy.mockClear();
  confirm.mockClear();
  confirmAnswer = true;
  nodes = [holderGroupNode()];
});

// deferPolicyStrips applies a beat after the removal lands on the canvas.
const flushStrips = () => act(() => new Promise((r) => setTimeout(r, 0)));

describe("removing a placeholder absorbed into a group", () => {
  it("drops its install-peer entry instead of doing nothing", () => {
    const { result } = renderHook(() => useDraftGroupActions());
    act(() => result.current.removeNodeWithEdges("peer-draft-a"));

    expect(untrackInstallPeer).toHaveBeenCalledWith("draft-a");
  });

  it("hands its setup key and bound group to the teardown registry", () => {
    const { result } = renderHook(() => useDraftGroupActions());
    act(() => result.current.removeNodeWithEdges("peer-draft-a"));

    expect(registerArtifacts).toHaveBeenCalledWith("draft-a", {
      setupKeyId: "k-a",
      boundGroupId: "bg-a",
    });
  });

  it("reverts the group membership it was absorbed into", () => {
    const { result } = renderHook(() => useDraftGroupActions());
    act(() => result.current.removeNodeWithEdges("peer-draft-a"));

    expect(trackRemoveGroupMembers).toHaveBeenCalledWith({
      groupId: "g1",
      groupName: "Servers",
      peerIds: ["draft-a"],
      pendingOnly: true,
    });
  });

  it("takes it off the holder without disturbing the others", () => {
    const { result } = renderHook(() => useDraftGroupActions());
    act(() => result.current.removeNodeWithEdges("peer-draft-a"));

    const data = nodes[0].data as {
      draftPeers: { id: string }[];
      addedMembers: Set<string>;
    };
    expect(data.draftPeers.map((p) => p.id)).toEqual(["draft-b"]);
    expect(Array.from(data.addedMembers)).toEqual(["draft-b", "peer-real"]);
  });

  // The holding group can be gone (deleted with the placeholder absorbed); the
  // change must still be removable or its Install issue blocks the deploy forever.
  it("still drops the install-peer entry when no group holds it anymore", () => {
    const { result } = renderHook(() => useDraftGroupActions());
    act(() => result.current.removeNodeWithEdges("peer-draft-zz"));

    expect(untrackInstallPeer).toHaveBeenCalledWith("draft-zz");
    expect(trackRemoveGroupMembers).not.toHaveBeenCalled();
  });
});

describe("removing a placeholder that still has its own node", () => {
  it("defers the artifact teardown rather than deleting it, so undo is safe", () => {
    nodes = [
      {
        id: "peer-draft-c",
        type: "peerNode",
        position: { x: 0, y: 0 },
        data: {
          placeholderKind: "server",
          setupKeyId: "k-c",
          boundGroupId: "bg-c",
        },
      } as unknown as Node,
    ];
    const { result } = renderHook(() => useDraftGroupActions());
    act(() => result.current.removeNodeWithEdges("peer-draft-c"));

    expect(untrackInstallPeer).toHaveBeenCalledWith("draft-c");
    expect(registerArtifacts).toHaveBeenCalledWith("draft-c", {
      setupKeyId: "k-c",
      boundGroupId: "bg-c",
    });
  });
});

// A group deletion that leaves a policy authorizing nothing deletes that policy
// too. The user consented to groups, so the escalation has to be in the ask.
describe("the group Delete confirmation states the real blast radius", () => {
  const groupNode = (id: string, name: string) =>
    ({
      id: `group-${id}`,
      type: "groupNode",
      position: { x: 0, y: 0 },
      data: { group: { id, name } },
    }) as unknown as Node;

  const policyNode = (
    name: string,
    sources: unknown[],
    destinations: unknown[],
  ) =>
    ({
      id: `policy-${name}`,
      type: "policyNode",
      position: { x: 0, y: 0 },
      data: {
        policy: {
          id: name,
          name,
          enabled: true,
          rules: [{ name, enabled: true, sources, destinations }],
        },
      },
    }) as unknown as Node;

  const description = () => confirm.mock.calls[0][0].description ?? "";

  it("names the policy a self-referencing group takes with it", async () => {
    const ops = { id: "g1", name: "Ops" };
    nodes = [groupNode("g1", "Ops"), policyNode("Self", [ops], [ops])];
    const { result } = renderHook(() => useDraftGroupActions());

    await act(async () => {
      await result.current.confirmAndDeleteGroups([nodes[0]]);
    });

    expect(description()).toContain("also deletes the policy “Self”");
  });

  // Losing the last group on ONE side is enough: the rule then authorizes nothing
  // and the API rejects it, so the policy is deleted. Staying silent here left the
  // user consenting to a group deletion and the deploy dying on assertDeployable.
  it("names a policy whose only source group is going", async () => {
    const ops = { id: "g1", name: "Ops" };
    const dev = { id: "g2", name: "Dev" };
    nodes = [groupNode("g1", "Ops"), policyNode("OnlySource", [ops], [dev])];
    const { result } = renderHook(() => useDraftGroupActions());

    await act(async () => {
      await result.current.confirmAndDeleteGroups([nodes[0]]);
    });

    expect(description()).toContain("also deletes the policy “OnlySource”");
  });

  it("stays silent when the policy keeps a group on EACH side", async () => {
    const ops = { id: "g1", name: "Ops" };
    const qa = { id: "g4", name: "QA" };
    const dev = { id: "g2", name: "Dev" };
    nodes = [groupNode("g1", "Ops"), policyNode("Kept", [ops, qa], [dev])];
    const { result } = renderHook(() => useDraftGroupActions());

    await act(async () => {
      await result.current.confirmAndDeleteGroups([nodes[0]]);
    });

    expect(description()).not.toContain("policy");
  });

  it("nothing is tracked when the user declines the wider deletion", async () => {
    const ops = { id: "g1", name: "Ops" };
    nodes = [groupNode("g1", "Ops"), policyNode("Self", [ops], [ops])];
    confirmAnswer = false;
    const { result } = renderHook(() => useDraftGroupActions());

    await act(async () => {
      await result.current.confirmAndDeleteGroups([nodes[0]]);
    });

    expect(trackDeleteGroup).not.toHaveBeenCalled();
    expect(trackUpdatePolicy).not.toHaveBeenCalled();
  });
});

// The strip used to be measured off the CANVAS alone. A blank draft draws no policies
// and a group dragged in from the components panel arrives without them, so a live
// policy naming the group kept it and the API refused the group DELETE.
describe("a group deletion measured against policies that aren't drawn", () => {
  const groupNode = (id: string, name: string) =>
    ({
      id: `group-${id}`,
      type: "groupNode",
      position: { x: 0, y: 0 },
      data: { group: { id, name } },
    }) as unknown as Node;

  const livePolicy = (
    id: string,
    sources: unknown[],
    destinations: unknown[],
  ) => ({
    id,
    name: id,
    enabled: true,
    rules: [{ name: id, enabled: true, sources, destinations }],
  });

  const ops = { id: "g1", name: "Ops" };
  const dev = { id: "g2", name: "Dev" };
  const qa = { id: "g4", name: "QA" };

  it("records the strip for a live policy with no canvas node", async () => {
    // The blank-draft canvas: the dragged-in group and nothing else.
    nodes = [groupNode("g1", "Ops")];
    livePolicies = [livePolicy("OffCanvas", [ops, qa], [dev])];
    const { result } = renderHook(() => useDraftGroupActions());

    await act(async () => {
      await result.current.confirmAndDeleteGroups([nodes[0]]);
    });

    expect(trackUpdatePolicy).toHaveBeenCalledTimes(1);
    const call = trackUpdatePolicy.mock.calls[0][0];
    expect(call.policyId).toBe("OffCanvas");
    expect(call.policy.rules[0].sources).toEqual([qa]);
    expect(call.groupDeletion.groupIds).toEqual(["g1"]);
  });

  it("warns about a live policy the deletion would leave authorizing nothing", async () => {
    nodes = [groupNode("g1", "Ops")];
    livePolicies = [livePolicy("OnlySource", [ops], [dev])];
    const { result } = renderHook(() => useDraftGroupActions());

    await act(async () => {
      await result.current.confirmAndDeleteGroups([nodes[0]]);
    });

    expect(confirm.mock.calls[0][0].description ?? "").toContain(
      "also deletes the policy “OnlySource”",
    );
  });

  it("prefers the canvas copy, which carries pending draft edits", async () => {
    // Live still has Ops on both sides; the canvas copy was already edited to
    // drop it from the destinations. Only the canvas copy is the truth here.
    nodes = [
      groupNode("g1", "Ops"),
      {
        id: "policy-Edited",
        type: "policyNode",
        position: { x: 0, y: 0 },
        data: { policy: livePolicy("Edited", [ops, qa], [dev]) },
      } as unknown as Node,
    ];
    livePolicies = [livePolicy("Edited", [ops, qa], [ops, dev])];
    const { result } = renderHook(() => useDraftGroupActions());

    await act(async () => {
      await result.current.confirmAndDeleteGroups([nodes[0]]);
    });

    expect(trackUpdatePolicy).toHaveBeenCalledTimes(1);
    expect(
      trackUpdatePolicy.mock.calls[0][0].policy.rules[0].destinations,
    ).toEqual([dev]);
  });

  it("leaves a policy already marked for deletion alone", async () => {
    // Its DELETE deploys before the group's, so it cannot block it — and a strip
    // would record an update-policy that supersedes the deletion the user asked
    // for, resurrecting the policy.
    nodes = [groupNode("g1", "Ops")];
    livePolicies = [livePolicy("Doomed", [ops], [dev])];
    pendingChanges = [
      { id: "c1", type: "delete-policy", policyId: "Doomed", name: "Doomed" },
    ];
    const { result } = renderHook(() => useDraftGroupActions());

    await act(async () => {
      await result.current.confirmAndDeleteGroups([nodes[0]]);
    });

    expect(trackUpdatePolicy).not.toHaveBeenCalled();
  });
});

// A removed placeholder's setup key stayed usable for the whole draft session:
// teardown was deferred so undo could bring the node back, but the key is a live
// credential and a machine could still register against it meanwhile.
describe("removing a placeholder revokes its setup key", () => {
  it("revokes the key of a placeholder absorbed into a group", () => {
    const { result } = renderHook(() => useDraftGroupActions());
    act(() => result.current.removeNodeWithEdges("peer-draft-a"));

    expect(revokeSetupKey).toHaveBeenCalledWith("k-a");
    // Still registered: the exit flush is what actually deletes it.
    expect(registerArtifacts).toHaveBeenCalledWith("draft-a", {
      setupKeyId: "k-a",
      boundGroupId: "bg-a",
    });
  });

  it("revokes the key of a placeholder with its own node", () => {
    nodes = [
      {
        id: "peer-draft-c",
        type: "peerNode",
        position: { x: 0, y: 0 },
        data: {
          placeholderKind: "server",
          setupKeyId: "k-c",
          boundGroupId: "bg-c",
        },
      } as unknown as Node,
    ];
    const { result } = renderHook(() => useDraftGroupActions());
    act(() => result.current.removeNodeWithEdges("peer-draft-c"));

    expect(revokeSetupKey).toHaveBeenCalledWith("k-c");
  });

  it("revokes the keys of placeholders riding on a removed group node", () => {
    const { result } = renderHook(() => useDraftGroupActions());
    act(() => result.current.removeNodeWithEdges("group-g1"));

    expect(revokeSetupKey).toHaveBeenCalledWith("k-a");
    expect(revokeSetupKey).toHaveBeenCalledWith("k-b");
  });

  // The absorption tracked the placeholders as pending group members; leaving
  // that add behind showed an update-group "Modify" row whose diff was empty.
  it("nets the pending membership adds out when the holder group is removed", () => {
    const { result } = renderHook(() => useDraftGroupActions());
    act(() => result.current.removeGroup(nodes[0]));

    expect(trackRemoveGroupMembers).toHaveBeenCalledWith({
      groupId: "g1",
      groupName: "Servers",
      peerIds: ["draft-a", "draft-b"],
      pendingOnly: true,
    });
  });
});

// Removing a group from a policy is a real pending change: the changeset gains
// the update-policy row the user reviews at deploy.
describe("removing an existing group referenced by a live policy", () => {
  const ops = { id: "g1", name: "Ops" };
  const qa = { id: "g4", name: "QA" };
  const dev = { id: "g2", name: "Dev" };

  const canvasPolicy = (
    id: string,
    sources: unknown[],
    destinations: unknown[],
  ) =>
    ({
      id: `policy-${id}`,
      type: "policyNode",
      position: { x: 0, y: 0 },
      data: {
        policy: {
          id,
          name: id,
          enabled: true,
          rules: [{ name: id, enabled: true, sources, destinations }],
        },
      },
    }) as unknown as Node;

  const opsGroupNode = () =>
    ({
      id: "group-g1",
      type: "groupNode",
      position: { x: 0, y: 0 },
      data: { group: ops },
    }) as unknown as Node;

  it("records the strip as a policy update even for an untouched policy", async () => {
    nodes = [opsGroupNode(), canvasPolicy("P", [ops, qa], [dev])];
    edges = [{ id: "e1", source: "group-g1", target: "policy-P" }];
    const { result } = renderHook(() => useDraftGroupActions());
    act(() => result.current.removeGroup(nodes[0]));
    await flushStrips();

    expect(updateDraftPolicy).toHaveBeenCalledTimes(1);
    expect(updateDraftPolicy.mock.calls[0][0].rules[0].sources).toEqual([qa]);
  });

  it("keeps routing the strip through updateDraftPolicy for a pending edit", async () => {
    pendingChanges = [
      { id: "c1", type: "update-policy", policyId: "P", policy: {} },
    ];
    nodes = [opsGroupNode(), canvasPolicy("P", [ops, qa], [dev])];
    edges = [{ id: "e1", source: "group-g1", target: "policy-P" }];
    const { result } = renderHook(() => useDraftGroupActions());
    act(() => result.current.removeGroup(nodes[0]));
    await flushStrips();

    expect(updateDraftPolicy).toHaveBeenCalledTimes(1);
    expect(updateDraftPolicy.mock.calls[0][0].rules[0].sources).toEqual([qa]);
  });

  it("keeps routing a DRAFT policy's strip through updateDraftPolicy", async () => {
    nodes = [opsGroupNode(), canvasPolicy("new-p", [ops, qa], [dev])];
    edges = [{ id: "e1", source: "group-g1", target: "policy-new-p" }];
    const { result } = renderHook(() => useDraftGroupActions());
    act(() => result.current.removeGroup(nodes[0]));
    await flushStrips();

    expect(updateDraftPolicy).toHaveBeenCalledTimes(1);
  });
});

// Per-node removal read the canvas each pass, so within one gesture every pass saw
// the ORIGINAL nodes: only the last group's strip survived, and two instances of a
// draft group each saw the other and never dropped the create.
describe("a batch Remove of several groups", () => {
  const a = { id: "ga", name: "A" };
  const b = { id: "gb", name: "B" };
  const dev = { id: "g2", name: "Dev" };

  const groupNodeOf = (id: string, group: unknown) =>
    ({
      id,
      type: "groupNode",
      position: { x: 0, y: 0 },
      data: { group },
    }) as unknown as Node;

  it("strips them all from a shared policy in one pass", async () => {
    nodes = [
      groupNodeOf("group-ga", a),
      groupNodeOf("group-gb", b),
      {
        id: "policy-P",
        type: "policyNode",
        position: { x: 0, y: 0 },
        data: {
          policy: {
            id: "P",
            name: "P",
            enabled: true,
            rules: [
              { name: "P", enabled: true, sources: [a, b], destinations: [dev] },
            ],
          },
        },
      } as unknown as Node,
    ];
    edges = [
      { id: "e1", source: "group-ga", target: "policy-P" },
      { id: "e2", source: "group-gb", target: "policy-P" },
    ];
    const { result } = renderHook(() => useDraftGroupActions());
    act(() => result.current.removeGroups([nodes[0], nodes[1]]));
    await flushStrips();

    expect(updateDraftPolicy).toHaveBeenCalledTimes(1);
    expect(updateDraftPolicy.mock.calls[0][0].rules[0].sources).toEqual([]);
  });

  it("drops the create-group when the batch removes both instances of a draft group", () => {
    const web = { name: "Web" };
    nodes = [
      groupNodeOf("group-new-1", web),
      {
        id: "dest-group-Web-p1",
        type: "destinationGroupNode",
        position: { x: 0, y: 0 },
        data: { group: web },
      } as unknown as Node,
    ];
    const { result } = renderHook(() => useDraftGroupActions());
    act(() => result.current.removeGroups([nodes[0], nodes[1]]));

    expect(untrackNewGroup).toHaveBeenCalledWith("Web");
  });

  it("keeps the create while another instance stays on the canvas", () => {
    const web = { name: "Web" };
    nodes = [
      groupNodeOf("group-new-1", web),
      {
        id: "dest-group-Web-p1",
        type: "destinationGroupNode",
        position: { x: 0, y: 0 },
        data: { group: web },
      } as unknown as Node,
    ];
    const { result } = renderHook(() => useDraftGroupActions());
    act(() => result.current.removeGroups([nodes[0]]));

    expect(untrackNewGroup).not.toHaveBeenCalled();
  });
});

// A placeholder absorbed into a DELETED group has no node of its own; skipping the
// sweep left an install-peer change no remaining node could resolve, and a live key.
describe("deleting a group that holds absorbed placeholders", () => {
  it("sweeps their changes, artifacts and setup keys with the group", async () => {
    nodes = [holderGroupNode()];
    const { result } = renderHook(() => useDraftGroupActions());

    await act(async () => {
      await result.current.confirmAndDeleteGroups([nodes[0]]);
    });

    expect(untrackInstallPeer).toHaveBeenCalledWith("draft-a");
    expect(untrackInstallPeer).toHaveBeenCalledWith("draft-b");
    expect(registerArtifacts).toHaveBeenCalledWith("draft-a", {
      setupKeyId: "k-a",
      boundGroupId: "bg-a",
    });
    expect(revokeSetupKey).toHaveBeenCalledWith("k-a");
    expect(revokeSetupKey).toHaveBeenCalledWith("k-b");
  });
});

// "Add Resource Group" tracks its create-group under the row's node id; the row's
// only remover is removeNodeWithEdges, which used to leave the change deploying.
describe("removing a resource-group row", () => {
  const row = (id: string, name: string, parentId?: string) =>
    ({
      id,
      type: "resourceGroupNode",
      position: { x: 0, y: 0 },
      ...(parentId ? { parentId } : {}),
      data: { group: { name } },
    }) as unknown as Node;

  it("drops its pending create-group", () => {
    nodes = [row("resourcegroup-new-1", "Group")];
    const { result } = renderHook(() => useDraftGroupActions());
    act(() => result.current.removeNodeWithEdges("resourcegroup-new-1"));

    expect(untrackNewGroup).toHaveBeenCalledWith("Group");
  });

  it("drops it when the whole frame is removed", () => {
    nodes = [
      {
        id: "network-new-n1",
        type: "networkNode",
        position: { x: 0, y: 0 },
        data: { network: { name: "Net" }, frame: true },
      } as unknown as Node,
      row("resourcegroup-new-1", "Group", "network-new-n1"),
    ];
    const { result } = renderHook(() => useDraftGroupActions());
    act(() => result.current.removeNodeWithEdges("network-new-n1"));

    expect(untrackNewGroup).toHaveBeenCalledWith("Group");
  });
});

// Draft groups are referenced BY NAME wherever an id does not exist yet, and a
// later resource save re-reads those refs verbatim — a stale name deploys against
// a group that no longer exists and fails the run midway.
describe("renaming a draft group follows every name reference", () => {
  it("rewrites resource nodes' refs and group-held draft resources", () => {
    const web = { name: "Web" };
    nodes = [
      {
        id: "group-new-1",
        type: "groupNode",
        position: { x: 0, y: 0 },
        data: { group: web },
      } as unknown as Node,
      {
        id: "resource-new-r1",
        type: "resourceNode",
        position: { x: 0, y: 0 },
        data: {
          resource: { name: "R", address: "1.2.3.4" },
          resourceGroupIds: ["Web", "g9"],
        },
      } as unknown as Node,
      {
        id: "group-g2",
        type: "groupNode",
        position: { x: 0, y: 0 },
        data: {
          group: { id: "g2", name: "Holder" },
          draftResources: [{ id: "new-r2", name: "R2", groups: ["Web"] }],
        },
      } as unknown as Node,
    ];
    const { result } = renderHook(() => useDraftGroupActions());
    act(() => result.current.renameGroup(nodes[0], "Team"));

    const resourceData = nodes.find((n) => n.id === "resource-new-r1")
      ?.data as { resourceGroupIds: string[] };
    expect(resourceData.resourceGroupIds).toEqual(["Team", "g9"]);
    const holderData = nodes.find((n) => n.id === "group-g2")?.data as {
      draftResources: { groups: string[] }[];
    };
    expect(holderData.draftResources[0].groups).toEqual(["Team"]);
  });

  it("leaves refs alone when an EXISTING group is renamed", () => {
    nodes = [
      {
        id: "group-g1",
        type: "groupNode",
        position: { x: 0, y: 0 },
        data: { group: { id: "g1", name: "Ops" } },
      } as unknown as Node,
      {
        id: "resource-new-r1",
        type: "resourceNode",
        position: { x: 0, y: 0 },
        data: {
          resource: { name: "R", address: "1.2.3.4" },
          resourceGroupIds: ["g1", "Ops"],
        },
      } as unknown as Node,
    ];
    const { result } = renderHook(() => useDraftGroupActions());
    act(() => result.current.renameGroup(nodes[0], "Operations"));

    const resourceData = nodes.find((n) => n.id === "resource-new-r1")
      ?.data as { resourceGroupIds: string[] };
    expect(resourceData.resourceGroupIds).toEqual(["g1", "Ops"]);
  });
});
