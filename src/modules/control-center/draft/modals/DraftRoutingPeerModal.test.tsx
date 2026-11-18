import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let routingPeerModal: Record<string, unknown> | null = null;
let changes: Record<string, unknown>[] = [];
const contentProps: Record<string, unknown>[] = [];
const removeChange = vi.fn();
const addRouterFromSelection = vi.fn();
const updateRouterFromSelection = vi.fn();
const notify = vi.fn();
const setRoutingPeerModal = vi.fn();

vi.mock("swr", () => ({ useSWRConfig: () => ({ mutate: vi.fn() }) }));
let canvasNodes: Record<string, unknown>[] = [];
vi.mock("@xyflow/react", () => ({
  useReactFlow: () => ({ getNodes: () => canvasNodes }),
}));
vi.mock("lucide-react", () => ({ Share2Icon: () => null }));
vi.mock("@components/Notification", () => ({ notify }));
vi.mock("@components/modal/Modal", () => ({
  Modal: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  ModalContent: ({ children }: { children?: React.ReactNode }) => (
    <>{children}</>
  ),
  ModalClose: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  ModalFooter: ({ children }: { children?: React.ReactNode }) => (
    <>{children}</>
  ),
}));
vi.mock("@components/modal/ModalHeader", () => ({
  default: ({
    title,
    description,
  }: {
    title?: string;
    description?: string;
  }) => (
    <div>
      {title}
      {description}
    </div>
  ),
}));
vi.mock("@components/Button", () => ({
  default: ({ children }: { children?: React.ReactNode }) => (
    <button>{children}</button>
  ),
}));
vi.mock("@/modules/control-center/draft/DraftModeContext", () => ({
  useDraftMode: () => ({
    isDraft: true,
    routingPeerModal,
    setRoutingPeerModal,
  }),
}));
vi.mock("@/modules/control-center/draft/DraftChangesetContext", () => ({
  useDraftChangeset: () => ({ changes, removeChange }),
}));
vi.mock("@/modules/control-center/hooks/useDraftNetworkActions", () => ({
  getNetworkRef: (node?: { id: string }) =>
    node && {
      networkClientId: node.id.replace("network-", ""),
      name: "Office",
    },
  useDraftNetworkActions: () => ({
    addRouterFromSelection,
    updateRouterFromSelection,
  }),
}));
vi.mock("@/modules/networks/routing-peers/NetworkRoutingPeerModal", () => ({
  RoutingPeerModalContent: (props: Record<string, unknown>) => {
    contentProps.push(props);
    return <div data-testid={"routing-peer-modal-content"} />;
  },
}));

const { DraftRoutingPeerModal } = await import(
  "@/modules/control-center/draft/modals/DraftRoutingPeerModal"
);

const createRouterChange = (peerId: string) => ({
  id: "ch-1",
  type: "create-router",
  clientId: "router-1",
  networkName: "Office",
  peerId,
  metric: 5,
  masquerade: false,
  enabled: true,
});

afterEach(cleanup);
beforeEach(() => {
  contentProps.length = 0;
  removeChange.mockClear();
  addRouterFromSelection.mockClear();
  updateRouterFromSelection.mockClear();
  notify.mockClear();
  setRoutingPeerModal.mockClear();
  canvasNodes = [];
  routingPeerModal = {
    networkNodeId: "network-new-1",
    editChangeId: "ch-1",
  };
});

describe("editing a placeholder-bound router", () => {
  it("opens the modal with the draft peer binding preserved", () => {
    changes = [createRouterChange("draft-1")];
    render(<DraftRoutingPeerModal />);

    expect(screen.getByTestId("routing-peer-modal-content")).toBeTruthy();
    const router = contentProps.at(-1)?.router as { peer?: string };
    expect(router?.peer).toBe("draft-1");
  });

  it("still edits a router bound to a real peer", () => {
    changes = [createRouterChange("real-peer-1")];
    render(<DraftRoutingPeerModal />);

    expect(screen.getByTestId("routing-peer-modal-content")).toBeTruthy();
    const router = contentProps.at(-1)?.router as { peer?: string };
    expect(router?.peer).toBe("real-peer-1");
  });
});

describe("saving an edited draft router", () => {
  it("removes the old change as replaced, then records the router again", () => {
    changes = [createRouterChange("real-peer-1")];
    render(<DraftRoutingPeerModal />);

    const onSaved = contentProps.at(-1)?.onSaved as (r: unknown) => void;
    onSaved({ peerGroups: [], metric: 7, masquerade: true, enabled: true });

    expect(removeChange).toHaveBeenCalledWith("ch-1", { replaced: true });
    expect(addRouterFromSelection).toHaveBeenCalledWith(
      expect.objectContaining({ networkNodeId: "network-new-1", metric: 7 }),
    );
    expect(removeChange.mock.invocationCallOrder[0]).toBeLessThan(
      addRouterFromSelection.mock.invocationCallOrder[0],
    );
  });
});

describe("a peer another pending router of the network already uses", () => {
  const other = {
    ...createRouterChange("real-peer-2"),
    id: "ch-2",
    clientId: "router-2",
    networkClientId: "new-1",
  };
  const edited = {
    ...createRouterChange("real-peer-1"),
    networkClientId: "new-1",
  };
  const elsewhere = { ...other, id: "ch-3", networkClientId: "new-9" };

  it("is not offered in the picker, unlike the edited router's own peer", () => {
    changes = [edited, other, { ...elsewhere, peerId: "real-peer-3" }];
    render(<DraftRoutingPeerModal />);

    expect(contentProps.at(-1)?.assignedPeers).toEqual(["real-peer-2"]);
  });

  it("keeps the edited router and the modal when it is saved anyway", () => {
    changes = [edited, other];
    render(<DraftRoutingPeerModal />);

    const onSaved = contentProps.at(-1)?.onSaved as (r: unknown) => void;
    onSaved({
      peer: { id: "real-peer-2", name: "gateway" },
      peerGroups: [],
      metric: 7,
      masquerade: true,
      enabled: true,
    });

    expect(removeChange).not.toHaveBeenCalled();
    expect(addRouterFromSelection).not.toHaveBeenCalled();
    expect(setRoutingPeerModal).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it("does not block the same peer on another network", () => {
    changes = [edited, elsewhere];
    render(<DraftRoutingPeerModal />);

    const onSaved = contentProps.at(-1)?.onSaved as (r: unknown) => void;
    onSaved({
      peer: { id: "real-peer-2", name: "gateway" },
      peerGroups: [],
      metric: 7,
      masquerade: true,
      enabled: true,
    });

    expect(removeChange).toHaveBeenCalledWith("ch-1", { replaced: true });
    expect(addRouterFromSelection).toHaveBeenCalled();
  });
});

describe("the placeholders offered as routing peers", () => {
  const offered = () =>
    (contentProps.at(-1)?.additionalPeers as { id?: string }[]).map(
      (p) => p.id,
    );

  it("includes a standalone placeholder node", () => {
    changes = [createRouterChange("draft-1")];
    canvasNodes = [
      {
        id: "peer-draft-1",
        data: { placeholderKind: "server", placeholderName: "Office Gateway" },
      },
    ];
    render(<DraftRoutingPeerModal />);

    expect(offered()).toHaveLength(1);
  });

  it("includes a placeholder absorbed into a group", () => {
    changes = [createRouterChange("draft-1")];
    canvasNodes = [
      {
        id: "group-new-1",
        data: {
          group: { name: "Routers" },
          draftPeers: [{ id: "draft-1", name: "Office Gateway" }],
        },
      },
    ];
    render(<DraftRoutingPeerModal />);

    expect(offered()).toEqual(["draft-1"]);
  });
});

describe("editing a live router in the draft", () => {
  const network = { id: "net-1", name: "Office" };
  const pendingCreate = {
    ...createRouterChange("real-peer-2"),
    id: "ch-2",
    clientId: "router-2",
    networkId: "net-1",
  };
  const pendingUpdate = {
    id: "ch-3",
    type: "update-router",
    routerId: "router-live-2",
    networkId: "net-1",
    networkName: "Office",
    peerId: "real-peer-3",
  };
  const open = () => {
    routingPeerModal = { network, router: { id: "router-live-1", peer: "p0" } };
    render(<DraftRoutingPeerModal />);
    return contentProps.at(-1) as {
      assignedPeers: string[];
      onSaved: (r: unknown) => void;
    };
  };
  const pick = (id: string) => ({
    peer: { id, name: id },
    peerGroups: [],
    metric: 7,
    masquerade: true,
    enabled: true,
  });

  it("reserves the peers of pending creates and pending edits of other routers", () => {
    changes = [pendingCreate, pendingUpdate];

    expect(open().assignedPeers).toEqual(["real-peer-2", "real-peer-3"]);
  });

  it("does not reserve the peer of the router's own pending edit", () => {
    changes = [{ ...pendingUpdate, routerId: "router-live-1" }];

    expect(open().assignedPeers).toEqual([]);
  });

  it("refuses a peer a pending router already uses and keeps the editor open", () => {
    changes = [pendingCreate];

    open().onSaved(pick("real-peer-2"));

    expect(notify).toHaveBeenCalledTimes(1);
    expect(updateRouterFromSelection).not.toHaveBeenCalled();
    expect(setRoutingPeerModal).not.toHaveBeenCalled();
  });

  it("records the edit for a free peer", () => {
    changes = [pendingCreate];

    open().onSaved(pick("real-peer-9"));

    expect(updateRouterFromSelection).toHaveBeenCalledWith(
      expect.objectContaining({
        networkId: "net-1",
        routerId: "router-live-1",
      }),
    );
    expect(setRoutingPeerModal).toHaveBeenCalledWith(null);
  });
});
