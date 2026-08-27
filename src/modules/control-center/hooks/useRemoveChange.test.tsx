import { renderHook } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Group } from "@/interfaces/Group";
import { Network, NetworkResource } from "@/interfaces/Network";
import { Policy } from "@/interfaces/Policy";
import { DraftChange } from "@/modules/control-center/draft/DraftChangesetContext";

// Discarding a change puts the draft back the way it was — but "the way it was" is
// LIVE unioned with whatever the changeset still says: redrawing from live alone
// resurrects a policy the user deleted, or wipes a pending edit off the canvas.

type CanvasNode = { id: string; data?: Record<string, unknown> };

let changes: DraftChange[] = [];
let nodes: CanvasNode[] = [];
let livePolicies: Policy[] = [];
let liveGroups: Group[] = [];
let liveNetworks: Network[] = [];
let liveResources: NetworkResource[] = [];

const replaceChanges = vi.fn((next: DraftChange[]) => {
  changes = next;
});
const drawPolicyOnCanvas = vi.fn();
const setNodes = vi.fn();
const setEdges = vi.fn();
const removeNodeWithEdges = vi.fn();

vi.mock("@/modules/control-center/contexts/ControlCenterContext", () => ({
  useCanvasState: () => ({ nodes, edges: [], setNodes, setEdges }),
}));
vi.mock("@/modules/control-center/contexts/ControlCenterPolicyModals", () => ({
  useControlCenterPolicy: () => ({ drawPolicyOnCanvas }),
}));
vi.mock("@/modules/control-center/hooks/useControlCenterData", () => ({
  useControlCenterData: () => ({
    policies: livePolicies,
    groups: liveGroups,
    networks: liveNetworks,
    networkResources: liveResources,
  }),
}));
vi.mock("@/modules/control-center/hooks/useDraftGroupActions", () => ({
  useDraftGroupActions: () => ({ removeNodeWithEdges }),
}));
vi.mock("@/modules/control-center/draft/DraftChangesetContext", async () => {
  const actual = await vi.importActual<
    typeof import("@/modules/control-center/draft/DraftChangesetContext")
  >("@/modules/control-center/draft/DraftChangesetContext");
  return {
    ...actual,
    useDraftChangeset: () => ({ changes, replaceChanges }),
  };
});

const { useRemoveChange } = await import(
  "@/modules/control-center/hooks/useRemoveChange"
);

const ops = { id: "g1", name: "Ops" };
const dev = { id: "g2", name: "Dev" };
const prod = { id: "g3", name: "Prod" };

const policy = (sources: unknown[], destinations: unknown[]): Policy =>
  ({
    id: "p1",
    name: "P",
    enabled: true,
    rules: [{ name: "P", enabled: true, sources, destinations }],
  }) as unknown as Policy;

const deleteGroup = (groupId: string, name: string): DraftChange => ({
  id: `dg-${groupId}`,
  type: "delete-group",
  groupId,
  name,
});

const remove = (change: DraftChange) => {
  const { result } = renderHook(() => useRemoveChange());
  act(() => result.current.removeWithCascade(change));
};

const drawn = () => drawPolicyOnCanvas.mock.calls.map((c) => c[0] as Policy);

beforeEach(() => {
  changes = [];
  nodes = [];
  livePolicies = [];
  liveGroups = [];
  liveNetworks = [];
  liveResources = [];
  replaceChanges.mockClear();
  drawPolicyOnCanvas.mockClear();
  setNodes.mockClear();
  setEdges.mockClear();
});

describe("restoring a group does not resurrect a policy the user deleted", () => {
  beforeEach(() => {
    liveGroups = [ops as Group];
    livePolicies = [policy([ops], [prod])];
  });

  // The bug: a USER-recorded delete-policy carries no groupDeletion baseline for
  // `pendingPolicyView`, so the `?? p` fallback drew the policy from LIVE while its
  // delete stood — and the next group deletion replaced the delete with an update.
  it("skips the redraw while an untagged delete-policy stands", () => {
    changes = [
      { id: "dp", type: "delete-policy", policyId: "p1", name: "P" },
      deleteGroup("g1", "Ops"),
    ];
    remove(changes[1]);

    expect(drawPolicyOnCanvas).not.toHaveBeenCalled();
    // The user's deletion survives the restore untouched.
    expect(replaceChanges).toHaveBeenCalledWith([
      { id: "dp", type: "delete-policy", policyId: "p1", name: "P" },
    ]);
  });

  it("still redraws from live when nothing is pending for the policy", () => {
    changes = [deleteGroup("g1", "Ops")];
    remove(changes[0]);

    expect(drawn()).toHaveLength(1);
    expect(drawn()[0].rules?.[0].sources).toEqual([ops]);
  });

  // A deletion-driven delete-policy DOES carry a baseline, so it has a view to draw:
  // the emptied policy, matching its "Delete policy" row rather than a live copy that
  // would put the doomed group back on the canvas.
  it("draws the baseline view of a deletion-driven delete-policy", () => {
    livePolicies = [policy([ops], [prod])];
    changes = [
      {
        id: "dp",
        type: "delete-policy",
        policyId: "p1",
        name: "P",
        groupDeletion: {
          groupIds: ["g1", "g3"],
          basePolicy: policy([ops], [prod]),
        },
      },
      deleteGroup("g1", "Ops"),
      deleteGroup("g3", "Prod"),
    ];
    remove(changes[1]);

    // Ops came back, so it is an update again; Prod is still marked for deletion.
    expect(drawn()).toHaveLength(1);
    expect(drawn()[0].rules?.[0].sources).toEqual([ops]);
    expect(drawn()[0].rules?.[0].destinations).toEqual([]);
  });
});

describe("restoring a resource honours what the changeset still says", () => {
  const resource: NetworkResource = {
    id: "r1",
    name: "API",
    address: "10.0.0.1",
    enabled: true,
  };

  beforeEach(() => {
    liveResources = [resource];
    liveNetworks = [{ id: "n1", name: "Net" } as Network];
    livePolicies = [
      {
        ...policy([ops], []),
        rules: [
          {
            name: "P",
            enabled: true,
            sources: [ops],
            destinations: [],
            destinationResource: { id: "r1", type: "host" },
          },
        ],
      } as unknown as Policy,
    ];
  });

  const deleteResource: DraftChange = {
    id: "dr",
    type: "delete-resource",
    resourceId: "r1",
    networkId: "n1",
    name: "API",
    networkName: "Net",
  };

  // The bug: the branch redrew every referencing policy from live, and
  // drawPolicyOnCanvas OVERWRITES the node's data.policy rather than merging — a
  // pending edit was wiped off the canvas while its update-policy stayed tracked.
  it("draws the pending edit, not the live policy", () => {
    const edited = {
      ...livePolicies[0],
      rules: [{ ...livePolicies[0].rules[0], sources: [ops, dev] }],
    } as Policy;
    changes = [
      {
        id: "up",
        type: "update-policy",
        policyId: "p1",
        name: "P",
        policy: edited,
        origin: "edit",
      },
      deleteResource,
    ];
    remove(deleteResource);

    expect(drawn()).toHaveLength(1);
    expect(drawn()[0].rules?.[0].sources).toEqual([ops, dev]);
  });

  it("skips the redraw while the policy is marked for deletion", () => {
    changes = [
      { id: "dp", type: "delete-policy", policyId: "p1", name: "P" },
      deleteResource,
    ];
    remove(deleteResource);

    expect(drawPolicyOnCanvas).not.toHaveBeenCalled();
  });
});

describe("restoring a network builds its rows from the changeset", () => {
  const child = (id: string, name: string): NetworkResource => ({
    id,
    name,
    address: "10.0.0.1",
    enabled: true,
  });

  const deleteNetwork: DraftChange = {
    id: "dn",
    type: "delete-network",
    networkId: "n1",
    name: "Net",
  };

  beforeEach(() => {
    liveNetworks = [
      { id: "n1", name: "Net", resources: ["r1", "r2"] } as Network,
    ];
    liveResources = [child("r1", "API"), child("r2", "DB")];
  });

  const restoredChildren = () => {
    const updater = setNodes.mock.calls.at(-1)?.[0] as (
      prev: CanvasNode[],
    ) => CanvasNode[];
    return updater([]).filter((n) => n.id.startsWith("resource-"));
  };

  it("omits a child that still carries a delete-resource", () => {
    changes = [
      {
        id: "dr",
        type: "delete-resource",
        resourceId: "r2",
        networkId: "n1",
        name: "DB",
        networkName: "Net",
      },
      deleteNetwork,
    ];
    remove(deleteNetwork);

    expect(restoredChildren().map((n) => n.id)).toEqual(["resource-r1"]);
  });

  it("shows a child's pending edit and keeps live as its revert baseline", () => {
    changes = [
      {
        id: "ur",
        type: "update-resource",
        resourceId: "r1",
        networkId: "n1",
        networkName: "Net",
        name: "API v2",
        address: "10.0.0.9",
        enabled: false,
        groupIds: [],
      },
      deleteNetwork,
    ];
    remove(deleteNetwork);

    const row = restoredChildren().find((n) => n.id === "resource-r1");
    expect(row?.data?.resource).toMatchObject({
      name: "API v2",
      address: "10.0.0.9",
      enabled: false,
    });
    // Without this the next edit would read the patched row as live, and a revert
    // field-for-field would stop dropping the change.
    expect(row?.data?.liveResource).toMatchObject({
      name: "API",
      address: "10.0.0.1",
      enabled: true,
    });
  });

  it("leaves an untouched child on its live values", () => {
    changes = [deleteNetwork];
    remove(deleteNetwork);

    const row = restoredChildren().find((n) => n.id === "resource-r2");
    expect(row?.data?.resource).toMatchObject({ name: "DB" });
    expect(row?.data?.liveResource).toBeUndefined();
  });
});

// The policy editor reads its state from canvas node data, so a discarded draft
// entity must leave data.policy too — ensureDraftGroupChanges would otherwise
// re-track a discarded group on the next save, and the deploy would POST it.
describe("discarding a create scrubs policy node data", () => {
  const applyNodeUpdates = (initial: unknown[]) =>
    setNodes.mock.calls.reduce(
      (acc, [updater]) => (updater as (prev: unknown[]) => unknown[])(acc),
      initial,
    ) as CanvasNode[];

  it("strips the discarded draft group but keeps a same-named LIVE group", () => {
    const createGroup: DraftChange = {
      id: "cg",
      type: "create-group",
      clientId: "group-new-Web",
      name: "Web",
      peerIds: [],
      resourceIds: [],
    };
    changes = [createGroup];
    const draftWeb = { name: "Web" };
    const liveWeb = { id: "g9", name: "Web" };
    nodes = [
      { id: "group-new-Web", data: { group: draftWeb } },
      {
        id: "policy-new-p1",
        data: {
          policy: {
            name: "P",
            enabled: true,
            rules: [
              { name: "P", enabled: true, sources: [draftWeb, liveWeb], destinations: [dev] },
            ],
          },
        },
      },
    ];
    remove(createGroup);

    const result = applyNodeUpdates(nodes);
    expect(result.some((n) => n.id === "group-new-Web")).toBe(false);
    const p = (result.find((n) => n.id === "policy-new-p1")?.data as any)
      ?.policy as Policy;
    expect(p.rules?.[0].sources).toEqual([liveWeb]);
    expect(p.rules?.[0].destinations).toEqual([dev]);
  });

  it("clears a discarded draft resource from a policy's destination", () => {
    const createResource: DraftChange = {
      id: "cr",
      type: "create-resource",
      clientId: "new-r1",
      name: "db",
      address: "10.0.0.1",
      networkName: "",
      groupIds: [],
    };
    changes = [createResource];
    nodes = [
      { id: "resource-new-r1", data: {} },
      {
        id: "policy-p1",
        data: {
          policy: {
            id: "p1",
            name: "P",
            enabled: true,
            rules: [
              {
                name: "P",
                enabled: true,
                sources: [ops],
                destinations: [],
                destinationResource: { id: "new-r1", type: "host" },
              },
            ],
          },
        },
      },
    ];
    remove(createResource);

    const result = applyNodeUpdates(nodes);
    const p = (result.find((n) => n.id === "policy-p1")?.data as any)
      ?.policy as Policy;
    expect(p.rules?.[0].destinationResource).toBeUndefined();
  });
});

describe("discarding a draft network detaches children in place", () => {
  it("converts a child's frame-relative position to absolute", () => {
    const createNetwork: DraftChange = {
      id: "cn",
      type: "create-network",
      clientId: "new-n1",
      name: "Corp",
    };
    changes = [createNetwork];
    nodes = [
      { id: "network-new-n1", position: { x: 1200, y: 400 } },
      {
        id: "resource-r1",
        parentId: "network-new-n1",
        position: { x: 24, y: 60 },
        data: {},
      },
    ] as unknown as CanvasNode[];
    remove(createNetwork);

    const updater = setNodes.mock.calls.at(-1)?.[0] as (
      prev: unknown[],
    ) => { id: string; parentId?: string; position: { x: number; y: number } }[];
    const detached = updater(nodes).find((n) => n.id === "resource-r1");
    expect(detached?.parentId).toBeUndefined();
    // Kept frame-relative it would teleport toward the canvas origin.
    expect(detached?.position).toEqual({ x: 1224, y: 460 });
  });
});
