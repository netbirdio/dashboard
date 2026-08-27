import { renderHook } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Node } from "@xyflow/react";

// Guards the call SITE, not just the helper: a revert to reading data.enabled is
// what deployed enabled:true over a disabled resource.
let nodes: Node[] = [];
let apiNetworks: unknown[] | undefined;
const trackUpdateResource = vi.fn();
const trackCreateResource = vi.fn();
const notifyMock = vi.fn();

vi.mock("@utils/api", () => ({
  default: () => ({ data: apiNetworks, isLoading: false }),
}));
vi.mock("@components/Notification", () => ({
  notify: (...args: unknown[]) => notifyMock(...args),
}));

vi.mock("@xyflow/react", () => ({
  useReactFlow: () => ({
    getNodes: () => nodes,
    getEdges: () => [],
    setNodes: (fn: (n: Node[]) => Node[]) => {
      nodes = typeof fn === "function" ? fn(nodes) : fn;
    },
    setEdges: () => {},
    fitView: () => {},
  }),
}));
vi.mock("@/modules/control-center/contexts/ControlCenterPolicyModals", () => ({
  useControlCenterPolicy: () => ({ updateDraftPolicy: vi.fn() }),
}));
vi.mock("@/modules/control-center/draft/DraftModeContext", () => ({
  useDraftMode: () => ({ drillDownNetworkNodeId: null }),
}));
vi.mock("@/modules/control-center/draft/DraftChangesetContext", async () => {
  const actual = await vi.importActual<
    typeof import("@/modules/control-center/draft/DraftChangesetContext")
  >("@/modules/control-center/draft/DraftChangesetContext");
  return {
    ...actual,
    useDraftChangeset: () => ({
      changes: [],
      trackCreateGroup: vi.fn(),
      trackCreateRouter: vi.fn(),
      trackUpdateRouter: vi.fn(),
      trackCreateResource,
      untrackResource: vi.fn(),
      trackUpdateResource,
      updateDraftNetwork: vi.fn(),
    }),
  };
});

const { useDraftNetworkActions } = await import(
  "@/modules/control-center/hooks/useDraftNetworkActions"
);

// A framed existing resource as the views actually build it.
const framedResource = (over: Record<string, unknown>) =>
  ({
    id: "resource-r1",
    type: "resourceNode",
    parentId: "network-net-1",
    position: { x: 0, y: 0 },
    data: {
      resource: {
        id: "r1",
        name: "db",
        address: "10.0.0.1/32",
        enabled: false,
        groups: [{ id: "g1" }],
      },
      draftNetwork: { networkId: "net-1", name: "N" },
      ...over,
    },
  }) as unknown as Node;

const save = (result: { current: ReturnType<typeof useDraftNetworkActions> }) =>
  act(() =>
    result.current.saveDraftResource({
      nodeId: "resource-r1",
      name: "db renamed",
      address: "10.0.0.1/32",
      groupIds: ["g1"],
      network: { networkId: "net-1", name: "N" },
    }),
  );

beforeEach(() => {
  trackUpdateResource.mockClear();
  trackCreateResource.mockClear();
  notifyMock.mockClear();
  apiNetworks = undefined;
});

describe("saveDraftResource keeps a resource's enabled state", () => {
  it("does NOT enable a disabled resource sitting in an enabled network", () => {
    nodes = [framedResource({ enabled: true })];
    const { result } = renderHook(() => useDraftNetworkActions());
    save(result);

    expect(trackUpdateResource).toHaveBeenCalledTimes(1);
    expect(trackUpdateResource.mock.calls[0][0]).toMatchObject({
      resourceId: "r1",
      name: "db renamed",
      enabled: false,
    });
  });

  it("does NOT disable an enabled resource whose network reads dimmed", () => {
    nodes = [
      framedResource({
        enabled: false,
        resource: {
          id: "r1",
          name: "db",
          address: "10.0.0.1/32",
          enabled: true,
          groups: [{ id: "g1" }],
        },
      }),
    ];
    const { result } = renderHook(() => useDraftNetworkActions());
    save(result);

    expect(trackUpdateResource.mock.calls[0][0]).toMatchObject({
      enabled: true,
    });
  });

  it("honours a draft toggle over the live value", () => {
    nodes = [framedResource({ enabled: true, resourceEnabled: true })];
    const { result } = renderHook(() => useDraftNetworkActions());
    save(result);

    expect(trackUpdateResource.mock.calls[0][0]).toMatchObject({
      enabled: true,
    });
  });

  it("reports the live value as `original`, so a full revert drops the change", () => {
    nodes = [framedResource({ enabled: true })];
    const { result } = renderHook(() => useDraftNetworkActions());
    save(result);

    expect(trackUpdateResource.mock.calls[0][0].original).toMatchObject({
      enabled: false,
      name: "db",
    });
  });
});

// A second edit must compare against the LIVE values, not the first edit, or a
// rename undone by hand leaves a change that PUTs what is already on the server.
describe("saveDraftResource keeps the live baseline across edits", () => {
  const saveName = (
    result: { current: ReturnType<typeof useDraftNetworkActions> },
    name: string,
  ) =>
    act(() =>
      result.current.saveDraftResource({
        nodeId: "resource-r1",
        name,
        address: "10.0.0.1/32",
        groupIds: ["g1"],
        network: { networkId: "net-1", name: "N" },
      }),
    );

  it("reports the live name as `original` on the SECOND edit too", () => {
    nodes = [framedResource({ enabled: true })];
    const { result } = renderHook(() => useDraftNetworkActions());

    saveName(result, "db renamed");
    expect(trackUpdateResource.mock.calls[0][0].original.name).toBe("db");

    saveName(result, "db");
    expect(trackUpdateResource.mock.calls[1][0].original.name).toBe("db");
    expect(trackUpdateResource.mock.calls[1][0].name).toBe("db");
  });

  it("captures the baseline once, on the first edit", () => {
    nodes = [framedResource({ enabled: true })];
    const { result } = renderHook(() => useDraftNetworkActions());

    saveName(result, "db renamed");
    const captured = (nodes[0].data as { liveResource?: { name?: string } })
      .liveResource;
    expect(captured?.name).toBe("db");

    saveName(result, "db renamed twice");
    expect(
      (nodes[0].data as { liveResource?: { name?: string } }).liveResource
        ?.name,
    ).toBe("db");
  });

  it("still reports the live enabled flag as `original` after a rename", () => {
    nodes = [framedResource({ enabled: true })];
    const { result } = renderHook(() => useDraftNetworkActions());

    saveName(result, "db renamed");
    saveName(result, "db renamed twice");
    expect(trackUpdateResource.mock.calls[1][0].original.enabled).toBe(false);
  });
});

// An unstamped node (the /networks list was stale when the draft was built)
// must not let an edit vanish: the network is re-resolved at save time, and a
// save that cannot be tracked is refused rather than applied canvas-only.
describe("saveDraftResource without a draftNetwork stamp", () => {
  const saveWithoutNetwork = (result: {
    current: ReturnType<typeof useDraftNetworkActions>;
  }) =>
    act(() =>
      result.current.saveDraftResource({
        nodeId: "resource-r1",
        name: "db renamed",
        address: "10.0.0.1/32",
        groupIds: ["g1"],
        network: { name: "" },
      }),
    );

  it("resolves the owning network by resource id at save time", () => {
    apiNetworks = [{ id: "net-9", name: "Nine", resources: ["r1"] }];
    nodes = [framedResource({ enabled: true, draftNetwork: undefined })];
    const { result } = renderHook(() => useDraftNetworkActions());
    saveWithoutNetwork(result);

    expect(trackUpdateResource).toHaveBeenCalledTimes(1);
    expect(trackUpdateResource.mock.calls[0][0]).toMatchObject({
      resourceId: "r1",
      networkId: "net-9",
      networkName: "Nine",
      name: "db renamed",
    });
    // The resolved ref is stamped so the next save doesn't resolve again.
    expect(
      (nodes[0].data as { draftNetwork?: { networkId?: string } }).draftNetwork,
    ).toMatchObject({ networkId: "net-9" });
  });

  it("refuses the save (canvas untouched, error surfaced) when no network resolves", () => {
    apiNetworks = [{ id: "net-9", name: "Nine", resources: ["other"] }];
    nodes = [framedResource({ enabled: true, draftNetwork: undefined })];
    const { result } = renderHook(() => useDraftNetworkActions());
    saveWithoutNetwork(result);

    expect(trackUpdateResource).not.toHaveBeenCalled();
    expect(notifyMock).toHaveBeenCalledTimes(1);
    // A rename the deploy never carries would evaporate on exit.
    expect(
      (nodes[0].data as { resource?: { name?: string } }).resource?.name,
    ).toBe("db");
  });
});
