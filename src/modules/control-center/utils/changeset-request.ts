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
  UpdateResourceChange,
} from "@/modules/control-center/draft/DraftChangesetContext";

// The request-body SHAPE is defined once here and used by BOTH the deploy
// executor (useDeployChangeset) and the Review & Deploy code view, so the
// "code" a user reviews is literally the request that will be sent — the two
// can never drift. The difference between deploy and preview is only the
// RESOLVERS: deploy resolves draft client-ids/names to the real API ids it has
// created during the run; preview leaves draft references as display
// placeholders (names, "{new}") because those ids don't exist yet.

export type HttpMethod = "POST" | "PUT" | "DELETE";

export interface ChangeRequest {
  method: HttpMethod;
  path: string;
  // Absent for DELETE (no body) and install-peer (not an API call).
  body?: unknown;
}

// The live account data the viewer reads to reconstruct the "before" request
// for updates/deletes. Sourced from useControlCenterData() (SWR).
export interface LiveData {
  policies?: Policy[];
  groups?: Group[];
  networks?: Network[];
  networkResources?: NetworkResource[];
}

// How draft references become wire values. Deploy and preview differ only here.
export interface RequestResolvers {
  // A rule's source/destination group list → id strings for the wire.
  resolveGroupIds: (list?: (Group | string)[] | null) => string[] | undefined;
  // A rule resource: resolve a draft "new-" id to its real id/type.
  resolveResource: (r?: PolicyRuleResource) => PolicyRuleResource | undefined;
  // A resource/router change → the network id it posts under.
  resolveNetworkId: (change: {
    networkId?: string;
    networkClientId?: string;
    networkName: string;
  }) => string;
  // A single group ref (id or draft-group name) → id for resource/router groups
  // and SSH authorized_groups keys.
  groupIdForRef: (ref: string) => string;
  // Address normalizer (deploy and preview both apply normalizeHostCIDR).
  normalizeAddress: (address: string) => string;
}

export const toIds = (
  items?: ({ id?: string } | string)[] | null,
): string[] =>
  (items ?? [])
    .map((i) => (typeof i === "string" ? i : i.id))
    .filter(Boolean) as string[];

// ---------------------------------------------------------------------------
// Pure body shapers — the single source of truth for every request body.
// ---------------------------------------------------------------------------

// POST/PUT /policies body from draft policy data: group objects → ids, posture
// checks → ids, SSH specifics applied. Mirrors the live modal exactly.
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

// POST /groups. Placeholder members that never installed keep their "draft-"
// ids (not in the API); draft resources ("new-…") apply membership through the
// resource's own `groups` field, so both are filtered here.
export function groupCreateBody(change: CreateGroupChange) {
  return {
    name: change.name,
    peers: change.peerIds.filter((id) => !id.startsWith("draft-")),
    resources: change.resourceIds.filter((id) => !id.startsWith("new-")),
  };
}

// The merged membership a PUT /groups/{id} sends: the group's CURRENT members
// plus draft additions minus draft removals. Deploy merges against a fresh GET;
// preview merges against the live SWR snapshot — same shape either way.
export function mergeGroupMembers(
  base: { peers?: (GroupPeer | string)[]; resources?: (GroupResource | string)[] },
  change: UpdateGroupChange,
) {
  const peers = new Set(toIds(base.peers));
  const resources = new Set(toIds(base.resources));
  change.peerIds.forEach((id) => !id.startsWith("draft-") && peers.add(id));
  change.resourceIds.forEach((id) => !id.startsWith("new-") && resources.add(id));
  change.removedPeerIds?.forEach((id) => peers.delete(id));
  change.removedResourceIds?.forEach((id) => resources.delete(id));
  return { peers: Array.from(peers), resources: Array.from(resources) };
}

export function groupUpdateBody(
  name: string,
  members: { peers: string[]; resources: string[] },
) {
  return { name, peers: members.peers, resources: members.resources };
}

export function networkCreateBody(change: CreateNetworkChange) {
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

// POST /networks/{id}/routers. Falls back to the live modal's defaults
// (metric 9999, masquerade on, enabled) when the routing-peer modal left them
// unset.
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

// POST /setup-keys — the key generated when the user installs a server/agent
// placeholder (Generate Key), NOT a deploy call. auto_groups shows the hidden
// bound group that's created alongside it (by name here — its real id doesn't
// exist until install). Mirrors DraftInstallPeerModal / SetupKeyGenerator.
export function setupKeyCreateBody(change: InstallPeerChange) {
  const isUserDevice = change.kind === "user-device";
  return {
    name: `Draft ${change.name}`,
    type: "one-off",
    expires_in: 24 * 60 * 60,
    revoked: false,
    auto_groups: isUserDevice ? [] : [`${change.name} (Draft)`],
    usage_limit: 1,
    ephemeral: change.kind === "agent",
    allow_extra_dns_labels: false,
  };
}

// ---------------------------------------------------------------------------
// Preview: build the request(s) shown in the Review & Deploy code view.
// ---------------------------------------------------------------------------

const methodPath = (change: DraftChange): { method: HttpMethod; path: string } => {
  const [method, path] = getChangeApiCall(change).split(" ");
  return { method: method as HttpMethod, path };
};

// Resolvers for display: an EXISTING group reference resolves to its real id
// (so the preview matches the deployed request); a DRAFT group has no id yet,
// so it's shown by name as a placeholder. `live.groups` supplies the name→id
// map — the preview equivalent of deploy's `nameToId`, which is why references
// keyed by name (SSH authorized_groups, resource/router groups) render as the
// same ids deploy sends rather than as names.
export function previewResolvers(live: LiveData = {}): RequestResolvers {
  const nameToId = new Map<string, string>();
  live.groups?.forEach((g) => g.id && nameToId.set(g.name, g.id));
  return {
    resolveGroupIds: (list) =>
      list?.map((g) => (typeof g === "string" ? g : g.id ?? g.name)),
    resolveResource: (r) => r,
    resolveNetworkId: (change) => change.networkId ?? "{new}",
    groupIdForRef: (ref) => nameToId.get(ref) ?? ref,
    normalizeAddress: (address) => normalizeHostCIDR(address),
  };
}

// Preview must never throw during render: a live policy with no rule (shouldn't
// happen under the one-rule-per-policy invariant, but SWR data isn't trusted)
// yields no body instead of crashing the modal. Deploy still throws — it wants
// to surface that as a caught error.
const safePolicyBody = (policy: Policy, r: RequestResolvers) =>
  policy.rules?.[0] ? policyRequestBody(policy, r) : undefined;

// The request a change WILL send once deployed (the diff's "after"). Every
// change has one — install-peer sends its setup-key POST. DELETE requests
// carry no body. `live` supplies the group's current membership so an
// update-group shows the FULL resulting member list (not just the additions).
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
      return { method, path, body: groupCreateBody(change) };
    case "update-group": {
      const group = live.groups?.find((g) => g.id === change.groupId);
      return {
        method,
        path,
        body: groupUpdateBody(
          change.name,
          mergeGroupMembers(group ?? { peers: [], resources: [] }, change),
        ),
      };
    }
    case "create-network":
      return { method, path, body: networkCreateBody(change) };
    case "create-resource":
      return { method, path, body: resourceCreateBody(change, r) };
    case "update-resource":
      return { method, path, body: resourceUpdateBody(change, r) };
    case "create-router":
      return { method, path, body: routerCreateBody(change, r) };
    case "delete-policy":
    case "delete-group":
    case "delete-resource":
    case "delete-network":
      return { method, path };
  }
}

// The request that reflects the entity's CURRENT live state (the diff's
// "before"). Null for creates (nothing exists yet) and install-peer.
// Render a request as a curl command matching the API docs — auth is a
// `<TOKEN>` placeholder the user swaps for a personal access token. The base is
// the account's configured management origin (api.netbird.io on cloud, the
// self-hosted URL otherwise) — the same base the app's own requests use.
export function toCurl(request: ChangeRequest): string {
  const base = loadConfig().apiOrigin + "/api";
  const parts = [
    `curl -X ${request.method} '${base}${request.path}'`,
    `-H 'Accept: application/json'`,
    `-H 'Authorization: Token <TOKEN>'`,
  ];
  if (request.body !== undefined) {
    parts.push(`-H 'Content-Type: application/json'`);
    parts.push(`-d '${JSON.stringify(request.body, null, 2)}'`);
  }
  return parts.join(" \\\n  ");
}

// The before→after diff a change produces (the code view's lines and the
// header's +/- stat share this).
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
          resources: toIds(group.resources),
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
    case "delete-network": {
      const network = live.networks?.find((n) => n.id === change.networkId);
      if (!network) return null;
      // No real request body for DELETE — this reconstructs what's being
      // removed (the network plus its resources/routers, cascaded
      // server-side) so the code view shows it as an all-minus diff, like the
      // other deletes.
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
