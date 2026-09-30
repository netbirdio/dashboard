import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Peer } from "@/interfaces/Peer";

// The install watcher matches on the stamped hostname, but a pre-existing peer's
// hostname or user-edited name can merely collide — absorbing it would deploy the
// drafted access against a machine the user never installed.

let nodes: { id: string; data: Record<string, unknown> }[] = [];
let peers: Peer[] = [];
const markInstallPeerInstalled = vi.fn();
const setNodes = vi.fn((fn: (prev: unknown[]) => unknown[]) => {
  nodes = fn(nodes) as typeof nodes;
});

vi.mock("swr", () => ({ mutate: vi.fn() }));
vi.mock("@xyflow/react", () => ({
  useReactFlow: () => ({
    getNodes: () => nodes,
    setNodes,
    setEdges: vi.fn(),
  }),
}));
vi.mock("@/modules/control-center/contexts/ControlCenterContext", () => ({
  useCanvasState: () => ({ nodes }),
}));
vi.mock("@/modules/control-center/hooks/useControlCenterData", () => ({
  useControlCenterData: () => ({ peers }),
}));
vi.mock("@/modules/control-center/contexts/ControlCenterPolicyModals", () => ({
  useControlCenterPolicy: () => ({ updateDraftPolicy: vi.fn() }),
}));
vi.mock("@/modules/control-center/draft/DraftChangesetContext", () => ({
  useDraftChangeset: () => ({
    replacePeerIdInGroups: vi.fn(),
    markInstallPeerInstalled,
  }),
}));
vi.mock("@/modules/control-center/draft/DraftModeContext", () => ({
  useDraftMode: () => ({ isDraft: true }),
}));
vi.mock("@/modules/control-center/hooks/usePlaceholderArtifacts", () => ({
  usePlaceholderArtifacts: () => ({ deleteArtifacts: vi.fn() }),
}));

const { useDraftPeerUpgrade } = await import(
  "@/modules/control-center/hooks/useDraftPeerUpgrade"
);

const INSTALL_STARTED_AT = Date.parse("2026-08-25T12:00:00Z");

const placeholderNode = () => ({
  id: "peer-draft-1",
  data: {
    placeholderKind: "user-device",
    placeholderName: "Laptop",
    installHostname: "laptop",
    installStartedAt: INSTALL_STARTED_AT,
  },
});

const accountPeer = (over: Partial<Peer> = {}) =>
  ({
    id: "p1",
    name: "laptop",
    hostname: "laptop",
    created_at: "2026-08-25T12:05:00Z",
    ...over,
  }) as unknown as Peer;

beforeEach(() => {
  markInstallPeerInstalled.mockClear();
  setNodes.mockClear();
  nodes = [placeholderNode()];
});

describe("matching a waiting install to a registered peer", () => {
  it("absorbs a peer that registered under the hostname after the install began", () => {
    peers = [accountPeer()];
    renderHook(() => useDraftPeerUpgrade());

    expect(markInstallPeerInstalled).toHaveBeenCalledWith("draft-1", {
      id: "p1",
      name: "laptop",
    });
  });

  it("ignores a pre-existing peer whose hostname merely collides", () => {
    peers = [accountPeer({ created_at: "2026-08-24T09:00:00Z" as never })];
    renderHook(() => useDraftPeerUpgrade());

    expect(markInstallPeerInstalled).not.toHaveBeenCalled();
  });

  it("never matches on the user-editable display name", () => {
    peers = [accountPeer({ hostname: "some-other-machine", name: "laptop" })];
    renderHook(() => useDraftPeerUpgrade());

    expect(markInstallPeerInstalled).not.toHaveBeenCalled();
  });

  it("falls back to last_login when created_at is absent", () => {
    peers = [
      accountPeer({
        created_at: undefined,
        last_login: "2026-08-25T12:05:00Z" as never,
      }),
    ];
    renderHook(() => useDraftPeerUpgrade());

    expect(markInstallPeerInstalled).toHaveBeenCalled();
  });

  it("refuses a peer carrying no usable registration time", () => {
    peers = [
      accountPeer({
        created_at: undefined,
        last_login: undefined,
        last_seen: undefined,
      }),
    ];
    renderHook(() => useDraftPeerUpgrade());

    expect(markInstallPeerInstalled).not.toHaveBeenCalled();
  });
});
