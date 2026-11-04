import { cleanup, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Draft deletes (delete-resource) and disables (update-router) must lower the
// frame header's live counts immediately — the lazy router rows arrive only if
// the popover opens, and a wrong green badge defeats the "No Routing Peer" warning.

let changes: unknown[] = [];
let groups: unknown[] = [];
let barProps: { count?: number } = {};

// Something in the node's import graph reaches @utils/api, whose module init
// reads the window config that doesn't exist under vitest.
vi.mock("@utils/api", () => ({
  default: () => ({ data: undefined, isLoading: false }),
  useApiCall: () => ({}),
}));
vi.mock("@xyflow/react", () => ({
  Handle: () => null,
  Position: { Left: "left", Right: "right" },
  useConnection: () => false,
  useStore: (selector: (s: { nodes: unknown[] }) => unknown) =>
    selector({ nodes: [] }),
}));
vi.mock("@/contexts/GroupsProvider", () => ({
  useGroups: () => ({ groups }),
}));
vi.mock("@/modules/control-center/draft/DraftChangesetContext", () => ({
  useDraftChangeset: () => ({ changes }),
}));
vi.mock("@/modules/control-center/draft/DraftModeContext", () => ({
  useDraftMode: () => ({
    isDraft: false,
    setRoutingPeerModal: vi.fn(),
    setResourceEditor: vi.fn(),
    drillDownNetworkNodeId: null,
    setDrillDownNetworkNodeId: vi.fn(),
  }),
  useNetworkHover: () => ({
    hoveredNetworkNodeId: null,
    setHoveredNetworkNodeId: vi.fn(),
  }),
}));
vi.mock("@/modules/control-center/contexts/ControlCenterContext", () => ({
  useIsContextMenuTarget: () => false,
}));
vi.mock("@/modules/control-center/hooks/useFrameRouterRows", () => ({
  useFrameRouterRows: () => ({ rows: [], isLoading: false }),
}));
vi.mock("@/modules/control-center/panels/RoutingPeersBar", () => ({
  getRoutingPeerCount: () => 0,
  RoutingPeersBar: (props: { count: number }) => {
    barProps = props;
    return <div data-testid={"routing-peers-bar"}>{props.count}</div>;
  },
}));

const { NetworkNode } = await import(
  "@/modules/control-center/nodes/NetworkNode"
);

const renderFrame = (
  network: Record<string, unknown>,
  id = `network-${network.id}`,
) => {
  const props = { id, data: { network, frame: true } } as unknown as Parameters<
    typeof NetworkNode
  >[0];
  return render(<NetworkNode {...props} />);
};

beforeEach(() => {
  changes = [];
  groups = [];
  barProps = {};
});

afterEach(cleanup);

describe("NetworkNode draft count overlays", () => {
  it("subtracts pending delete-resource changes from the resource count", () => {
    changes = [
      {
        id: "c1",
        type: "delete-resource",
        resourceId: "r2",
        networkId: "net1",
        name: "Res 2",
        networkName: "Net",
      },
    ];
    renderFrame({ id: "net1", name: "Net", resources: ["r1", "r2", "r3"] });
    expect(screen.getByText("2 Resources")).toBeTruthy();
  });

  it("ignores delete-resource changes for other networks' resources", () => {
    changes = [
      {
        id: "c1",
        type: "delete-resource",
        resourceId: "other",
        networkId: "net2",
        name: "Res",
        networkName: "Other",
      },
    ];
    renderFrame({ id: "net1", name: "Net", resources: ["r1", "r2"] });
    expect(screen.getByText("2 Resources")).toBeTruthy();
  });

  it("subtracts a peer router a pending update-router disables", () => {
    changes = [
      {
        id: "c1",
        type: "update-router",
        routerId: "router-1",
        networkId: "net1",
        networkName: "Net",
        peerId: "peer-1",
        enabled: false,
      },
    ];
    renderFrame({
      id: "net1",
      name: "Net",
      resources: [],
      routing_peers_count: 1,
    });
    expect(barProps.count).toBe(0);
  });

  it("subtracts a disabled group router's peers via the groups list", () => {
    groups = [{ id: "g1", name: "Routers", peers_count: 3 }];
    changes = [
      {
        id: "c1",
        type: "update-router",
        routerId: "router-1",
        networkId: "net1",
        networkName: "Net",
        groupId: "g1",
        enabled: false,
      },
    ];
    renderFrame({
      id: "net1",
      name: "Net",
      resources: [],
      routing_peers_count: 3,
    });
    expect(barProps.count).toBe(0);
  });
});
