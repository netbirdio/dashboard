import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RoutingPeerRow } from "@/modules/control-center/panels/RoutingPeersBar";

// Live Add and per-row edit hit the routers API directly, so they follow the
// node menu's networks.update gate (hidden, not disabled); draft actions only
// queue changes the deploy pre-flight re-checks, so draft mode stays ungated.

let isDraft = false;
let networksUpdate = true;

// The bar's import graph reaches @utils/api, whose module init reads the
// window config that doesn't exist under vitest.
vi.mock("@utils/api", () => ({
  default: () => ({ data: undefined, isLoading: false }),
  useApiCall: () => ({}),
}));
vi.mock("@/contexts/PermissionsProvider", () => ({
  usePermissions: () => ({
    permission: { networks: { update: networksUpdate } },
  }),
}));
vi.mock("@/modules/control-center/draft/DraftModeContext", () => ({
  useDraftMode: () => ({ isDraft }),
}));

const { RoutingPeersBar } = await import(
  "@/modules/control-center/panels/RoutingPeersBar"
);

const row = (over: Partial<RoutingPeerRow> = {}): RoutingPeerRow => ({
  key: "api-1",
  name: "Router",
  isGroup: false,
  enabled: true,
  onEdit: vi.fn(),
  ...over,
});

const onAdd = vi.fn();
const renderBar = (rows: RoutingPeerRow[] = [row()]) =>
  render(
    <RoutingPeersBar
      rows={rows}
      count={rows.length}
      onAdd={onAdd}
    />,
  );

beforeEach(() => {
  isDraft = false;
  networksUpdate = true;
  onAdd.mockClear();
});

afterEach(cleanup);

describe("RoutingPeersBar permission gate", () => {
  it("shows Add in live mode with networks.update", () => {
    renderBar();
    expect(screen.queryByText("Add")).toBeTruthy();
  });

  it("hides Add in live mode without networks.update", () => {
    networksUpdate = false;
    renderBar();
    expect(screen.queryByText("Add")).toBeNull();
  });

  it("keeps Add in draft mode without networks.update", () => {
    isDraft = true;
    networksUpdate = false;
    renderBar();
    expect(screen.queryByText("Add")).toBeTruthy();
  });

  it("does not invoke onAdd from the empty-state trigger without permission", () => {
    networksUpdate = false;
    renderBar([]);
    fireEvent.click(screen.getByText("No Routing Peer"));
    expect(onAdd).not.toHaveBeenCalled();
  });
});
