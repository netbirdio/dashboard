import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A create-router bound to a draft placeholder cannot round-trip the modal: the
// placeholder is not listable in the peer dropdown, so any save would silently
// rebind the router to a different peer or group. Editing is blocked instead.

let routingPeerModal: Record<string, unknown> | null = null;
let changes: Record<string, unknown>[] = [];
const contentProps: Record<string, unknown>[] = [];

vi.mock("swr", () => ({ useSWRConfig: () => ({ mutate: vi.fn() }) }));
vi.mock("@xyflow/react", () => ({
  useReactFlow: () => ({ getNodes: () => [] }),
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
  useDraftChangeset: () => ({ changes, removeChange: vi.fn() }),
}));
vi.mock("@/modules/control-center/hooks/useDraftNetworkActions", () => ({
  useDraftNetworkActions: () => ({
    addRouterFromSelection: vi.fn(),
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
  routingPeerModal = {
    networkNodeId: "network-new-1",
    editChangeId: "ch-1",
  };
});

describe("editing a placeholder-bound router", () => {
  it("blocks the modal with a message instead of dropping the binding", () => {
    changes = [createRouterChange("draft-1")];
    render(<DraftRoutingPeerModal />);

    expect(
      screen.queryByTestId("routing-peer-modal-content"),
    ).toBeNull();
    expect(screen.getByText(/hasn't been installed/i)).toBeTruthy();
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
