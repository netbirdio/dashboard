// Serves a fabricated peer from GET /api/peers so the dashboard behaves as if a
// machine had registered, with no docker and no real client. A real client
// changes the runner's network while it starts and stops, which fails the other
// worker's in-flight navigations with ERR_NETWORK_CHANGED. Everything else
// (groups, policies, setup keys) stays real; only the peer list is extended.
import type { Page, Route } from "@playwright/test";

type PeerGroup = { id: string; name: string };

export type MockPeer = {
  id: string;
  name: string;
  hostname: string;
  ip: string;
  connected: boolean;
  created_at: string;
  last_seen: string;
  last_login: string;
  os: string;
  version: string;
  groups: PeerGroup[];
  ssh_enabled: boolean;
  dns_label: string;
  login_expired: boolean;
  login_expiration_enabled: boolean;
  inactivity_expiration_enabled: boolean;
  approval_required: boolean;
  city_name: string;
  country_code: string;
  connection_ip: string;
  serial_number: string;
  ephemeral: boolean;
  accessible_peers_count: number;
};

function buildPeer(name: string, groups: PeerGroup[]): MockPeer {
  const now = new Date().toISOString();
  return {
    // Not a real xid, so it can never collide with a peer the account has.
    id: `e2e-mock-${name}`,
    name,
    hostname: name,
    ip: "100.92.0.250",
    connected: false,
    created_at: now,
    last_seen: now,
    last_login: now,
    os: "Linux",
    version: "0.0.0-e2e",
    groups,
    ssh_enabled: false,
    dns_label: `${name}.netbird.selfhosted`,
    login_expired: false,
    login_expiration_enabled: false,
    inactivity_expiration_enabled: false,
    approval_required: false,
    city_name: "",
    country_code: "",
    connection_ip: "",
    serial_number: "",
    ephemeral: false,
    accessible_peers_count: 0,
  };
}

const isPeerList = (url: URL) => url.pathname.endsWith("/api/peers");

export type MockPeerRoute = {
  /**
   * Adds the peer to every following /api/peers response. Resolves once the
   * app has actually fetched a list that contains it, so callers wait on the
   * app's own refetch instead of a guessed delay.
   */
  register(name: string, groups: PeerGroup[]): Promise<MockPeer>;
  dispose(): Promise<void>;
};

export async function routeMockPeer(page: Page): Promise<MockPeerRoute> {
  let peer: MockPeer | undefined;
  let onServed: (() => void) | undefined;

  const handler = async (route: Route) => {
    if (route.request().method() !== "GET") return route.fallback();
    const response = await route.fetch();
    if (!peer) return route.fulfill({ response });
    const peers = (await response.json()) as MockPeer[];
    // First, so views that auto-select peers[0] pick it.
    await route.fulfill({ response, json: [peer, ...peers] });
    onServed?.();
  };
  await page.route(isPeerList, handler);

  return {
    register(name, groups) {
      const registered = buildPeer(name, groups);
      const served = new Promise<MockPeer>((resolve) => {
        onServed = () => resolve(registered);
      });
      peer = registered;
      return served;
    },
    dispose: () => page.unroute(isPeerList, handler),
  };
}
