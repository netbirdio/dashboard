import { cleanup, render, screen } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

// A group deletion can strip a DRAFT policy bare. Its create-policy change is KEPT
// rather than dropped, so it needs a blocking issue — and that badge has to lead
// somewhere, or it reads as clickable and does nothing.
const setSelectedPolicy = vi.fn();
const setPolicyModalOpen = vi.fn();
let changes: unknown[] = [];
let isDeploying = false;
let liveGroups: unknown[] = [];

vi.mock("@utils/config", () => ({
  default: () => ({ apiOrigin: "http://localhost", redirectURI: "/" }),
}));
vi.mock("@xyflow/react", () => ({
  useReactFlow: () => ({ getNodes: () => [] }),
}));
vi.mock("@/modules/control-center/hooks/useDeployChangeset", () => ({
  useDeployChangeset: () => ({
    deploy: vi.fn(),
    isDeploying,
    deployStatus: {},
  }),
}));
vi.mock("@/modules/control-center/hooks/useRemoveChange", () => ({
  useRemoveChange: () => ({
    removeWithCascade: vi.fn(),
    previewRemove: () => ({ summary: "", effects: [] }),
  }),
}));
vi.mock("@/modules/control-center/hooks/useControlCenterData", () => ({
  useControlCenterData: () => ({
    policies: [],
    groups: liveGroups,
    networks: [],
    networkResources: [],
  }),
}));
vi.mock("@/modules/control-center/draft/DraftModeContext", () => ({
  useDraftMode: () => ({
    setResourceNetworkPicker: vi.fn(),
    setInstallModal: vi.fn(),
    setUserDeviceModal: vi.fn(),
  }),
}));
vi.mock(
  "@/modules/control-center/contexts/ControlCenterPolicyModals",
  () => ({
    useControlCenterPolicy: () => ({ setSelectedPolicy, setPolicyModalOpen }),
  }),
);
vi.mock("@/modules/control-center/draft/DraftChangesetContext", async () => {
  const actual = await vi.importActual<
    typeof import("@/modules/control-center/draft/DraftChangesetContext")
  >("@/modules/control-center/draft/DraftChangesetContext");
  return {
    ...actual,
    useDraftChangeset: () => ({ changes, clearChanges: vi.fn() }),
  };
});

const { ReviewDeployModal } = await import(
  "@/modules/control-center/draft/modals/ReviewDeployModal"
);

// What deleteGroups leaves behind when the deleted group was this draft
// policy's only source: stripped, tagged, and no longer deployable.
const strippedDraftPolicy = {
  id: "c1",
  type: "create-policy",
  clientId: "new-abc",
  name: "Web to DB",
  policy: {
    id: "new-abc",
    name: "Web to DB",
    enabled: true,
    rules: [{ sources: [], destinations: [{ id: "g3", name: "Prod" }] }],
  },
  groupDeletion: { groupIds: ["g1"], basePolicy: {} },
};

afterEach(cleanup);
beforeEach(() => {
  setSelectedPolicy.mockClear();
  setPolicyModalOpen.mockClear();
  changes = [strippedDraftPolicy];
  isDeploying = false;
  liveGroups = [];
});

describe("an incomplete draft policy in Review & Deploy", () => {
  it("shows the blocking issue rather than vanishing from the list", () => {
    render(
      <ReviewDeployModal
        open={true}
        onOpenChange={vi.fn()}
        onDeployed={vi.fn()}
      />,
    );

    expect(screen.getByText("Incomplete")).toBeTruthy();
  });

  it("opens the policy editor from its badge", async () => {
    render(
      <ReviewDeployModal
        open={true}
        onOpenChange={vi.fn()}
        onDeployed={vi.fn()}
      />,
    );

    await act(async () => {
      screen.getByText("Incomplete").click();
    });

    expect(setSelectedPolicy).toHaveBeenCalledWith("new-abc");
    expect(setPolicyModalOpen).toHaveBeenCalledWith(true);
  });
});

// A canvas removal can strip a pending EDIT of an existing policy one-sided. The
// change stays, blocked as Incomplete, and its badge must open the same editor.
describe("an incomplete pending policy edit in Review & Deploy", () => {
  const strippedUpdate = {
    id: "c2",
    type: "update-policy",
    policyId: "p1",
    name: "Web to DB",
    origin: "edit",
    policy: {
      id: "p1",
      name: "Web to DB",
      enabled: true,
      rules: [{ sources: [], destinations: [{ id: "g3", name: "Prod" }] }],
    },
  };

  beforeEach(() => {
    changes = [strippedUpdate];
  });

  it("opens the policy editor from its badge", async () => {
    render(
      <ReviewDeployModal
        open={true}
        onOpenChange={vi.fn()}
        onDeployed={vi.fn()}
      />,
    );

    await act(async () => {
      screen.getByText("Incomplete").click();
    });

    expect(setSelectedPolicy).toHaveBeenCalledWith("p1");
    expect(setPolicyModalOpen).toHaveBeenCalledWith(true);
  });
});

// The row diffs are frozen during a run so the mid-deploy revalidation cannot
// recompute them under the user. The freeze has to lift when the RUN ends, not
// when the changeset empties: a partial failure leaves changes behind.
describe("the frozen live snapshot", () => {
  const updateGroup = {
    id: "u1",
    type: "update-group",
    groupId: "g1",
    name: "Servers",
    originalName: "Servers",
    peerIds: ["p2"],
    resourceIds: [],
  };
  const groupWith = (peers: string[]) => [
    { id: "g1", name: "Servers", peers, resources: [] },
  ];

  const modal = () => (
    <ReviewDeployModal open={true} onOpenChange={vi.fn()} onDeployed={vi.fn()} />
  );
  // The diff renders one element per line and a peer id shows on both sides of it, so
  // the whole rendered body is the readable assertion here.
  const shownDiff = () => document.body.textContent ?? "";

  beforeEach(() => {
    changes = [updateGroup];
    liveGroups = groupWith(["p1"]);
  });

  it("holds the pre-deploy membership while the run is in flight", async () => {
    const { rerender } = render(modal());
    expect(shownDiff()).toContain("p1");

    isDeploying = true;
    await act(async () => rerender(modal()));
    // Another admin's add lands mid-run; the rows must not flip under the user.
    liveGroups = groupWith(["p1", "p9"]);
    await act(async () => rerender(modal()));

    expect(shownDiff()).not.toContain("p9");
  });

  it("releases it when the run ends, even though changes remain", async () => {
    const { rerender } = render(modal());
    isDeploying = true;
    await act(async () => rerender(modal()));
    liveGroups = groupWith(["p1", "p9"]);

    // Change 3 of 5 failed: the modal stays open with changes still pending, and the
    // deploy's finally block has already revalidated /groups.
    isDeploying = false;
    await act(async () => rerender(modal()));

    // The retry merges onto a FRESH read, so the diff the user re-approves has to be
    // computed from current live data, not the snapshot taken before the first attempt.
    expect(shownDiff()).toContain("p9");
    expect(changes).toHaveLength(1);
  });
});
