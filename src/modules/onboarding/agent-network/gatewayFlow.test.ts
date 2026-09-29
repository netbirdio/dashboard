import { describe, expect, it } from "vitest";
import {
  ReverseProxyCluster,
  ReverseProxyClusterType,
} from "@/interfaces/ReverseProxy";
import {
  formatElapsed,
  liveChecklist,
  managedGatewayStages,
  privateAccountClusters,
  resolveGatewayEntry,
  selfDeployPhase,
} from "@/modules/onboarding/agent-network/gatewayFlow";

const cluster = (
  overrides: Partial<ReverseProxyCluster> = {},
): ReverseProxyCluster => ({
  address: "proxy.company.com",
  type: ReverseProxyClusterType.ACCOUNT,
  online: true,
  connected_proxies: 1,
  private: true,
  ...overrides,
});

const loaded = {
  loading: false,
  managedExists: false,
  settingsEndpoint: "",
};

describe("resolveGatewayEntry", () => {
  it("waits until everything has loaded", () => {
    expect(resolveGatewayEntry({ ...loaded, loading: true })).toEqual({
      kind: "loading",
    });
  });

  it("shows the managed deployment even when the settings carry its endpoint", () => {
    // The managed POST writes the settings row before the gateway is ready, so
    // a refresh mid-provisioning has both; it must land on the status view.
    expect(
      resolveGatewayEntry({
        ...loaded,
        managedExists: true,
        settingsEndpoint: "brave-otter.gateway.netbird.io",
      }),
    ).toEqual({ kind: "managed" });
  });

  it("skips an account whose endpoint is served by a proxy of its own or a shared one", () => {
    expect(
      resolveGatewayEntry({
        ...loaded,
        settingsEndpoint: "violet.eu.proxy.netbird.io",
      }),
    ).toEqual({ kind: "configured" });
  });

  it("offers the choice otherwise, private proxies or not", () => {
    // Private proxies the account runs are options on the choice screen, not a
    // path of their own, so the operator can still pick managed or a new one.
    expect(resolveGatewayEntry(loaded)).toEqual({ kind: "choice" });
  });
});

describe("privateAccountClusters", () => {
  it("ignores shared clusters, even private ones", () => {
    // A NetBird-operated private cluster is not one the account runs, and
    // counting it would offer it to every Cloud account.
    expect(
      privateAccountClusters([
        cluster({ type: ReverseProxyClusterType.SHARED }),
      ]),
    ).toEqual([]);
  });

  it("needs the cluster online, connected and private", () => {
    const disqualified = [
      cluster({ online: false }),
      cluster({ connected_proxies: 0 }),
      cluster({ private: false }),
      cluster({ private: undefined }),
    ];
    for (const c of disqualified) {
      expect(
        privateAccountClusters([c]),
        `cluster ${JSON.stringify(c)} should not qualify`,
      ).toEqual([]);
    }
  });

  it("lists every qualifying cluster in order", () => {
    const first = cluster({ address: "a.company.com" });
    const second = cluster({ address: "b.company.com" });
    expect(
      privateAccountClusters([cluster({ private: false }), first, second]),
    ).toEqual([first, second]);
  });

  it("handles a list that has not loaded", () => {
    expect(privateAccountClusters(undefined)).toEqual([]);
  });
});

describe("managedGatewayStages", () => {
  it("reserves the address while the first POST is out", () => {
    expect(managedGatewayStages(undefined)).toEqual({
      reserve: "active",
      deploy: "pending",
      connect: "pending",
    });
  });

  it("spins the deploy stage while provisioning and leaves connect waiting", () => {
    expect(managedGatewayStages("provisioning")).toEqual({
      reserve: "done",
      deploy: "active",
      connect: "pending",
    });
  });

  it("completes every stage at ready", () => {
    expect(managedGatewayStages("ready")).toEqual({
      reserve: "done",
      deploy: "done",
      connect: "done",
    });
  });

  it("marks the deploy stage failed", () => {
    expect(managedGatewayStages("failed")).toEqual({
      reserve: "done",
      deploy: "failed",
      connect: "pending",
    });
  });

  it("claims no progress for an unknown state", () => {
    expect(managedGatewayStages("terminating")).toEqual({
      reserve: "done",
      deploy: "pending",
      connect: "pending",
    });
  });
});

describe("selfDeployPhase", () => {
  it("waits until the cluster appears", () => {
    expect(selfDeployPhase(undefined)).toBe("waiting");
  });

  it("reports a cluster without a connected proxy as found", () => {
    expect(selfDeployPhase(cluster({ connected_proxies: 0 }))).toBe("found");
    expect(selfDeployPhase(cluster({ online: false }))).toBe("found");
  });

  it("flags a registered proxy that is not private", () => {
    expect(selfDeployPhase(cluster({ private: false }))).toBe("not-private");
    expect(selfDeployPhase(cluster({ private: undefined }))).toBe(
      "not-private",
    );
  });

  it("reports a registered private proxy as connected", () => {
    expect(selfDeployPhase(cluster())).toBe("connected");
  });
});

describe("formatElapsed", () => {
  it("renders minutes and zero-padded seconds", () => {
    expect(formatElapsed(0)).toBe("0:00");
    expect(formatElapsed(42)).toBe("0:42");
    expect(formatElapsed(125.9)).toBe("2:05");
    expect(formatElapsed(-3)).toBe("0:00");
  });
});

describe("liveChecklist", () => {
  const policy = { enabled: true, sourceGroups: ["users"] };
  const peerIn = (groupId: string, connected = true) => ({
    connected,
    groups: [{ id: groupId, name: groupId }],
  });

  it("passes with an enabled provider, policy and a connected peer in its source group", () => {
    expect(
      liveChecklist({
        providers: [{ enabled: true }],
        policies: [policy],
        peers: [peerIn("users")],
      }),
    ).toEqual({ provider: true, policy: true, peer: true });
  });

  it("does not count disabled providers or policies", () => {
    expect(
      liveChecklist({
        providers: [{ enabled: false }],
        policies: [{ ...policy, enabled: false }],
        peers: [peerIn("users")],
      }),
    ).toEqual({ provider: false, policy: false, peer: false });
  });

  it("needs the peer connected and in a source group of an enabled policy", () => {
    const base = { providers: [{ enabled: true }], policies: [policy] };
    expect(
      liveChecklist({ ...base, peers: [peerIn("users", false)] }).peer,
      "a disconnected peer should not count",
    ).toBe(false);
    expect(
      liveChecklist({ ...base, peers: [peerIn("admins")] }).peer,
      "a peer outside the source groups should not count",
    ).toBe(false);
    expect(
      liveChecklist({ ...base, peers: [{ connected: true }] }).peer,
      "a peer without groups should not count",
    ).toBe(false);
  });
});
