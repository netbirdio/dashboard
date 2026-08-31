import { describe, expect, it, vi } from "vitest";

// Importing the component module pulls in @utils/api, whose module scope reads
// the runtime config; only the pure helper is under test here.
vi.mock("@utils/api", () => ({ default: () => ({ data: undefined }) }));
vi.mock("@utils/config", () => ({
  default: () => ({ apiOrigin: "http://localhost", redirectURI: "/" }),
}));

const { getOpeningTab } = await import("./PeerGroupSelector");

const base = {
  currentTab: "groups" as const,
  hasResource: false,
  hasSelectedCluster: false,
  showClusters: false,
  showPeers: false,
  showResources: false,
  hideGroupsTab: false,
};

describe("getOpeningTab", () => {
  it("keeps the user's last chosen tab across reopens", () => {
    expect(
      getOpeningTab({ ...base, currentTab: "peers", showPeers: true }),
    ).toBe("peers");
  });

  it("snaps to the peers tab when a peer resource is picked", () => {
    expect(
      getOpeningTab({
        ...base,
        currentTab: "groups",
        hasResource: true,
        resourceType: "peer",
        showPeers: true,
      }),
    ).toBe("peers");
  });

  it("snaps to the resources tab for a non-peer resource", () => {
    expect(
      getOpeningTab({
        ...base,
        currentTab: "peers",
        showPeers: true,
        hasResource: true,
        resourceType: "host",
        showResources: true,
      }),
    ).toBe("resources");
  });

  it("snaps to the clusters tab when a cluster is selected", () => {
    expect(
      getOpeningTab({
        ...base,
        currentTab: "groups",
        hasSelectedCluster: true,
        showClusters: true,
      }),
    ).toBe("clusters");
  });

  it("falls back to initialTab when the last tab is no longer rendered", () => {
    expect(
      getOpeningTab({
        ...base,
        currentTab: "clusters",
        showClusters: false,
        showPeers: true,
        initialTab: "peers",
      }),
    ).toBe("peers");
  });

  it("never lands on a tab hidden by hideGroupsTab", () => {
    expect(
      getOpeningTab({
        ...base,
        currentTab: "groups",
        hideGroupsTab: true,
        showPeers: true,
      }),
    ).toBe("peers");
  });

  it("never lands on a tab outside tabOrder", () => {
    expect(
      getOpeningTab({
        ...base,
        currentTab: "groups",
        showPeers: true,
        showResources: true,
        tabOrder: ["peers", "resources"],
      }),
    ).toBe("peers");
  });

  it("uses the values-independent default on first open", () => {
    expect(getOpeningTab({ ...base, currentTab: "groups" })).toBe("groups");
  });
});
