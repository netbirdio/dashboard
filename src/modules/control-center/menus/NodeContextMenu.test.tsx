import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Policy } from "@/interfaces/Policy";
import { DraftChange } from "@/modules/control-center/draft/DraftChangesetContext";

// `trackSetPolicyEnabled` refuses a toggle while a delete-policy stands (a PUT next
// to a DELETE). A deletion-emptied policy keeps its node, so Disable stayed reachable
// and flipped the canvas alone — a state the changeset never held.

let changes: DraftChange[] = [];
const trackSetPolicyEnabled = vi.fn();
const setNodes = vi.fn();
const setEdges = vi.fn();

const policy: Policy = {
  id: "p1",
  name: "Web to DB",
  description: "",
  enabled: true,
  rules: [
    {
      name: "Web to DB",
      description: "",
      enabled: true,
      sources: [],
      destinations: [{ id: "g3", name: "Prod" }],
      bidirectional: true,
      action: "accept",
      protocol: "all",
      ports: [],
    },
  ],
  source_posture_checks: [],
};
const policyNode = { id: "policy-p1", type: "policyNode", data: { policy } };
// Mutable so other node types (resource-group rows) can be put on the canvas.
let canvasNodes: unknown[] = [policyNode];

const noop = () => {};
const stub = () => vi.fn();

vi.mock("@xyflow/react", () => ({
  useReactFlow: () => ({ getNodes: () => canvasNodes, getEdges: () => [] }),
}));
vi.mock("@utils/api", () => ({
  default: () => ({ data: undefined, isLoading: false }),
  useApiCall: () => ({}),
}));
vi.mock("swr", () => ({ mutate: vi.fn(), useSWRConfig: () => ({ mutate: vi.fn() }) }));
vi.mock("@components/Notification", () => ({ notify: vi.fn() }));
vi.mock("@components/modal/Modal", () => ({
  Modal: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@components/ui/GroupBadgeIcon", () => ({
  GroupBadgeIcon: () => null,
}));
vi.mock("@/modules/control-center/draft/modals/GroupRenameModal", () => ({
  GroupRenameModal: () => null,
}));
vi.mock("@/modules/peers/EditPeerNameModal", () => ({
  default: () => null,
  EditPeerNameModal: () => null,
}));
vi.mock("@/contexts/DialogProvider", () => ({
  useDialog: () => ({ confirm: vi.fn(async () => true) }),
}));
// Mutable so the draft-mode gating can be exercised: draft DEFERS these writes, it
// does not exempt them, so the draft branch needs the same flags as the live one.
const fullRights = () => ({
  policies: { create: true, read: true, update: true, delete: true },
  groups: { create: true, read: true, update: true, delete: true },
  networks: { create: true, read: true, update: true, delete: true },
  peers: { create: true, read: true, update: true, delete: true },
});
let permission = fullRights();
vi.mock("@/contexts/PermissionsProvider", () => ({
  usePermissions: () => ({ permission }),
}));
vi.mock("@/contexts/PoliciesProvider", () => ({
  usePolicies: () => ({
    updatePolicy: stub(),
    serializeRules: stub(),
    deletePolicy: stub(),
  }),
}));
vi.mock("@/modules/control-center/contexts/ControlCenterContext", () => ({
  useCanvasState: () => ({
    nodes: canvasNodes,
    edges: [],
    setNodes,
    setEdges,
    setSelectedDestinationGroup: noop,
    refreshLiveViewRef: { current: undefined },
    setLiveResourceEditor: noop,
  }),
  useDestinationGroup: () => ({
    focusedNodeId: null,
    setFocusedNodeId: noop,
    setSelectedPeerPanel: noop,
  }),
  useControlCenterUI: () => ({ onNetworkSelect: noop }),
}));
vi.mock("@/modules/control-center/contexts/ControlCenterPolicyModals", () => ({
  useControlCenterPolicy: () => ({
    setSelectedPolicy: noop,
    setPolicyModalOpen: noop,
  }),
}));
vi.mock("@/modules/control-center/draft/DraftModeContext", () => ({
  useDraftMode: () => ({
    isDraft: true,
    setResourceEditor: noop,
    setRoutingPeerModal: noop,
    setNetworkEditor: noop,
    setDrillDownNetworkNodeId: noop,
  }),
}));
vi.mock("@/modules/control-center/hooks/useControlCenterData", () => ({
  useControlCenterData: () => ({ groups: [], policies: [policy] }),
}));
vi.mock("@/modules/control-center/hooks/useDeleteNetwork", () => ({
  useDeleteNetwork: () => stub(),
}));
vi.mock("@/modules/control-center/hooks/useDraftGroupActions", () => ({
  useDraftGroupActions: () => ({
    renameGroup: noop,
    removeGroup: noop,
    confirmAndDeleteGroups: vi.fn(async () => true),
    removeNodeWithEdges: noop,
  }),
  getNodeGroup: (n?: { data?: { group?: unknown } }) => n?.data?.group,
  isNewGroup: (g?: { id?: string }) => !!g && !g.id,
  isAllGroup: (g?: { name?: string }) => g?.name === "All",
  canRenameGroup: (g?: { name?: string }) => !!g && g.name !== "All",
  isGroupNode: () => false,
}));
vi.mock("@/modules/control-center/hooks/useDraftNetworkActions", () => ({
  useDraftNetworkActions: () => ({ syncDraftResource: noop }),
  getNetworkRef: () => undefined,
}));
vi.mock("@/modules/control-center/hooks/useDraftNodeCreation", () => ({
  useDraftNodeCreation: () => ({ addResourceGroupToFrame: noop }),
}));
vi.mock("@/modules/control-center/hooks/useEdgeAwareMenuPosition", () => ({
  useEdgeAwareMenuPosition: (p: unknown) => p,
}));
vi.mock("@/modules/control-center/hooks/useNodeRemoval", () => ({
  useNodeRemoval: () => ({
    removeNode: noop,
    canRemoveNode: () => false,
    removePolicyFromCanvas: noop,
  }),
}));
vi.mock("@/modules/groups/useGroupsUsage", () => ({
  default: () => ({ data: [] }),
}));
vi.mock("@/modules/control-center/draft/DraftChangesetContext", async () => {
  const actual = await vi.importActual<
    typeof import("@/modules/control-center/draft/DraftChangesetContext")
  >("@/modules/control-center/draft/DraftChangesetContext");
  return {
    ...actual,
    useDraftChangeset: () => ({
      changes,
      trackSetPolicyEnabled,
      trackDeletePolicy: noop,
      trackUpdateResource: noop,
      trackDeleteResource: noop,
      trackInstallPeer: noop,
    }),
  };
});

const { NodeContextMenu } = await import(
  "@/modules/control-center/menus/NodeContextMenu"
);

const openMenu = (nodeId = "policy-p1") =>
  render(
    <NodeContextMenu
      position={{ x: 10, y: 10 }}
      nodeId={nodeId}
      onClose={noop}
      onDismiss={noop}
    />,
  );

afterEach(cleanup);
beforeEach(() => {
  permission = fullRights();
  changes = [];
  canvasNodes = [policyNode];
  trackSetPolicyEnabled.mockClear();
  setNodes.mockClear();
});

describe("a policy node's Disable item", () => {
  it("is offered while nothing has marked the policy for deletion", () => {
    openMenu();
    expect(screen.getByTestId("cc-menu-disable")).toBeTruthy();
    expect(screen.getByTestId("cc-menu-delete")).toBeTruthy();
  });

  // What deleteGroups leaves when the deleted group was this policy's only source: the
  // policy deploys as a deletion, but its node is only patched, not removed.
  it("is withheld once a delete-policy stands, so the canvas cannot disagree", () => {
    changes = [
      {
        id: "dp",
        type: "delete-policy",
        policyId: "p1",
        name: "Web to DB",
        groupDeletion: { groupIds: ["g1"], basePolicy: policy },
      },
    ];
    openMenu();

    expect(screen.queryByTestId("cc-menu-disable")).toBeNull();
    expect(screen.queryByTestId("cc-menu-enable")).toBeNull();
    // Delete stays: it is the row the changeset already holds.
    expect(screen.getByTestId("cc-menu-delete")).toBeTruthy();
    expect(trackSetPolicyEnabled).not.toHaveBeenCalled();
    expect(setNodes).not.toHaveBeenCalled();
  });

  it("still offers it when the pending delete is for a DIFFERENT policy", () => {
    changes = [
      { id: "dp", type: "delete-policy", policyId: "p9", name: "Other" },
    ];
    openMenu();
    expect(screen.getByTestId("cc-menu-disable")).toBeTruthy();
  });
});

// The live branch gates every mutating item on permission.policies.*; the draft branch
// offered them all unconditionally, and Approve & Deploy sends the same requests — a
// change the API refuses wedges the deploy after the authorized changes have landed.
describe("a policy node's items in draft mode without permission", () => {
  it("withholds Edit and Disable without policies.update", () => {
    permission.policies.update = false;
    openMenu();
    expect(screen.queryByTestId("cc-menu-edit")).toBeNull();
    expect(screen.queryByTestId("cc-menu-disable")).toBeNull();
  });

  it("withholds Delete without policies.delete", () => {
    permission.policies.delete = false;
    openMenu();
    expect(screen.queryByTestId("cc-menu-delete")).toBeNull();
  });

  // Read-only still gets the non-mutating items, so the menu is not simply empty.
  it("keeps Delete when only update is missing, and vice versa", () => {
    permission.policies.update = false;
    openMenu();
    expect(screen.getByTestId("cc-menu-delete")).toBeTruthy();
    cleanup();

    permission = fullRights();
    permission.policies.delete = false;
    openMenu();
    expect(screen.getByTestId("cc-menu-edit")).toBeTruthy();
    expect(screen.getByTestId("cc-menu-disable")).toBeTruthy();
  });
});

// The folded resource-group branch must carry the same flags as the group branch:
// a new group's rename deploys inside its own create (groups.create), an existing
// folded group's as an update (groups.update). It was gated on renameability alone.
describe("a resource-group row's Rename in draft mode", () => {
  const newRow = {
    id: "resourcegroup-new-1",
    type: "resourceGroupNode",
    position: { x: 0, y: 0 },
    data: { group: { name: "Group" } },
  };
  const foldedRow = {
    id: "resourcegroup-g9",
    type: "resourceGroupNode",
    position: { x: 0, y: 0 },
    data: { group: { id: "g9", name: "Prod" } },
  };

  it("withholds it for a NEW group without groups.create", () => {
    permission.groups.create = false;
    canvasNodes = [newRow];
    openMenu("resourcegroup-new-1");

    expect(screen.queryByTestId("cc-menu-rename")).toBeNull();
    // The canvas-only Remove stays: it queues nothing the deploy could refuse.
    expect(screen.getByTestId("cc-menu-remove")).toBeTruthy();
  });

  it("offers it for a NEW group with groups.create", () => {
    canvasNodes = [newRow];
    openMenu("resourcegroup-new-1");

    expect(screen.getByTestId("cc-menu-rename")).toBeTruthy();
  });

  it("withholds it for an existing folded group without groups.update", () => {
    permission.groups.update = false;
    canvasNodes = [foldedRow];
    openMenu("resourcegroup-g9");

    expect(screen.queryByTestId("cc-menu-rename")).toBeNull();
  });

  it("offers it for an existing folded group with groups.update", () => {
    canvasNodes = [foldedRow];
    openMenu("resourcegroup-g9");

    expect(screen.getByTestId("cc-menu-rename")).toBeTruthy();
  });
});
