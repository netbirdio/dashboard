import { cleanup, render, screen } from "@testing-library/react";
import { act } from "react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Group } from "@/interfaces/Group";
import type { PolicyRuleResource } from "@/interfaces/Policy";

// A pick the connect guards cannot apply must not close the modal as if it had
// succeeded: the incompatible pick disables Connect and says why.
let nodes: unknown[] = [];
let networkDestinationPicker: {
  networkNodeId: string;
  policyNodeId: string;
} | null = null;
const setNetworkDestinationPicker = vi.fn();
const updateDraftPolicy = vi.fn();

// The selector's own behavior is out of scope; the stub only hands picks back.
let pickGroups: (groups: Group[]) => void = () => {};
let pickResource: (r?: PolicyRuleResource) => void = () => {};
vi.mock("@components/PeerGroupSelector", () => ({
  PeerGroupSelector: (props: {
    onChange: (groups: Group[]) => void;
    onResourceChange: (r?: PolicyRuleResource) => void;
  }) => {
    pickGroups = props.onChange;
    pickResource = props.onResourceChange;
    return <div data-testid={"selector"} />;
  },
}));
vi.mock("@/modules/control-center/contexts/ControlCenterContext", () => ({
  useCanvasState: () => ({ nodes }),
}));
vi.mock(
  "@/modules/control-center/contexts/ControlCenterPolicyModals",
  () => ({
    useControlCenterPolicy: () => ({ updateDraftPolicy }),
  }),
);
vi.mock("@/modules/control-center/draft/DraftModeContext", () => ({
  useDraftMode: () => ({
    networkDestinationPicker,
    setNetworkDestinationPicker,
  }),
}));
vi.mock("@/modules/control-center/hooks/useControlCenterData", () => ({
  useControlCenterData: () => ({ groups: [], networkResources: [] }),
}));
vi.mock("@components/modal/Modal", () => ({
  Modal: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
  ModalClose: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
  ModalContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ModalFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

const { DraftNetworkDestinationModal } = await import(
  "@/modules/control-center/draft/modals/DraftNetworkDestinationModal"
);

const buildNodes = (rule: Record<string, unknown>) => [
  {
    id: "network-net1",
    data: { network: { name: "Net" } },
  },
  {
    id: "resource-new-r1",
    parentId: "network-net1",
    data: { resource: { name: "R", address: "10.0.0.1" } },
  },
  {
    id: "policy-p1",
    data: {
      policy: {
        id: "p1",
        name: "P",
        rules: [rule],
      },
    },
  },
];

const connectButton = () =>
  screen.getByText("Connect").closest("button") as HTMLButtonElement;

afterEach(cleanup);
beforeEach(() => {
  setNetworkDestinationPicker.mockClear();
  updateDraftPolicy.mockClear();
  networkDestinationPicker = {
    networkNodeId: "network-net1",
    policyNodeId: "policy-p1",
  };
});

describe("a resource pick against existing group destinations", () => {
  beforeEach(() => {
    nodes = buildNodes({
      sources: [{ id: "g0", name: "Src" }],
      destinations: [{ id: "g1", name: "Dest" }],
    });
  });

  it("explains the conflict and disables Connect instead of closing silently", async () => {
    render(<DraftNetworkDestinationModal />);
    await act(async () => {
      pickResource({ id: "new-r1", type: "host" } as PolicyRuleResource);
    });

    expect(screen.getByTestId("network-destination-blocked")).toBeTruthy();
    expect(connectButton().disabled).toBe(true);

    await act(async () => {
      connectButton().click();
    });
    expect(updateDraftPolicy).not.toHaveBeenCalled();
    expect(setNetworkDestinationPicker).not.toHaveBeenCalled();
  });

  it("still connects additional groups", async () => {
    render(<DraftNetworkDestinationModal />);
    await act(async () => {
      pickGroups([{ id: "g2", name: "More" } as Group]);
    });

    expect(screen.queryByTestId("network-destination-blocked")).toBeNull();
    expect(connectButton().disabled).toBe(false);

    await act(async () => {
      connectButton().click();
    });
    expect(updateDraftPolicy).toHaveBeenCalledTimes(1);
    const saved = updateDraftPolicy.mock.calls[0][0];
    expect(saved.rules[0].destinations.map((g: Group) => g.id)).toEqual([
      "g1",
      "g2",
    ]);
    expect(setNetworkDestinationPicker).toHaveBeenCalledWith(null);
  });
});

describe("a policy that already has a resource destination", () => {
  it("says so up front and keeps Connect disabled", async () => {
    nodes = buildNodes({
      sources: [{ id: "g0", name: "Src" }],
      destinations: [],
      destinationResource: { id: "r-live", type: "host" },
    });
    render(<DraftNetworkDestinationModal />);

    expect(screen.getByTestId("network-destination-blocked")).toBeTruthy();

    await act(async () => {
      pickGroups([{ id: "g2", name: "More" } as Group]);
    });
    expect(connectButton().disabled).toBe(true);
    expect(updateDraftPolicy).not.toHaveBeenCalled();
  });
});
