// Serves a fabricated peer from GET /api/peers so the dashboard behaves as if a
// machine had registered, with no docker and no real client. A real client
// changes the runner's network while it starts and stops, which fails the other
// worker's in-flight navigations with ERR_NETWORK_CHANGED. Everything else
// (groups, policies, setup keys) stays real; only the peer list is extended and
// the groups the peer registered with are patched to list it as a member, since
// the API no longer sends groups on a peer and the dashboard derives them from
// GET /api/v1alpha1/groups, or /api/groups on a management without it.
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

function buildPeer(name: string): MockPeer {
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
const isGroupRequest = (url: URL) =>
  /\/api\/(v1alpha1\/)?groups(\/[^/]+)?$/.test(url.pathname);

type GroupBody = {
  id?: string;
  peers?: (string | { id: string; name?: string })[];
  peers_count?: number;
};

// Appends the peer in the shape the response already uses: ids from a new
// management, {id, name} objects from one that has not changed yet.
function withMember(group: GroupBody, peer: MockPeer): GroupBody {
  const members = group.peers ?? [];
  const legacy = members.some((m) => typeof m !== "string");
  const member = legacy ? { id: peer.id, name: peer.name } : peer.id;
  return {
    ...group,
    peers: [...members, member],
    peers_count: (group.peers_count ?? members.length) + 1,
  };
}

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
  let groupIds = new Set<string>();
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

  const groupHandler = async (route: Route) => {
    if (route.request().method() !== "GET") return route.fallback();
    const response = await route.fetch();
    if (!peer || !response.ok()) return route.fulfill({ response });
    const mock = peer;
    const body = (await response.json()) as GroupBody | GroupBody[];
    const patch = (g: GroupBody) =>
      g.id && groupIds.has(g.id) ? withMember(g, mock) : g;
    await route.fulfill({
      response,
      json: Array.isArray(body) ? body.map(patch) : patch(body),
    });
  };
  await page.route(isGroupRequest, groupHandler);

  return {
    register(name, groups) {
      const registered = buildPeer(name);
      groupIds = new Set(groups.map((g) => g.id));
      const served = new Promise<MockPeer>((resolve) => {
        onServed = () => resolve(registered);
      });
      peer = registered;
      return served;
    },
    dispose: async () => {
      await page.unroute(isPeerList, handler);
      await page.unroute(isGroupRequest, groupHandler);
    },
  };
}
