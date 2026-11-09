import { TooltipProvider } from "@radix-ui/react-tooltip";
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Peer } from "@/interfaces/Peer";

// Both group peer tables promise "search by owner" through hidden columns that
// read peer.user, but /peers only carries user_id. Each table is driven with
// its real search here, so the tests fail if the owner is not resolved.

const users = [
  { id: "u1", name: "Steve Jobs", email: "steve@example.com" },
  { id: "u2", name: "Ada Lovelace", email: "ada@example.com" },
];
const peers = [
  { id: "p1", name: "macbook", user_id: "u1" },
  { id: "p2", name: "thinkpad", user_id: "u2" },
  { id: "p3", name: "server" },
];
const responses: Record<string, unknown> = {
  "/groups/g1": {
    id: "g1",
    name: "Laptops",
    peers: [{ id: "p1" }, { id: "p2" }, { id: "p3" }],
  },
  "/users?service_user=false": users,
  "/peers": peers,
};

vi.mock("@utils/config", () => ({
  default: () => ({ apiOrigin: "http://localhost", redirectURI: "/" }),
}));
vi.mock("@utils/api", () => ({
  default: (url: string) => ({ data: responses[url] ?? [], isLoading: false }),
  useApiCall: () => ({ put: vi.fn(), post: vi.fn() }),
}));
vi.mock("@/contexts/UsersProvider", () => ({
  useUsers: () => ({ users }),
  useLoggedInUser: () => ({ isOwnerOrAdmin: true }),
}));
vi.mock("@/contexts/PermissionsProvider", () => ({
  usePermissions: () => ({ permission: {} }),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/group",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
// The name cell needs routing and issue icons, the last-seen cell a dayjs
// plugin the app layout registers; only the name matters here.
vi.mock("@/modules/peers/PeerNameCell", () => ({
  default: ({ peer }: { peer: Peer }) => <span>{peer.name}</span>,
}));
vi.mock("@/modules/peers/PeerLastSeenCell", () => ({ default: () => null }));

const { default: useGroupDetails } = await import(
  "@/modules/groups/details/useGroupDetails"
);
const { default: MinimalPeersTable } = await import(
  "@/modules/peer/MinimalPeersTable"
);
const { AssignPeerToGroupModal } = await import(
  "@/modules/groups/AssignPeerToGroupModal"
);

const rowsAfterSearch = async (text: string) => {
  const input = document.querySelector('[data-testid="table-search-input"]')!;
  fireEvent.change(input, { target: { value: text } });
  // The search input debounces for 800ms before it filters.
  act(() => vi.advanceTimersByTime(1000));
  return Array.from(document.querySelectorAll("tbody tr")).map(
    (r) => r.textContent,
  );
};

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("group peers table", () => {
  const renderGroupPeers = () => {
    const { groupDetails } = renderHook(() => useGroupDetails("g1")).result
      .current;
    render(
      <TooltipProvider>
        <MinimalPeersTable
          peers={groupDetails?.peersOfGroup}
          isLoading={false}
        />
      </TooltipProvider>,
    );
  };

  it("finds a peer by its owner's name", async () => {
    renderGroupPeers();
    expect(await rowsAfterSearch("steve")).toEqual(["macbook"]);
  });

  it("finds a peer by its owner's email", async () => {
    renderGroupPeers();
    expect(await rowsAfterSearch("ada@example.com")).toEqual(["thinkpad"]);
  });
});

describe("Assign Peers modal", () => {
  const renderModal = async () => {
    render(
      <TooltipProvider>
        <AssignPeerToGroupModal
          group={{ id: "g1", name: "Laptops", peers: [] }}
          open={true}
          setOpen={vi.fn()}
        />
      </TooltipProvider>,
    );
    await waitFor(() =>
      expect(document.querySelectorAll("tbody tr")).toHaveLength(3),
    );
  };

  it("finds a peer by its owner's name", async () => {
    await renderModal();
    expect(await rowsAfterSearch("steve")).toEqual(["macbook"]);
  });

  it("finds a peer by its owner's email", async () => {
    await renderModal();
    expect(await rowsAfterSearch("ada@example.com")).toEqual(["thinkpad"]);
  });
});
