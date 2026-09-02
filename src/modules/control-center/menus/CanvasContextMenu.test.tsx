import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Any queued change the deploy pre-flight refuses dead-ends the draft, so each item
// is gated on the create permission CHANGE_PERMISSION maps its change type to.
// Placeholder peers queue install-peer, the sink's own exclusion, and stay ungated.

let permission = {
  policies: { create: true },
  groups: { create: true },
  networks: { create: true },
};
let shortcutMap: Record<string, () => void> = {};

vi.mock("@/contexts/PermissionsProvider", () => ({
  usePermissions: () => ({ permission }),
}));
vi.mock("@/modules/control-center/draft/DraftModeContext", () => ({
  useDraftMode: () => ({
    isDraft: true,
    setComponentsPanelOpen: vi.fn(),
    setResourceEditor: vi.fn(),
    setRoutingPeerModal: vi.fn(),
    drillDownNetworkNodeId: null,
  }),
}));
vi.mock("@/modules/control-center/hooks/useDraftGroupActions", () => ({
  useDraftGroupActions: () => ({ addNewGroup: vi.fn() }),
}));
vi.mock("@/modules/control-center/hooks/useDraftNodeCreation", () => ({
  useDraftNodeCreation: () => ({
    addPeerPlaceholder: vi.fn(),
    addBlankNode: vi.fn(),
    addBlankPolicy: vi.fn(),
  }),
}));
vi.mock("@/modules/control-center/hooks/useControlCenterShortcuts", () => ({
  useControlCenterShortcuts: (map: Record<string, () => void>) => {
    shortcutMap = map;
  },
}));
vi.mock("@xyflow/react", () => ({
  useReactFlow: () => ({
    screenToFlowPosition: (p: { x: number; y: number }) => p,
  }),
}));

const { CanvasContextMenu } = await import(
  "@/modules/control-center/menus/CanvasContextMenu"
);

const fullRights = () => ({
  policies: { create: true },
  groups: { create: true },
  networks: { create: true },
});

const openMenu = () => {
  render(
    <div>
      <div className={"react-flow__pane"} data-testid={"pane"} />
      <CanvasContextMenu />
    </div>,
  );
  fireEvent.contextMenu(screen.getByTestId("pane"), {
    clientX: 100,
    clientY: 100,
  });
};

beforeEach(() => {
  permission = fullRights();
  shortcutMap = {};
});

afterEach(cleanup);

describe("CanvasContextMenu creation gates", () => {
  it("offers every item with full create rights", () => {
    openMenu();
    expect(screen.queryByTestId("cc-canvas-menu-new-server")).toBeTruthy();
    expect(screen.queryByTestId("cc-canvas-menu-new-policy")).toBeTruthy();
    expect(screen.queryByTestId("cc-canvas-menu-new-group")).toBeTruthy();
    expect(screen.queryByTestId("cc-canvas-menu-new-network")).toBeTruthy();
    expect(screen.queryByTestId("cc-canvas-menu-new-resource")).toBeTruthy();
  });

  it("hides New Policy without policies.create", () => {
    permission.policies.create = false;
    openMenu();
    expect(screen.queryByTestId("cc-canvas-menu-new-policy")).toBeNull();
    expect(screen.queryByTestId("cc-canvas-menu-new-group")).toBeTruthy();
  });

  it("hides New Group without groups.create", () => {
    permission.groups.create = false;
    openMenu();
    expect(screen.queryByTestId("cc-canvas-menu-new-group")).toBeNull();
  });

  it("hides New Network and New Resource without networks.create", () => {
    permission.networks.create = false;
    openMenu();
    expect(screen.queryByTestId("cc-canvas-menu-new-network")).toBeNull();
    expect(screen.queryByTestId("cc-canvas-menu-new-resource")).toBeNull();
  });

  it("keeps the placeholder items, which queue install-peer, ungated", () => {
    permission = {
      policies: { create: false },
      groups: { create: false },
      networks: { create: false },
    };
    openMenu();
    expect(screen.queryByTestId("cc-canvas-menu-new-server")).toBeTruthy();
    expect(screen.queryByTestId("cc-canvas-menu-new-agent")).toBeTruthy();
  });

  it("renumbers the Alt shortcuts over the remaining items", () => {
    permission = {
      policies: { create: false },
      groups: { create: false },
      networks: { create: false },
    };
    openMenu();
    expect(Object.keys(shortcutMap)).toEqual(["alt+1", "alt+2"]);
  });
});
