import { cleanup, render, screen } from "@testing-library/react";
import { act } from "react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Network } from "@/interfaces/Network";

// The frame node carries the PATCHED draft state. The originals handed to
// trackUpdateNetwork decide whether a rename BACK clears the change, so they
// must come from live data, never from the frame.
let networkEditor: { networkNodeId: string } | null = null;
let isDraft = true;
let changes: unknown[] = [];
let liveNetworks: Network[] = [];
let frameNetwork: Network | undefined;
let savedValues = { name: "", description: "" as string | undefined };
const trackUpdateNetwork = vi.fn();
const renameDraftNetwork = vi.fn();

vi.mock("@components/modal/Modal", () => ({
  Modal: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
}));
vi.mock("@/modules/networks/NetworkModal", () => ({
  NetworkModalContent: ({
    onSaved,
  }: {
    onSaved?: (values: { name: string; description?: string }) => void;
  }) => <button onClick={() => onSaved?.(savedValues)}>save-network</button>,
}));
vi.mock("@xyflow/react", () => ({
  useReactFlow: () => ({
    getNodes: () => [
      {
        id: "network-n1",
        data: { network: frameNetwork },
      },
    ],
    setNodes: vi.fn(),
  }),
}));
vi.mock("swr", () => ({ useSWRConfig: () => ({ mutate: vi.fn() }) }));
vi.mock("@/modules/control-center/draft/DraftModeContext", () => ({
  useDraftMode: () => ({
    isDraft,
    networkEditor,
    setNetworkEditor: vi.fn(),
  }),
}));
vi.mock("@/modules/control-center/draft/DraftChangesetContext", () => ({
  useDraftChangeset: () => ({ changes, trackUpdateNetwork }),
}));
vi.mock("@/modules/control-center/hooks/useDraftNetworkActions", () => ({
  useDraftNetworkActions: () => ({ renameDraftNetwork }),
}));
vi.mock("@/modules/control-center/hooks/useControlCenterData", () => ({
  useControlCenterData: () => ({ networks: liveNetworks }),
}));

const { DraftNetworkEditModal } = await import(
  "@/modules/control-center/draft/modals/DraftNetworkEditModal"
);

afterEach(cleanup);
beforeEach(() => {
  trackUpdateNetwork.mockClear();
  renameDraftNetwork.mockClear();
  networkEditor = { networkNodeId: "network-n1" };
  isDraft = true;
  changes = [];
  liveNetworks = [];
  frameNetwork = undefined;
  savedValues = { name: "", description: undefined };
});

const save = async () => {
  render(<DraftNetworkEditModal />);
  await act(async () => {
    screen.getByText("save-network").click();
  });
};

describe("editing an existing network that a draft edit already renamed", () => {
  it("tracks originals from the LIVE network, not the patched frame", async () => {
    frameNetwork = { id: "n1", name: "Prod2", description: "d2" } as Network;
    liveNetworks = [{ id: "n1", name: "Prod", description: "d" } as Network];
    savedValues = { name: "Prod", description: "d" };

    await save();

    expect(trackUpdateNetwork).toHaveBeenCalledWith({
      networkId: "n1",
      name: "Prod",
      originalName: "Prod",
      description: "d",
      originalDescription: "d",
    });
  });

  it("falls back to the pending change's stored originals when live data lacks the network", async () => {
    frameNetwork = { id: "n1", name: "Prod2", description: "d2" } as Network;
    liveNetworks = [];
    changes = [
      {
        id: "u1",
        type: "update-network",
        networkId: "n1",
        name: "Prod2",
        originalName: "Prod",
        description: "d2",
        originalDescription: "d",
      },
    ];
    savedValues = { name: "Prod3", description: "d3" };

    await save();

    expect(trackUpdateNetwork).toHaveBeenCalledWith({
      networkId: "n1",
      name: "Prod3",
      originalName: "Prod",
      description: "d3",
      originalDescription: "d",
    });
  });
});
