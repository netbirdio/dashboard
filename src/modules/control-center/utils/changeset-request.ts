import { normalizeHostCIDR } from "@utils/ip";
import loadConfig from "@utils/config";
import { diffBodies, DiffLine } from "@/modules/control-center/utils/json-line-diff";
import { Group, GroupPeer, GroupResource } from "@/interfaces/Group";
import { Network, NetworkResource } from "@/interfaces/Network";
import { Policy, PolicyRuleResource } from "@/interfaces/Policy";
import { PostureCheck } from "@/interfaces/PostureCheck";
import {
  CreateGroupChange,
  CreateNetworkChange,
  CreateResourceChange,
  CreateRouterChange,
  DraftChange,
  getChangeApiCall,
  InstallPeerChange,
  UpdateGroupChange,
  UpdateNetworkChange,
  UpdateResourceChange,
  UpdateRouterChange,
} from "@/modules/control-center/draft/DraftChangesetContext";

// The request-body shape is shared by the deploy executor and the Review &
// Deploy code view so the two can never drift. Only the RESOLVERS differ:
// deploy resolves real API ids, preview renders {x_group_id} placeholders.

export type HttpMethod = "POST" | "PUT" | "DELETE";

export interface ChangeRequest {
  method: HttpMethod;
  path: string;
  // Absent for DELETE (no body) and install-peer (not an API call).
  body?: unknown;
}

export interface LiveData {
  policies?: Policy[];
  groups?: Group[];
  networks?: Network[];
  networkResources?: NetworkResource[];
  // Lets the preview name draft entities when building id placeholders.
  draftChanges?: DraftChange[];
}

// A code-view stand-in for an id that only exists after deploy, e.g.
// {sales_group_id}. Falls back to {group_id} when there's no name to embed.
export function idPlaceholder(kind: string, label?: string): string {
  const slug = (label ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const k = kind.toLowerCase();
  return slug ? `{${slug}_${k}_id}` : `{${k}_id}`;
}

export interface RequestResolvers {
  resolveGroupIds: (list?: (Group | string)[] | null) => string[] | undefined;
  resolveResource: (r?: PolicyRuleResource) => PolicyRuleResource | undefined;
  resolveNetworkId: (change: {
    networkId?: string;
    networkClientId?: string;
    networkName: string;
  }) => string;
  groupIdForRef: (ref: string) => string;
  normalizeAddress: (address: string) => string;
  // The group POST/PUT rejects bare resource ids; it wants {id, type} objects.
  resourceType: (id: string) => NetworkResource["type"] | undefined;
}

type WireResource = { id: string; type?: NetworkResource["type"] };

export const toIds = (
  items?: ({ id?: string } | string)[] | null,
): string[] =>
  (items ?? [])
    .map((i) => (typeof i === "string" ? i : i.id))
    .filter(Boolean) as string[];

export function policyRequestBody(policy: Policy, r: RequestResolvers) {
  const rule = policy.rules?.[0];
  if (!rule) throw new Error("Policy has no rule.");

  const isSsh = rule.protocol === "netbird-ssh";
  const authorizedGroups: Record<string, string[]> = {};
  if (isSsh && rule.authorized_groups) {
    Object.entries(rule.authorized_groups).forEach(([nameOrId, usernames]) => {
      authorizedGroups[r.groupIdForRef(nameOrId)] = usernames as string[];
    });
  }

  return {
    name: policy.name,
    description: policy.description ?? "",
    enabled: policy.enabled,
    query: policy.query ?? "",
    source_posture_checks: (
      (policy.source_posture_checks as unknown as
        | (PostureCheck | string)[]
        | undefined) ?? []
    ).map((c) => (typeof c === "string" ? c : c.id)),
    rules: [
      {
        name: policy.name,
        description: policy.description ?? "",
        bidirectional: rule.bidirectional,
        action: "accept",
        protocol: rule.protocol,
        enabled: rule.enabled,
        sources: rule.sourceResource
          ? undefined
          : r.resolveGroupIds(rule.sources as Group[]),
        destinations: rule.destinationResource
          ? undefined
          : r.resolveGroupIds(rule.destinations as Group[]),
        sourceResource: r.resolveResource(rule.sourceResource),
        destinationResource: r.resolveResource(rule.destinationResource),
        ports: isSsh ? ["22"] : rule.ports,
        port_ranges: isSsh ? [] : rule.port_ranges,
        authorized_groups: isSsh ? authorizedGroups : undefined,
      },
    ],
  };
}

// Uninstalled placeholders keep their "draft-" ids (unknown to the API) and
// draft resources apply membership through their own groups field, so both go.
export function groupCreateBody(change: CreateGroupChange, r: RequestResolvers) {
  return {
    name: change.name,
    peers: change.peerIds.filter((id) => !id.startsWith("draft-")),
    resources: change.resourceIds
      .filter((id) => !id.startsWith("new-"))
      .map((id) => ({ id, type: r.resourceType(id) }) as WireResource),
  };
}

// A PUT /groups/{id} must send the CURRENT members plus draft adds, minus the
// draft removals.
export function mergeGroupMembers(
  base: { peers?: (GroupPeer | string)[]; resources?: (GroupResource | string)[] },
  change: UpdateGroupChange,
  r: RequestResolvers,
) {
  const peers = new Set(toIds(base.peers));
  const resources = new Set(toIds(base.resources));
  change.peerIds.forEach((id) => !id.startsWith("draft-") && peers.add(id));
  change.resourceIds.forEach((id) => !id.startsWith("new-") && resources.add(id));
  change.removedPeerIds?.forEach((id) => peers.delete(id));
  change.removedResourceIds?.forEach((id) => resources.delete(id));
  const typeById = new Map<string, NetworkResource["type"] | undefined>();
  (base.resources ?? []).forEach((res) => {
    if (typeof res !== "string" && res?.id) {
      typeById.set(res.id, res.type as NetworkResource["type"]);
    }
  });
  return {
    peers: Array.from(peers),
    resources: Array.from(resources).map(
      (id) => ({ id, type: typeById.get(id) ?? r.resourceType(id) }) as WireResource,
    ),
  };
}

// Must resolve types exactly like mergeGroupMembers, or an unchanged member
// renders as a remove plus an add and inflates the diffstat.
const wireResources = (
  resources: (GroupResource | string)[] | null | undefined,
  r: RequestResolvers,
): WireResource[] =>
  (resources ?? []).flatMap((res) => {
    const id = typeof res === "string" ? res : res?.id;
    if (!id) return [];
    const type =
      typeof res === "string"
        ? undefined
        : (res.type as NetworkResource["type"] | undefined);
    return [{ id, type: type ?? r.resourceType(id) }];
  });

export function groupUpdateBody(
  name: string,
  members: { peers: string[]; resources: WireResource[] },
) {
  return { name, peers: members.peers, resources: members.resources };
}

export function networkCreateBody(change: CreateNetworkChange) {
  return { name: change.name, description: change.description ?? "" };
}

export function networkUpdateBody(change: UpdateNetworkChange) {
  return { name: change.name, description: change.description ?? "" };
}

export function resourceCreateBody(
  change: CreateResourceChange,
  r: RequestResolvers,
) {
  return {
    name: change.name,
    description: change.description ?? "",
    address: r.normalizeAddress(change.address),
    enabled: change.enabled ?? true,
    groups: change.groupIds.map((ref) => r.groupIdForRef(ref)),
  };
}

export function resourceUpdateBody(
  change: UpdateResourceChange,
  r: RequestResolvers,
) {
  return {
    name: change.name,
    description: change.description ?? "",
    address: r.normalizeAddress(change.address),
    enabled: change.enabled,
    groups: change.groupIds.map((ref) => r.groupIdForRef(ref)),
  };
}

export function routerCreateBody(
  change: CreateRouterChange,
  r: RequestResolvers,
) {
  return {
    ...(change.peerId
      ? { peer: change.peerId }
      : { peer_groups: [r.groupIdForRef(change.groupId ?? "")] }),
    metric: change.metric ?? 9999,
    masquerade: change.masquerade ?? true,
    enabled: change.enabled ?? true,
  };
}

export function routerUpdateBody(
  change: UpdateRouterChange,
  r: RequestResolvers,
) {
  return {
    ...(change.peerId
      ? { peer: change.peerId }
      : { peer_groups: [r.groupIdForRef(change.groupId ?? "")] }),
    metric: change.metric ?? 9999,
    masquerade: change.masquerade ?? true,
    enabled: change.enabled ?? true,
  };
}

// The key generated when a placeholder is installed, NOT a deploy call. Its
// hidden auto_group has no id until generation, hence the id placeholder.
export function setupKeyCreateBody(change: InstallPeerChange) {
  const isUserDevice = change.kind === "user-device";
  return {
    name: `Draft ${change.name}`,
    type: "one-off",
    expires_in: 24 * 60 * 60,
    revoked: false,
    auto_groups: isUserDevice ? [] : [idPlaceholder("GROUP", change.name)],
    usage_limit: 1,
    ephemeral: false,
    allow_extra_dns_labels: false,
  };
}

const methodPath = (change: DraftChange): { method: HttpMethod; path: string } => {
  const [method, path] = getChangeApiCall(change).split(" ");
  return { method: method as HttpMethod, path };
};

// An EXISTING group ref resolves to its real id so the preview matches the
// deployed request; a draft group has no id yet and shows as a placeholder.
export function previewResolvers(live: LiveData = {}): RequestResolvers {
  const nameToId = new Map<string, string>();
  live.groups?.forEach((g) => g.id && nameToId.set(g.name, g.id));
  const liveGroupIds = new Set(
    (live.groups ?? []).map((g) => g.id).filter(Boolean) as string[],
  );
  const draftResourceNames = new Map<string, string>();
  live.draftChanges?.forEach((c) => {
    if (c.type === "create-resource") draftResourceNames.set(c.clientId, c.name);
  });

  const resolveGroupRef = (ref: string) => {
    if (liveGroupIds.has(ref)) return ref;
    return nameToId.get(ref) ?? idPlaceholder("GROUP", ref);
  };

  return {
    resolveGroupIds: (list) =>
      list?.map((g) =>
        typeof g === "string"
          ? resolveGroupRef(g)
          : g.id ?? nameToId.get(g.name) ?? idPlaceholder("GROUP", g.name),
      ),
    resolveResource: (r) => {
      if (!r || !r.id.startsWith("new-")) return r;
      return {
        id: idPlaceholder("RESOURCE", draftResourceNames.get(r.id)),
        type: r.type,
      };
    },
    resolveNetworkId: (change) =>
      change.networkId ?? idPlaceholder("NETWORK", change.networkName),
    groupIdForRef: resolveGroupRef,
    normalizeAddress: (address) => normalizeHostCIDR(address),
    resourceType: (id) =>
      live.networkResources?.find((res) => res.id === id)?.type,
  };
}

// Preview must never throw during render, so a live policy with no rule yields
// no body instead of crashing the modal. Deploy still throws.
const safePolicyBody = (policy: Policy, r: RequestResolvers) =>
  policy.rules?.[0] ? policyRequestBody(policy, r) : undefined;

// The request a change will send once deployed (the diff's "after"). `live`
// supplies current membership so an update-group shows the full member list.
export function buildChangeRequest(
  change: DraftChange,
  live: LiveData = {},
): ChangeRequest {
  const r = previewResolvers(live);
  const { method, path } = methodPath(change);

  if (change.type === "install-peer") {
    return { method, path, body: setupKeyCreateBody(change) };
  }

  switch (change.type) {
    case "create-policy":
    case "update-policy":
      return { method, path, body: safePolicyBody(change.policy, r) };
    case "create-group":
      return { method, path, body: groupCreateBody(change, r) };
    case "update-group": {
      const group = live.groups?.find((g) => g.id === change.groupId);
      return {
        method,
        path,
        body: groupUpdateBody(
          change.name,
          mergeGroupMembers(group ?? { peers: [], resources: [] }, change, r),
        ),
      };
    }
    case "create-network":
      return { method, path, body: networkCreateBody(change) };
    case "update-network":
      return { method, path, body: networkUpdateBody(change) };
    case "create-resource":
      return { method, path, body: resourceCreateBody(change, r) };
    case "update-resource":
      return { method, path, body: resourceUpdateBody(change, r) };
    case "create-router":
      return { method, path, body: routerCreateBody(change, r) };
    case "update-router":
      return { method, path, body: routerUpdateBody(change, r) };
    case "delete-policy":
    case "delete-group":
    case "delete-resource":
    case "delete-network":
      return { method, path };
  }
}

// Renders a request as a curl command matching the API docs; auth is a
// `<TOKEN>` placeholder the user swaps for a personal access token.
export function toCurl(request: ChangeRequest): string {
  const base = loadConfig().apiOrigin + "/api";
  const parts = [
    `curl -X ${request.method} '${base}${request.path}'`,
    `-H 'Accept: application/json'`,
    `-H 'Authorization: Token <TOKEN>'`,
  ];
  if (request.body !== undefined) {
    parts.push(`-H 'Content-Type: application/json'`);
    // An apostrophe would otherwise close the single-quoted body early.
    const json = JSON.stringify(request.body, null, 2).replace(/'/g, `'\\''`);
    parts.push(`-d '${json}'`);
  }
  return parts.join(" \\\n  ");
}

export function changeDiffLines(
  change: DraftChange,
  live: LiveData = {},
): DiffLine[] {
  const after = buildChangeRequest(change, live);
  const before = buildBeforeRequest(change, live);
  return diffBodies(before?.body, after?.body);
}

export function buildBeforeRequest(
  change: DraftChange,
  live: LiveData,
): ChangeRequest | null {
  const r = previewResolvers(live);
  switch (change.type) {
    case "update-policy":
    case "delete-policy": {
      const policy = live.policies?.find((p) => p.id === change.policyId);
      if (!policy) return null;
      return {
        method: change.type === "delete-policy" ? "DELETE" : "PUT",
        path: `/policies/${change.policyId}`,
        body: safePolicyBody(policy, r),
      };
    }
    case "update-group":
    case "delete-group": {
      const group = live.groups?.find((g) => g.id === change.groupId);
      if (!group) return null;
      return {
        method: change.type === "delete-group" ? "DELETE" : "PUT",
        path: `/groups/${change.groupId}`,
        body: {
          name: group.name,
          peers: toIds(group.peers),
          resources: wireResources(group.resources, r),
        },
      };
    }
    case "update-resource":
    case "delete-resource": {
      const resource = live.networkResources?.find(
        (res) => res.id === change.resourceId,
      );
      if (!resource) return null;
      return {
        method: change.type === "delete-resource" ? "DELETE" : "PUT",
        path: `/networks/${change.networkId}/resources/${change.resourceId}`,
        body: {
          name: resource.name,
          description: resource.description ?? "",
          address: resource.address,
          enabled: resource.enabled,
          groups: toIds(resource.groups),
        },
      };
    }
    case "update-network": {
      const network = live.networks?.find((n) => n.id === change.networkId);
      if (!network) return null;
      return {
        method: "PUT",
        path: `/networks/${change.networkId}`,
        body: { name: network.name, description: network.description ?? "" },
      };
    }
    // update-router has no "before": routers aren't in the global live data,
    // so it falls through to null.
    case "delete-network": {
      const network = live.networks?.find((n) => n.id === change.networkId);
      if (!network) return null;
      // DELETE has no real body; this reconstructs what's being removed so the
      // code view shows an all-minus diff like the other deletes.
      return {
        method: "DELETE",
        path: `/networks/${change.networkId}`,
        body: {
          name: network.name,
          description: network.description ?? "",
          resources: (network.resources ?? []).map((rid) => {
            const res = live.networkResources?.find((r) => r.id === rid);
            return res
              ? { name: res.name, address: res.address }
              : { id: rid };
          }),
          ...(network.routers?.length ? { routers: network.routers } : {}),
        },
      };
    }
    // Creates and install-peer have no "before".
    default:
      return null;
  }
}
