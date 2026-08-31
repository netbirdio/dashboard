// The app uses OIDC service-worker auth, so page.request carries no Bearer
// token: it is intercepted off a real API response and passed explicitly.
import type { Page } from "@playwright/test";

type Group = {
  id: string;
  name: string;
  peers_count: number;
  resources_count: number;
};

const apiContextCache = new WeakMap<Page, { token: string; origin: string }>();

async function getApiContext(
  page: Page,
): Promise<{ token: string; origin: string }> {
  const cached = apiContextCache.get(page);
  if (cached) return cached;

  // Set E2E_DEBUG_API=1 to log every API response the predicate considers.
  const debugApi = !!process.env.E2E_DEBUG_API;
  const [response] = await Promise.all([
    page.waitForResponse(
      (resp) => {
        const req = resp.request();
        if (!resp.url().includes("/api/")) return false;
        // A tokenless 200 can arrive before the service worker injects the token.
        const isMatch =
          req.method() === "GET" &&
          resp.status() === 200 &&
          !!req.headers()["authorization"];
        if (debugApi) {
          // eslint-disable-next-line no-console
          console.log(
            `[api-context] ${req.method()} ${resp.status()} ${resp.url()} ${
              isMatch ? "← MATCH" : "(skipped)"
            }`,
          );
        }
        return isMatch;
      },
      // `next dev` compiles the route on demand before any /api response comes.
      { timeout: 30_000 },
    ),
    page.goto("/team/users", { timeout: 30_000 }),
  ]);

  const request = response.request();
  const authHeader = (await request.allHeaders())["authorization"] || "";
  const token = authHeader.replace("Bearer ", "");
  const url = new URL(request.url());
  const origin = `${url.protocol}//${url.host}`;

  if (!token) {
    throw new Error("Could not capture auth token from API response");
  }

  const ctx = { token, origin };
  apiContextCache.set(page, ctx);
  return ctx;
}

async function apiGet<T>(page: Page, path: string): Promise<T> {
  const { token, origin } = await getApiContext(page);
  const resp = await page.request.get(`${origin}/api${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return resp.json();
}

async function apiDelete(page: Page, path: string): Promise<void> {
  const { token, origin } = await getApiContext(page);
  await page.request.delete(`${origin}/api${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function apiPost<T>(page: Page, path: string, body: unknown): Promise<T> {
  const { token, origin } = await getApiContext(page);
  const resp = await page.request.post(`${origin}/api${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: body,
  });
  if (!resp.ok()) {
    throw new Error(
      `POST ${path} returned ${resp.status()}: ${await resp.text()}`,
    );
  }
  return resp.json();
}

async function apiPut<T>(page: Page, path: string, body: unknown): Promise<T> {
  const { token, origin } = await getApiContext(page);
  const resp = await page.request.put(`${origin}/api${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: body,
  });
  if (!resp.ok()) {
    throw new Error(
      `PUT ${path} returned ${resp.status()}: ${await resp.text()}`,
    );
  }
  return resp.json();
}

/** List all groups. */
export async function listGroups(page: Page): Promise<Group[]> {
  return apiGet<Group[]>(page, "/groups");
}

type Peer = { id: string; name: string; hostname: string; connected: boolean };

export async function listPeers(page: Page): Promise<Peer[]> {
  return apiGet<Peer[]>(page, "/peers");
}

export async function deletePeerById(page: Page, peerId: string) {
  await apiDelete(page, `/peers/${peerId}`);
}

export async function deletePeersByPrefix(page: Page, prefix: string) {
  const peers = await listPeers(page);
  for (const p of peers) {
    if (p.name?.startsWith(prefix) || p.hostname?.startsWith(prefix)) {
      await deletePeerById(page, p.id);
    }
  }
}

/** Create a group by name. */
export async function createGroup(page: Page, name: string): Promise<Group> {
  return apiPost<Group>(page, "/groups", { name, peers: [] });
}

/** Delete a group by ID. */
export async function deleteGroup(page: Page, groupId: string) {
  await apiDelete(page, `/groups/${groupId}`);
}

export async function deleteGroupsByPrefix(page: Page, prefix: string) {
  const groups = await listGroups(page);
  const toDelete = groups.filter((g) => g.name.startsWith(prefix));
  for (const g of toDelete) {
    await deleteGroup(page, g.id);
  }
}

// ── Networks ────────────────────────────────────────────────────────────

type Network = {
  id: string;
  name: string;
};

export async function listNetworks(page: Page): Promise<Network[]> {
  return apiGet<Network[]>(page, "/networks");
}

export async function createNetwork(
  page: Page,
  name: string,
  description = "",
): Promise<Network> {
  return apiPost<Network>(page, "/networks", { name, description });
}

export async function deleteNetworkById(page: Page, networkId: string) {
  await apiDelete(page, `/networks/${networkId}`);
}

type NetworkResource = { id: string; name: string; address: string };

export async function createResource(
  page: Page,
  networkId: string,
  name: string,
  address: string,
  groupIds: string[],
): Promise<NetworkResource> {
  return apiPost<NetworkResource>(page, `/networks/${networkId}/resources`, {
    name,
    description: name,
    address,
    groups: groupIds,
    enabled: true,
  });
}

export async function deleteNetworksByPrefix(page: Page, prefix: string) {
  const networks = await listNetworks(page);
  const toDelete = networks.filter((n) => n.name.startsWith(prefix));
  for (const n of toDelete) {
    await deleteNetworkById(page, n.id);
  }
}

// ── Policies ───────────────────────────────────────────────────────────

type Policy = {
  id: string;
  name: string;
  description: string;
  rules: { sources: string[]; destinations: string[] }[];
};

export async function listPolicies(page: Page): Promise<Policy[]> {
  return apiGet<Policy[]>(page, "/policies");
}

// Groups need no peers, so this renders policy/group nodes without any peer.
export async function createPolicy(
  page: Page,
  name: string,
  sourceGroupId: string,
  destinationGroupId: string,
  enabled = true,
): Promise<Policy> {
  return apiPost<Policy>(page, "/policies", {
    name,
    description: name,
    enabled,
    rules: [
      {
        name,
        enabled,
        bidirectional: true,
        protocol: "all",
        action: "accept",
        sources: [sourceGroupId],
        destinations: [destinationGroupId],
      },
    ],
  });
}

export async function deletePolicyById(page: Page, policyId: string) {
  await apiDelete(page, `/policies/${policyId}`);
}

export async function deletePoliciesBySubstring(page: Page, substring: string) {
  const policies = await listPolicies(page);
  const toDelete = policies.filter(
    (p) => p.name?.includes(substring) || p.description?.includes(substring),
  );
  for (const p of toDelete) {
    await deletePolicyById(page, p.id);
  }
}

export async function deletePoliciesByGroupName(page: Page, groupName: string) {
  const [policies, groups] = await Promise.all([
    listPolicies(page),
    listGroups(page),
  ]);
  const groupId = groups.find((g) => g.name === groupName)?.id;
  if (!groupId) return;

  const toDelete = policies.filter((p) =>
    p.rules.some(
      (r) => r.sources?.includes(groupId) || r.destinations?.includes(groupId),
    ),
  );
  for (const p of toDelete) {
    await deletePolicyById(page, p.id);
  }
}

// ── Routes ─────────────────────────────────────────────────────────────

type Route = {
  id: string;
  network_id: string;
};

export async function listRoutes(page: Page): Promise<Route[]> {
  return apiGet<Route[]>(page, "/routes");
}

export async function deleteRouteById(page: Page, routeId: string) {
  await apiDelete(page, `/routes/${routeId}`);
}

export async function deleteRoutesByNetworkIdPrefix(
  page: Page,
  prefix: string,
) {
  const routes = await listRoutes(page);
  const toDelete = routes.filter((r) => r.network_id.startsWith(prefix));
  for (const r of toDelete) {
    await deleteRouteById(page, r.id);
  }
}

// ── Setup Keys ─────────────────────────────────────────────────────────

type SetupKey = {
  id: string;
  name: string;
};

export async function listSetupKeys(page: Page): Promise<SetupKey[]> {
  return apiGet<SetupKey[]>(page, "/setup-keys");
}

/** The plaintext `key` is only present on the creation response. */
export async function createSetupKey(
  page: Page,
  name: string,
  autoGroupIds: string[] = [],
): Promise<SetupKey & { key: string }> {
  return apiPost<SetupKey & { key: string }>(page, "/setup-keys", {
    name,
    type: "reusable",
    expires_in: 86400,
    revoked: false,
    auto_groups: autoGroupIds,
    usage_limit: 0,
    ephemeral: false,
  });
}

export async function deleteSetupKeyById(page: Page, keyId: string) {
  await apiDelete(page, `/setup-keys/${keyId}`);
}

export async function deleteSetupKeysByPrefix(page: Page, prefix: string) {
  const keys = await listSetupKeys(page);
  const toDelete = keys.filter((k) => k.name.startsWith(prefix));
  for (const k of toDelete) {
    await deleteSetupKeyById(page, k.id);
  }
}

// ── DNS Zones ──────────────────────────────────────────────────────────

type DnsZone = {
  id: string;
  domain: string;
};

export async function listDnsZones(page: Page): Promise<DnsZone[]> {
  return apiGet<DnsZone[]>(page, "/dns/zones");
}

export async function deleteDnsZoneById(page: Page, zoneId: string) {
  await apiDelete(page, `/dns/zones/${zoneId}`);
}

export async function deleteDnsZonesByPrefix(page: Page, prefix: string) {
  const zones = await listDnsZones(page);
  const toDelete = zones.filter((z) => z.domain.startsWith(prefix));
  for (const z of toDelete) {
    await deleteDnsZoneById(page, z.id);
  }
}

// ── Notification Channels ─────────────────────────────────────────────

type NotificationChannel = {
  id: string;
  type: string;
  enabled: boolean;
};

export async function listNotificationChannels(
  page: Page,
): Promise<NotificationChannel[]> {
  return apiGet<NotificationChannel[]>(
    page,
    "/integrations/notifications/channels",
  );
}

export async function deleteNotificationChannel(page: Page, channelId: string) {
  await apiDelete(page, `/integrations/notifications/channels/${channelId}`);
}

export async function deleteAllNotificationChannels(page: Page) {
  const channels = await listNotificationChannels(page);
  for (const c of channels) {
    await deleteNotificationChannel(page, c.id);
  }
}

export async function deleteNotificationChannelsByType(
  page: Page,
  type: string,
) {
  const channels = await listNotificationChannels(page);
  const toDelete = channels.filter((c) => c.type === type);
  for (const c of toDelete) {
    await deleteNotificationChannel(page, c.id);
  }
}

// ── Nameservers ───────────────────────────────────────────────────────

type NameserverGroup = {
  id: string;
  name: string;
};

export async function listNameserverGroups(
  page: Page,
): Promise<NameserverGroup[]> {
  return apiGet<NameserverGroup[]>(page, "/dns/nameservers");
}

export async function deleteNameserverGroupById(page: Page, id: string) {
  await apiDelete(page, `/dns/nameservers/${id}`);
}

export async function deleteNameserverGroupsByPrefix(
  page: Page,
  prefix: string,
) {
  const groups = await listNameserverGroups(page);
  const toDelete = groups.filter((g) => g.name.startsWith(prefix));
  for (const g of toDelete) {
    await deleteNameserverGroupById(page, g.id);
  }
}

// ── Reverse Proxy Services ────────────────────────────────────────────

type ReverseProxyService = {
  id: string;
  name: string;
};

export async function listReverseProxyServices(
  page: Page,
): Promise<ReverseProxyService[]> {
  return apiGet<ReverseProxyService[]>(page, "/reverse-proxies/services");
}

export async function deleteReverseProxyServiceById(
  page: Page,
  serviceId: string,
) {
  await apiDelete(page, `/reverse-proxies/services/${serviceId}`);
}

export async function deleteServicesByPrefix(page: Page, prefix: string) {
  const services = await listReverseProxyServices(page);
  const toDelete = services.filter((s) => s.name.startsWith(prefix));
  for (const s of toDelete) {
    await deleteReverseProxyServiceById(page, s.id);
  }
}

// ── Reverse Proxy Clusters ────────────────────────────────────────────

type ReverseProxyCluster = {
  id?: string;
  address: string;
  online: boolean;
  connected_proxies: number;
};

export async function listReverseProxyClusters(
  page: Page,
): Promise<ReverseProxyCluster[]> {
  return apiGet<ReverseProxyCluster[]>(page, "/reverse-proxies/clusters");
}

// The test proxy containers register asynchronously after `test:setup` returns.
export async function waitForProxyClustersOnline(
  page: Page,
  addresses: string[],
  timeoutMs = 120_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let last: ReverseProxyCluster[] = [];
  while (Date.now() < deadline) {
    last = await listReverseProxyClusters(page).catch((err) => {
      // eslint-disable-next-line no-console
      console.warn(
        `[clusters-gate] list call failed: ${(err as Error).message}`,
      );
      return [];
    });
    const ready = addresses.every((addr) =>
      last.some(
        (c) => c.address === addr && c.online && c.connected_proxies > 0,
      ),
    );
    if (ready) return;
    await page.waitForTimeout(3000);
  }
  throw new Error(
    `Proxy clusters not online after ${timeoutMs}ms. Expected ${addresses.join(
      ", ",
    )}; got ${JSON.stringify(
      last.map((c) => ({
        a: c.address,
        online: c.online,
        n: c.connected_proxies,
      })),
    )}`,
  );
}

// ── Users ─────────────────────────────────────────────────────────────

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  is_current: boolean;
};

export async function listUsers(page: Page): Promise<User[]> {
  return apiGet<User[]>(page, "/users");
}

export async function deleteUserById(page: Page, userId: string) {
  await apiDelete(page, `/users/${userId}`);
}

export async function deleteUserByEmail(page: Page, email: string) {
  const users = await listUsers(page);
  const user = users.find((u) => u.email === email && !u.is_current);
  if (user) {
    await deleteUserById(page, user.id);
  }
}

// ── Agent Network ──────────────────────────────────────────────────────

type AgentNetworkCatalogProvider = {
  id: string;
  name: string;
};

type AgentNetworkProvider = {
  id: string;
  name: string;
  provider_id: string;
};

export async function listAgentNetworkCatalog(
  page: Page,
): Promise<AgentNetworkCatalogProvider[]> {
  return apiGet<AgentNetworkCatalogProvider[]>(
    page,
    "/agent-network/catalog/providers",
  );
}

export async function listAgentNetworkProviders(
  page: Page,
): Promise<AgentNetworkProvider[]> {
  return apiGet<AgentNetworkProvider[]>(page, "/agent-network/providers");
}

export async function deleteAgentNetworkProviderById(page: Page, id: string) {
  await apiDelete(page, `/agent-network/providers/${id}`);
}

export async function deleteAgentNetworkProvidersByPrefix(
  page: Page,
  prefix: string,
) {
  const providers = await listAgentNetworkProviders(page);
  for (const p of providers) {
    if (p.name.startsWith(prefix)) {
      await deleteAgentNetworkProviderById(page, p.id);
    }
  }
}

// Only builds with POST /agent-network/settings expose proxy_address.
export async function supportsAgentNetworkSettingsBootstrap(
  page: Page,
): Promise<boolean> {
  const { token, origin } = await getApiContext(page);
  const resp = await page.request.get(`${origin}/api/agent-network/settings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok()) return false;
  const settings = await resp.json().catch(() => null);
  return (
    !!settings && typeof settings === "object" && "proxy_address" in settings
  );
}

/**
 * Whether the management build under test serves the caller-scoped
 * GET /agent-network/agent-config answer that backs the Connect Agent page.
 * The endpoint answers 200 for every authenticated caller (an unconfigured
 * caller gets configured=false, never an error), so any non-OK status means
 * the build predates it.
 */
export async function supportsAgentNetworkAgentConfig(
  page: Page,
): Promise<boolean> {
  const { token, origin } = await getApiContext(page);
  const resp = await page.request.get(
    `${origin}/api/agent-network/agent-config`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return resp.ok();
}

type AgentNetworkPolicy = {
  id: string;
  name: string;
};

/** List Agent Network policies. */
export async function listAgentNetworkPolicies(
  page: Page,
): Promise<AgentNetworkPolicy[]> {
  return apiGet<AgentNetworkPolicy[]>(page, "/agent-network/policies");
}

/** Create an Agent Network policy. */
export async function createAgentNetworkPolicy(
  page: Page,
  body: {
    name: string;
    source_groups: string[];
    destination_provider_ids: string[];
    enabled?: boolean;
  },
): Promise<AgentNetworkPolicy> {
  return apiPost<AgentNetworkPolicy>(page, "/agent-network/policies", {
    enabled: true,
    ...body,
  });
}

/** Delete all Agent Network policies whose name starts with the prefix. */
export async function deleteAgentNetworkPoliciesByPrefix(
  page: Page,
  prefix: string,
) {
  const policies = await listAgentNetworkPolicies(page);
  for (const p of policies) {
    if (p.name.startsWith(prefix)) {
      await apiDelete(page, `/agent-network/policies/${p.id}`);
    }
  }
}

type User = {
  id: string;
  role: string;
  auto_groups: string[];
  is_blocked: boolean;
  is_current?: boolean;
};

/** The user the captured token belongs to. */
export async function getCurrentUser(page: Page): Promise<User> {
  const users = await apiGet<User[]>(page, "/users");
  const current = users.find((u) => u.is_current);
  if (!current) {
    throw new Error("no is_current user in the /users answer");
  }
  return current;
}

/** Replace a user's auto-groups, keeping role and blocked state. */
export async function updateUserAutoGroups(
  page: Page,
  user: User,
  autoGroups: string[],
): Promise<void> {
  await apiPut(page, `/users/${user.id}`, {
    role: user.role,
    auto_groups: autoGroups,
    is_blocked: !!user.is_blocked,
  });
}
