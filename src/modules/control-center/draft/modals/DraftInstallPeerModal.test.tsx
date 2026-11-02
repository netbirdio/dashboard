import { cleanup, render } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SetupKey } from "@/interfaces/SetupKey";

// Removing a placeholder REVOKES its setup key, but undo restores the node still
// holding that dead key — and SetupModal hides its key generator whenever a key is
// passed in, so the row sat on "Waiting" forever. The modal reconciles on open instead.

let installModal: Record<string, unknown> | null = null;
let nodes: { id: string; data: Record<string, unknown> }[] = [];
let key: SetupKey | undefined;
let keyReadFails = false;

const setNodes = vi.fn((fn: (prev: unknown[]) => unknown[]) => {
  nodes = fn(nodes) as typeof nodes;
});
const clearInstallPeerKey = vi.fn();
// What SetupModal actually received, which is the whole point: a dead key must not
// reach it, or the generator stays hidden.
const setupModalProps: Record<string, unknown>[] = [];

vi.mock("@xyflow/react", () => ({
  useReactFlow: () => ({ getNodes: () => nodes, setNodes }),
}));
vi.mock("@axa-fr/react-oidc", () => ({ useOidcUser: () => ({ oidcUser: {} }) }));
vi.mock("@utils/api", () => ({
  useApiCall: (url: string) => ({
    get: async () => {
      if (url !== "/setup-keys") return undefined;
      if (keyReadFails) throw new Error("gone");
      return key;
    },
    post: async () => ({ id: "g-new" }),
    put: async () => ({}),
    del: async () => ({}),
  }),
}));
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
vi.mock("@components/modal/ModalHeader", () => ({ default: () => null }));
vi.mock("@components/Button", () => ({
  default: ({ children }: { children?: React.ReactNode }) => (
    <button>{children}</button>
  ),
}));
vi.mock("@/modules/setup-netbird-modal/SetupModal", () => ({
  default: (props: Record<string, unknown>) => {
    setupModalProps.push(props);
    return null;
  },
}));
vi.mock("@/modules/control-center/draft/DraftModeContext", () => ({
  useDraftMode: () => ({ installModal, setInstallModal: vi.fn() }),
}));
vi.mock("@/modules/control-center/hooks/useControlCenterData", () => ({
  useControlCenterData: () => ({ groups: [] }),
}));
const registerArtifacts = vi.fn();
const revokeSetupKey = vi.fn();
// What the registry (not the node data) knows about the placeholder's key.
let registryKeyId: string | undefined;
vi.mock("@/modules/control-center/hooks/usePlaceholderArtifacts", () => ({
  usePlaceholderArtifacts: () => ({
    registerArtifacts,
    revokeSetupKey,
    registeredSetupKeyId: () => registryKeyId,
  }),
}));
vi.mock("@/modules/control-center/draft/DraftChangesetContext", () => ({
  useDraftChangeset: () => ({
    changes: [],
    markInstallPeerWaiting: vi.fn(),
    clearInstallPeerKey,
  }),
}));

const { DraftInstallPeerModal } = await import(
  "@/modules/control-center/draft/modals/DraftInstallPeerModal"
);

const placeholder = (over: Record<string, unknown> = {}) => ({
  id: "peer-draft-1",
  data: {
    placeholderKind: "server",
    placeholderName: "Server",
    setupKey: "AAAA-BBBB",
    setupKeyId: "sk-1",
    ...over,
  },
});

const open = async () => {
  render(<DraftInstallPeerModal />);
  await act(async () => void (await Promise.resolve()));
};

const lastProps = () => setupModalProps.at(-1);
const nodeData = () => nodes.find((n) => n.id === "peer-draft-1")?.data;

afterEach(cleanup);
beforeEach(() => {
  setNodes.mockClear();
  clearInstallPeerKey.mockClear();
  registerArtifacts.mockClear();
  revokeSetupKey.mockClear();
  registryKeyId = undefined;
  setupModalProps.length = 0;
  keyReadFails = false;
  nodes = [placeholder()];
  installModal = {
    nodeId: "peer-draft-1",
    isUserDevice: false,
    placeholderKind: "server",
    setupKey: "AAAA-BBBB",
  };
  key = { id: "sk-1", name: "Draft Server", revoked: false } as SetupKey;
});

describe("a placeholder restored after its key was revoked", () => {
  it("withholds the dead key from SetupModal so the generator returns", async () => {
    key = { id: "sk-1", name: "Draft Server", revoked: true } as SetupKey;
    await open();

    expect(lastProps()?.setupKey).toBeUndefined();
  });

  it("clears the key off the node and the changeset row", async () => {
    key = { id: "sk-1", name: "Draft Server", revoked: true } as SetupKey;
    await open();

    expect(nodeData()?.setupKey).toBeUndefined();
    expect(nodeData()?.setupKeyId).toBeUndefined();
    expect(clearInstallPeerKey).toHaveBeenCalledWith("draft-1");
  });

  // Teardown may have deleted it outright rather than revoking it; either way the
  // local copy is dead and hiding the generator behind it is the same bug.
  it("treats a key the API no longer has as dead too", async () => {
    keyReadFails = true;
    await open();

    expect(lastProps()?.setupKey).toBeUndefined();
    expect(clearInstallPeerKey).toHaveBeenCalledWith("draft-1");
  });
});

describe("a placeholder whose key is still good", () => {
  it("passes the key straight through and touches nothing", async () => {
    await open();

    expect(lastProps()?.setupKey).toBe("AAAA-BBBB");
    expect(clearInstallPeerKey).not.toHaveBeenCalled();
    expect(nodeData()?.setupKeyId).toBe("sk-1");
  });

  it("does not read the API at all when no key was passed in", async () => {
    installModal = {
      nodeId: "peer-draft-1",
      isUserDevice: false,
      placeholderKind: "server",
    };
    key = { id: "sk-1", name: "Draft Server", revoked: true } as SetupKey;
    await open();

    // Nothing to reconcile: the generator is already showing.
    expect(clearInstallPeerKey).not.toHaveBeenCalled();
  });
});

// The persisted hostname is what the copied install command carries, so the
// watcher must keep waiting on it even when the computed suffixes have shifted.
// Only the first stamp counts.
describe("the persisted install hostname", () => {
  const userDeviceModal = () => {
    installModal = {
      nodeId: "peer-draft-1",
      isUserDevice: true,
      placeholderKind: "user-device",
    };
    nodes = [
      placeholder({
        placeholderKind: "user-device",
        placeholderName: "Laptop",
        setupKey: undefined,
        setupKeyId: undefined,
      }),
    ];
  };

  it("stamps hostname and start time on first open", async () => {
    userDeviceModal();
    await open();

    expect(nodeData()?.installHostname).toBe("laptop");
    expect(typeof nodeData()?.installStartedAt).toBe("number");
  });

  it("keeps an existing stamp when the computed hostname has shifted", async () => {
    userDeviceModal();
    nodes[0].data.installHostname = "laptop-1";
    nodes[0].data.installStartedAt = 1000;
    await open();

    expect(nodeData()?.installHostname).toBe("laptop-1");
    expect(nodeData()?.installStartedAt).toBe(1000);
  });

  // The command SetupModal renders embeds the hostname, so showing a freshly
  // computed one next to a diverging stamp hands the user a command the
  // watcher will never match.
  it("hands SetupModal the stamp, not the recomputed hostname", async () => {
    userDeviceModal();
    nodes[0].data.installHostname = "laptop-1";
    await open();

    expect(lastProps()?.hostname).toBe("laptop-1");
  });

  it("reads the stamp off a draftPeers entry for an absorbed placeholder", async () => {
    installModal = {
      nodeId: "peer-draft-1",
      isUserDevice: true,
      placeholderKind: "user-device",
    };
    nodes = [
      {
        id: "group-g1",
        data: {
          group: { id: "g1", name: "Laptops" },
          draftPeers: [
            { id: "draft-1", name: "Laptop", installHostname: "laptop-1" },
          ],
        },
      },
    ];
    await open();

    expect(lastProps()?.hostname).toBe("laptop-1");
  });
});

// The registry can know a live key the node data lost to an undo; generating a
// replacement is the moment the superseded credential has to be revoked.
describe("generating a key over a superseded one", () => {
  const generate = async () => {
    installModal = {
      nodeId: "peer-draft-1",
      isUserDevice: false,
      placeholderKind: "server",
    };
    nodes = [placeholder({ setupKey: undefined, setupKeyId: undefined })];
    await open();
    await act(async () => {
      (
        lastProps()?.onSetupKeyGenerated as (k: Partial<SetupKey>) => void
      )?.({ id: "sk-2", key: "CCCC-DDDD" });
    });
  };

  it("revokes the key the registry still knows about", async () => {
    registryKeyId = "sk-old";
    await generate();

    expect(revokeSetupKey).toHaveBeenCalledWith("sk-old");
    expect(registerArtifacts).toHaveBeenCalledWith("draft-1", {
      setupKeyId: "sk-2",
    });
  });

  it("revokes nothing when the registry knows no earlier key", async () => {
    await generate();

    expect(revokeSetupKey).not.toHaveBeenCalled();
  });

  // A reconcile can clear a dead key while the bound group stays reusable; the
  // new key then carries that group in auto_groups, so both have to reach the
  // registry in ONE call for teardown to delete the key before the group.
  it("registers the new key together with a reused bound group", async () => {
    installModal = {
      nodeId: "peer-draft-1",
      isUserDevice: false,
      placeholderKind: "server",
    };
    nodes = [
      placeholder({
        setupKey: undefined,
        setupKeyId: undefined,
        boundGroupId: "g-1",
      }),
    ];
    await open();
    await act(async () => {
      (
        lastProps()?.onSetupKeyGenerated as (k: Partial<SetupKey>) => void
      )?.({ id: "sk-2", key: "CCCC-DDDD" });
    });

    expect(registerArtifacts).toHaveBeenCalledWith("draft-1", {
      setupKeyId: "sk-2",
      boundGroupId: "g-1",
    });
  });
});

// A placeholder absorbed into a group has no node of its own; its fields live on the
// group node's draftPeers, and the reconciliation has to reach them there too.
describe("a placeholder absorbed into a group", () => {
  it("clears the dead key off its draftPeers entry", async () => {
    nodes = [
      {
        id: "group-g1",
        data: {
          group: { id: "g1", name: "Servers" },
          draftPeers: [
            {
              id: "draft-1",
              name: "Server",
              os: "draft-server",
              setupKey: "AAAA-BBBB",
              setupKeyId: "sk-1",
            },
          ],
        },
      },
    ];
    key = { id: "sk-1", name: "Draft Server", revoked: true } as SetupKey;
    await open();

    const held = nodes[0].data.draftPeers as Record<string, unknown>[];
    expect(held[0].setupKeyId).toBeUndefined();
    expect(clearInstallPeerKey).toHaveBeenCalledWith("draft-1");
  });
});
