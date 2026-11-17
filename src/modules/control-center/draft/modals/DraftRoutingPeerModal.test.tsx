import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let routingPeerModal: Record<string, unknown> | null = null;
let changes: Record<string, unknown>[] = [];
const contentProps: Record<string, unknown>[] = [];
const removeChange = vi.fn();
const addRouterFromSelection = vi.fn();

vi.mock("swr", () => ({ useSWRConfig: () => ({ mutate: vi.fn() }) }));
let canvasNodes: Record<string, unknown>[] = [];
vi.mock("@xyflow/react", () => ({
  useReactFlow: () => ({ getNodes: () => canvasNodes }),
}));
vi.mock("lucide-react", () => ({ Share2Icon: () => null }));
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
  default: ({ title, description }: { title?: string; description?: string }) => (
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
    setRoutingPeerModal: vi.fn(),
  }),
}));
vi.mock("@/modules/control-center/draft/DraftChangesetContext", () => ({
  useDraftChangeset: () => ({ changes, removeChange }),
}));
vi.mock("@/modules/control-center/hooks/useDraftNetworkActions", () => ({
  useDraftNetworkActions: () => ({
    addRouterFromSelection,
    updateRouterFromSelection: vi.fn(),
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

    expect(
      screen.getByTestId("routing-peer-modal-content"),
    ).toBeTruthy();
    const router = contentProps.at(-1)?.router as { peer?: string };
    expect(router?.peer).toBe("draft-1");
  });

  it("still edits a router bound to a real peer", () => {
    changes = [createRouterChange("real-peer-1")];
    render(<DraftRoutingPeerModal />);

    expect(
      screen.getByTestId("routing-peer-modal-content"),
    ).toBeTruthy();
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

describe("the placeholders offered as routing peers", () => {
  const offered = () =>
    (contentProps.at(-1)?.additionalPeers as { id?: string }[]).map((p) => p.id);

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
