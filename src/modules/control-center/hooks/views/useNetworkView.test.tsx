import { renderHook } from "@testing-library/react";
import { Node } from "@xyflow/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Group } from "@/interfaces/Group";
import { Network, NetworkResource } from "@/interfaces/Network";
import { Policy } from "@/interfaces/Policy";

let policies: Policy[] = [];
let networks: Network[] = [];
let networkResources: NetworkResource[] = [];
let groups: Group[] = [];

vi.mock("@/modules/control-center/contexts/ControlCenterContext", () => ({
  useCanvasState: () => ({ selectedNetwork: "", layoutInitialized: false }),
}));
vi.mock("@/modules/control-center/hooks/useControlCenterData", () => ({
  useControlCenterData: () => ({
    policies,
    networks,
    networkResources,
    peers: [],
    groups,
    isLoading: false,
    isDataReady: () => true,
  }),
}));

const { useNetworkView } = await import(
  "@/modules/control-center/hooks/views/useNetworkView"
);

const subject = () => renderHook(() => useNetworkView()).result.current;

const group = (id: string, over: Partial<Group> = {}): Group =>
  ({ id, name: id, peers_count: 0, resources_count: 0, ...over }) as Group;

const policy = (
  id: string,
  enabled: boolean,
  sources: Group[],
  destinations: Group[] = [],
): Policy =>
  ({
    id,
    name: id,
    enabled,
    rules: [{ id: `${id}-r`, enabled, sources, destinations }],
  }) as unknown as Policy;

beforeEach(() => {
  policies = [];
  networks = [];
  networkResources = [];
  groups = [];
});

describe("buildNetworksView source groups", () => {
  // addNode keeps the first node and merges data per policy, so the API order
  // of a network's policies used to decide whether a shared source group
  // rendered dimmed; the policy-embedded snapshot must not shadow fresh counts.
  it("lets the enabled policy win the shared group and refreshes its counts", () => {
    const g = group("g1", { peers_count: 0 });
    groups = [group("g1", { peers_count: 5 })];
    // Enabled listed FIRST: unsorted iteration would write disabled last.
    policies = [policy("p-on", true, [g]), policy("p-off", false, [g])];
    networks = [
      {
        id: "net1",
        name: "Net",
        policies: ["p-on", "p-off"],
        resources: [],
      } as Network,
    ];

    const result = subject().applyNetworksView();
    const groupNode = result?.updatedNodes.find(
      (n: Node) => n.id === "group-g1",
    );
    expect(groupNode?.data?.enabled).toBe(true);
    expect((groupNode?.data?.group as Group)?.peers_count).toBe(5);
  });

  // The disabled-first sort only orders policies WITHIN a network, so a group
  // sourcing an enabled policy in one network and a disabled one in another
  // used to dim or not with the API's network order. Enabled must win.
  it.each([
    ["enabled network first", ["netOn", "netOff"]],
    ["enabled network last", ["netOff", "netOn"]],
  ])("undims a cross-network shared group (%s)", (_label, order) => {
    const g = group("g1");
    groups = [g];
    policies = [policy("p-on", true, [g]), policy("p-off", false, [g])];
    const byId: Record<string, Network> = {
      netOn: {
        id: "netOn",
        name: "On",
        policies: ["p-on"],
        resources: [],
      } as Network,
      netOff: {
        id: "netOff",
        name: "Off",
        policies: ["p-off"],
        resources: [],
      } as Network,
    };
    networks = order.map((id) => byId[id]);

    const result = subject().applyNetworksView();
    const groupNode = result?.updatedNodes.find(
      (n: Node) => n.id === "group-g1",
    );
    expect(groupNode?.data?.enabled).toBe(true);
  });
});

describe("applySingleNetworkView self-referencing policy", () => {
  // With one group on both sides of a policy, the destination instance used to
  // collapse into the source column (addNode keeps the first type), running its
  // edges right-to-left across the diagram.
  it("clones the destination instance of a group that is also a source", () => {
    const g = group("g1");
    groups = [g];
    policies = [policy("p1", true, [g], [g])];
    networkResources = [
      { id: "r1", name: "Res", groups: [g] } as unknown as NetworkResource,
    ];
    networks = [
      {
        id: "net1",
        name: "Net",
        policies: ["p1"],
        resources: ["r1"],
      } as Network,
    ];

    const result = subject().applySingleNetworkView("net1");
    const source = result?.updatedNodes.find(
      (n: Node) => n.id === "group-g1",
    );
    const clone = result?.updatedNodes.find(
      (n: Node) => n.id === "dest-group-g1-p1",
    );
    expect(source?.type).toBe("groupNode");
    expect(clone?.type).toBe("destinationGroupNode");
    expect(
      result?.updatedEdges.some(
        (e) => e.source === "dest-group-g1-p1" && e.target === "resource-r1",
      ),
    ).toBe(true);
    expect(
      result?.updatedEdges.some(
        (e) => e.source === "policy-p1" && e.target === "dest-group-g1-p1",
      ),
    ).toBe(true);
  });

  it("keeps a destination-only group on its plain id", () => {
    const src = group("g-src");
    const dst = group("g-dst");
    groups = [src, dst];
    policies = [policy("p1", true, [src], [dst])];
    networkResources = [
      { id: "r1", name: "Res", groups: [dst] } as unknown as NetworkResource,
    ];
    networks = [
      {
        id: "net1",
        name: "Net",
        policies: ["p1"],
        resources: ["r1"],
      } as Network,
    ];

    const result = subject().applySingleNetworkView("net1");
    const dest = result?.updatedNodes.find(
      (n: Node) => n.id === "group-g-dst",
    );
    expect(dest?.type).toBe("destinationGroupNode");
    expect(
      result?.updatedNodes.some((n: Node) =>
        n.id.startsWith("dest-group-"),
      ),
    ).toBe(false);
  });
});
