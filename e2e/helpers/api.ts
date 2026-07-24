/**
 * Direct API helpers for fast CRUD operations in tests.
 *
 * The app uses OIDC service-worker auth, so page.request doesn't carry
 * the Bearer token. We extract it from the browser context and pass it
 * explicitly via page.evaluate + fetch.
 */
import type { Page } from "@playwright/test";

type Group = {
  id: string;
  name: string;
  peers_count: number;
  resources_count: number;
};

/**
 * Capture the auth token and API origin by intercepting a real network
 * response from the management API. We listen for any /api/ response
 * and extract the request's Authorization header (injected by the OIDC
 * service worker at the network level).
 */
const apiContextCache = new WeakMap<Page, { token: string; origin: string }>();

async function getApiContext(
  page: Page,
): Promise<{ token: string; origin: string }> {
  const cached = apiContextCache.get(page);
  if (cached) return cached;

  // Navigate to the users page to trigger an API call we can intercept.
  // The predicate runs for EVERY response the page receives and returns
  // whether it's the one we want: a successful GET to the management API.
  // Non-matching responses (4xx/5xx, non-GET, non-API) are skipped — the
  // wait keeps going until a match or the 10s timeout. Network-level
  // request failures never produce a response, so they can't match either;
  // if nothing succeeds, this throws a TimeoutError.
  // Set E2E_DEBUG_API=1 to log every API response the predicate considers.
  const debugApi = !!process.env.E2E_DEBUG_API;
  const [response] = await Promise.all([
    page.waitForResponse(
      (resp) => {
        const req = resp.request();
        if (!resp.url().includes("/api/")) return false;
        const isMatch = req.method() === "GET" && resp.status() === 200;
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
      { timeout: 10_000 },
    ),
    page.goto("/team/users"),
  ]);

  const request = response.request();
  const authHeader =
    (await request.allHeaders())["authorization"] || "";
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

/** List all groups. */
export async function listGroups(page: Page): Promise<Group[]> {
  return apiGet<Group[]>(page, "/groups");
}

/** Delete a group by ID. */
export async function deleteGroup(page: Page, groupId: string) {
  await apiDelete(page, `/groups/${groupId}`);
}

/** Delete all groups matching a prefix. */
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

/** List all networks. */
export async function listNetworks(page: Page): Promise<Network[]> {
  return apiGet<Network[]>(page, "/networks");
}

/** Delete a network by ID. */
export async function deleteNetworkById(page: Page, networkId: string) {
  await apiDelete(page, `/networks/${networkId}`);
}

/** Delete all networks matching a prefix. */
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

/** List all policies. */
export async function listPolicies(page: Page): Promise<Policy[]> {
  return apiGet<Policy[]>(page, "/policies");
}

/** Delete a policy by ID. */
export async function deletePolicyById(page: Page, policyId: string) {
  await apiDelete(page, `/policies/${policyId}`);
}

/** Delete all policies whose name or description contains a substring. */
export async function deletePoliciesBySubstring(page: Page, substring: string) {
  const policies = await listPolicies(page);
  const toDelete = policies.filter(
    (p) => p.name?.includes(substring) || p.description?.includes(substring),
  );
  for (const p of toDelete) {
    await deletePolicyById(page, p.id);
  }
}

/** Delete all policies that reference a group name in sources or destinations. */
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

/** List all routes. */
export async function listRoutes(page: Page): Promise<Route[]> {
  return apiGet<Route[]>(page, "/routes");
}

/** Delete a route by ID. */
export async function deleteRouteById(page: Page, routeId: string) {
  await apiDelete(page, `/routes/${routeId}`);
}

/** Delete all routes matching a network_id prefix. */
export async function deleteRoutesByNetworkIdPrefix(page: Page, prefix: string) {
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

/** List all setup keys. */
export async function listSetupKeys(page: Page): Promise<SetupKey[]> {
  return apiGet<SetupKey[]>(page, "/setup-keys");
}

/** Delete a setup key by ID. */
export async function deleteSetupKeyById(page: Page, keyId: string) {
  await apiDelete(page, `/setup-keys/${keyId}`);
}

/** Delete all setup keys matching a name prefix. */
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

/** List all DNS zones. */
export async function listDnsZones(page: Page): Promise<DnsZone[]> {
  return apiGet<DnsZone[]>(page, "/dns/zones");
}

/** Delete a DNS zone by ID. */
export async function deleteDnsZoneById(page: Page, zoneId: string) {
  await apiDelete(page, `/dns/zones/${zoneId}`);
}

/** Delete all DNS zones matching a domain prefix. */
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

/** List all notification channels. */
export async function listNotificationChannels(page: Page): Promise<NotificationChannel[]> {
  return apiGet<NotificationChannel[]>(page, "/integrations/notifications/channels");
}

/** Delete a notification channel by ID. */
export async function deleteNotificationChannel(page: Page, channelId: string) {
  await apiDelete(page, `/integrations/notifications/channels/${channelId}`);
}

/** Delete all notification channels. */
export async function deleteAllNotificationChannels(page: Page) {
  const channels = await listNotificationChannels(page);
  for (const c of channels) {
    await deleteNotificationChannel(page, c.id);
  }
}

/** Delete notification channels by type (e.g., "email", "slack", "webhook"). */
export async function deleteNotificationChannelsByType(page: Page, type: string) {
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

/** List all nameserver groups. */
export async function listNameserverGroups(page: Page): Promise<NameserverGroup[]> {
  return apiGet<NameserverGroup[]>(page, "/dns/nameservers");
}

/** Delete a nameserver group by ID. */
export async function deleteNameserverGroupById(page: Page, id: string) {
  await apiDelete(page, `/dns/nameservers/${id}`);
}

/** Delete all nameserver groups matching a name prefix. */
export async function deleteNameserverGroupsByPrefix(page: Page, prefix: string) {
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

/** List all reverse proxy services. */
export async function listReverseProxyServices(page: Page): Promise<ReverseProxyService[]> {
  return apiGet<ReverseProxyService[]>(page, "/reverse-proxies/services");
}

/** Delete a reverse proxy service by ID. */
export async function deleteReverseProxyServiceById(page: Page, serviceId: string) {
  await apiDelete(page, `/reverse-proxies/services/${serviceId}`);
}

/** Delete all reverse proxy services matching a name prefix. */
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

/** List all reverse proxy clusters. */
export async function listReverseProxyClusters(
  page: Page,
): Promise<ReverseProxyCluster[]> {
  return apiGet<ReverseProxyCluster[]>(page, "/reverse-proxies/clusters");
}

/**
 * Poll the management API until every given cluster address is present and
 * online with at least one connected proxy. The test reverse-proxy
 * containers register asynchronously after `test:setup` returns, so the
 * domain picker can be briefly empty; gating here keeps the reverse-proxy
 * suite deterministic instead of flaking on a half-registered env.
 */
export async function waitForProxyClustersOnline(
  page: Page,
  addresses: string[],
  timeoutMs = 120_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let last: ReverseProxyCluster[] = [];
  while (Date.now() < deadline) {
    // Don't silently coerce errors to "no clusters" — a failed call (token
    // capture timeout, 401, network) is a different problem than an empty
    // list, and hiding it makes the gate undiagnosable.
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
    )}; got ${JSON.stringify(last.map((c) => ({ a: c.address, online: c.online, n: c.connected_proxies })))}`,
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

/** List all users. */
export async function listUsers(page: Page): Promise<User[]> {
  return apiGet<User[]>(page, "/users");
}

/** Delete a user by ID. */
export async function deleteUserById(page: Page, userId: string) {
  await apiDelete(page, `/users/${userId}`);
}

/** Delete a user by email (skip current user). */
export async function deleteUserByEmail(page: Page, email: string) {
  const users = await listUsers(page);
  const user = users.find((u) => u.email === email && !u.is_current);
  if (user) {
    await deleteUserById(page, user.id);
  }
}

// ---------------------------------------------------------------------------
// Agent Network
// ---------------------------------------------------------------------------

type AgentNetworkCatalogProvider = {
  id: string;
  name: string;
};

type AgentNetworkProvider = {
  id: string;
  name: string;
  provider_id: string;
};

/** List the Agent Network provider catalog (server-defined provider types). */
export async function listAgentNetworkCatalog(
  page: Page,
): Promise<AgentNetworkCatalogProvider[]> {
  return apiGet<AgentNetworkCatalogProvider[]>(
    page,
    "/agent-network/catalog/providers",
  );
}

/** List connected Agent Network providers. */
export async function listAgentNetworkProviders(
  page: Page,
): Promise<AgentNetworkProvider[]> {
  return apiGet<AgentNetworkProvider[]>(page, "/agent-network/providers");
}

/** Delete an Agent Network provider by ID. */
export async function deleteAgentNetworkProviderById(page: Page, id: string) {
  await apiDelete(page, `/agent-network/providers/${id}`);
}

/** Delete all Agent Network providers whose name starts with the prefix. */
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
