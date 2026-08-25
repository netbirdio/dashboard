import {
  Edge as CanvasEdge,
  Node as CanvasNode,
  useReactFlow,
  useStore,
} from "@xyflow/react";
import { orderBy } from "lodash";
import { singularize } from "@utils/helpers";
import { Group } from "@/interfaces/Group";
import { Network, NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import { Policy } from "@/interfaces/Policy";

// crypto.randomUUID is missing in non-secure contexts and older Safari.
export const draftUid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const getDestinationGroupsFromPolicy = (policy: Policy) => {
  const rule = policy.rules?.[0];
  if (!rule) return [];
  const destinations = rule.destinations as Group[];
  if (!destinations) return [];
  return destinations;
};

export const getSourceGroupsFromPolicy = (policy: Policy) => {
  const rule = policy.rules?.[0];
  if (!rule) return [];
  const sources = rule.sources as Group[];
  if (!sources) return [];
  return sources;
};

export const getNetworksFromPolicy = (networks: Network[], policy: Policy) => {
  const policyId = policy.id;
  if (!policyId) return [];
  return networks.filter((network) => {
    return network.policies?.some((p) => p === policyId);
  });
};

export const getGroupCountLabel = (group?: Group) => {
  const peerCount = group?.peers_count || 0;
  const resourceCount = group?.resources_count || 0;
  if (peerCount === 0 && resourceCount === 0) return "No Peers";
  const peers = singularize("Peers", peerCount, true);
  const resources = singularize("Resources", resourceCount, true);
  if (resourceCount === 0) return peers;
  if (peerCount === 0) return resources;
  return peerCount > resourceCount
    ? `${peers}, ${resources}`
    : `${resources}, ${peers}`;
};

// Policy-embedded groups carry a stale count snapshot; /groups is authoritative.
export const withFreshGroupCounts = (
  group: Group,
  groups?: Group[],
): Group => {
  const fresh = groups?.find((g) => g.id === group.id);
  if (!fresh) return group;
  return {
    ...group,
    peers_count: fresh.peers_count,
    resources_count: fresh.resources_count,
  };
};

export const getPeersFromGroup = (group: Group, peers: Peer[]) => {
  return peers.filter((peer) => {
    const groupIds = peer.groups?.map((g) => g.id) || [];
    return groupIds.includes(group.id);
  });
};

export const getPolicyProtocolAndPortText = (
  policy: Policy,
  maxPorts?: number,
) => {
  const rule = policy.rules?.[0];
  if (!rule) return "";
  let p = rule.protocol;

  if (p === "all") {
    return "";
  } else if (p === "icmp") {
    return "ICMP";
  } else {
    const ports = getPolicyPortsText(policy);
    if (!ports || ports.length === 0) {
      return p.toUpperCase();
    }
    if (ports.length > (maxPorts ?? 3)) {
      const firstFour = ports.slice(0, 4);
      return `${p.toUpperCase()}:${firstFour.join(",")}, ...`;
    }
    return `${p.toUpperCase()}:${ports.join(",")}`;
  }
};

export const getPolicyPortsText = (policy: Policy) => {
  const rule = policy.rules?.[0];
  if (!rule) return undefined;

  const ports = rule.ports || [];
  const portRanges = rule.port_ranges || [];

  if (ports.length === 0 && portRanges.length === 0) {
    return undefined;
  }

  const portStrings = ports.map((port) => String(port));
  const rangeStrings = portRanges.map((range) => {
    if (range.start === range.end) return String(range.start);
    return `${range.start}-${range.end}`;
  });

  return orderBy(
    [...portStrings, ...rangeStrings],
    [(x) => Number(x.split("-")[0])],
    ["asc"],
  );
};

export const getResourcePolicyByGroups = (
  groups: Group[],
  policies: Policy[],
): Policy[] => {
  const groupIds = groups.map((group) => group.id);
  return policies.filter((policy) => {
    const rule = policy.rules?.[0];
    if (!rule) return false;
    const destinations = rule.destinations as Group[];
    return destinations?.some((d) => groupIds.includes(d.id));
  });
};

// Counts a direct destinationResource and a destination group the resource is in.
export const getPoliciesTargetingResources = (
  resources: NetworkResource[],
  policies: Policy[],
): Policy[] => {
  const resourceIds = new Set(resources.map((r) => r.id).filter(Boolean));
  const groupIds = new Set(
    resources.flatMap((r) =>
      ((r.groups ?? []) as (Group | string)[])
        .map((g) => (typeof g === "string" ? g : g.id ?? ""))
        .filter(Boolean),
    ),
  );
  return policies.filter((policy) => {
    const rule = policy.rules?.[0];
    if (!rule) return false;
    const destResource = rule.destinationResource;
    if (destResource?.id && resourceIds.has(destResource.id)) return true;
    const destinations = (rule.destinations ?? []) as (Group | string)[];
    return destinations.some((d) =>
      groupIds.has(typeof d === "string" ? d : d.id ?? ""),
    );
  });
};

// A group becomes a resource-group row only when empty, or when it owns a resource.
export const canDropGroupIntoNetwork = (
  groupNode: CanvasNode,
  frameNode: CanvasNode,
  nodes: CanvasNode[],
  networkResources?: NetworkResource[],
): boolean => {
  const group = (groupNode.data as { group?: Group })?.group;
  if (!group) return false;
  const addedMembers = (groupNode.data as { addedMembers?: Set<string> })
    ?.addedMembers;
  if (
    !group.peers_count &&
    !group.resources_count &&
    !(addedMembers && addedMembers.size > 0)
  ) {
    return true;
  }
  // A group carrying unassigned draft resources may drop into any network.
  const carriedDraftResources = (
    groupNode.data as { draftResources?: NetworkResource[] }
  )?.draftResources;
  if (carriedDraftResources?.length) return true;

  const groupKey = group.id ?? group.name;
  const network = (
    frameNode.data as { network?: { id?: string; resources?: string[] } }
  )?.network;

  const resourceIds = new Set<string>(network?.resources ?? []);
  nodes.forEach((n) => {
    const ref = (n.data as { draftNetwork?: DraftNetworkRef })?.draftNetwork;
    const assigned =
      n.parentId === frameNode.id ||
      (ref &&
        (ref.networkClientId
          ? `network-${ref.networkClientId}` === frameNode.id
          : !!network?.id && ref.networkId === network.id));
    if (!assigned) return;
    const rid = (n.data as { resource?: { id?: string } })?.resource?.id;
    if (rid) resourceIds.add(rid);
    else if (n.id.startsWith("resource-"))
      resourceIds.add(n.id.replace("resource-", ""));
  });

  const inGroup = (groups?: (Group | string)[]) =>
    (groups ?? []).some(
      (g) => (typeof g === "string" ? g : g.id ?? g.name) === groupKey,
    );

  return Array.from(resourceIds).some((rid) => {
    const api = networkResources?.find((r) => r.id === rid);
    if (api && inGroup(api.groups as (Group | string)[])) return true;
    const nodeResource = (
      nodes.find((n) => n.id === `resource-${rid}`)?.data as {
        resource?: { groups?: (Group | string)[] };
      }
    )?.resource;
    return inGroup(nodeResource?.groups);
  });
};

// Children render at parent+1, so +2 beats both; drag-time elevations (>= 1000) don't count.
export const getTopZIndex = (nodes: CanvasNode[]) => {
  const maxZ = Math.max(
    0,
    ...nodes.map((n) =>
      typeof n.zIndex === "number" && n.zIndex < 1000 ? n.zIndex : 0,
    ),
  );
  return maxZ + 2;
};

export function useSourceGroupEnabled(sourceId: string) {
  const { getNode } = useReactFlow();
  const node = getNode(sourceId);
  return node?.data?.enabled ?? false;
}

// Pass `skip` when the caller has an explicit enabled flag: getEdges() copies the array.
export function useAnySourceGroupEnabled(sourceId: string, skip = false) {
  const { getEdges } = useReactFlow();
  if (skip) return false;
  const edges = getEdges();
  const incomingEdges = edges.filter((e) => e.target === sourceId);
  return incomingEdges.some((e) => e?.data?.enabled);
}

// Prefers a group that is a policy source, so the initial canvas isn't empty.
export function getFirstGroup(groups?: Group[], policies?: Policy[]) {
  const sortedGroups = orderBy(groups, "peers_count", "desc");
  const groupsWithoutAll = sortedGroups?.filter((g) => g.name !== "All");

  const hasPolicies = (g: Group) =>
    !!policies?.some((p) => {
      const sources = getSourceGroupsFromPolicy(p);
      return sources?.some((source) => source.id === g.id);
    });

  const groupsWithPolicies = groupsWithoutAll?.filter(hasPolicies);
  if (groupsWithPolicies && groupsWithPolicies.length > 0) {
    return groupsWithPolicies[0];
  }

  const allGroup = sortedGroups?.find((g) => g.name === "All");
  if (allGroup && hasPolicies(allGroup)) {
    return allGroup;
  }

  if (groupsWithoutAll && groupsWithoutAll.length > 0) {
    return groupsWithoutAll[0];
  }

  return sortedGroups?.[0];
}

const DEFAULT_NETWORK_RANGE = "100.64.0.0/10";

// Octets fixed by the prefix are kept, the rest become "x": 10.20.0.0/16 → "10.20.x.x".
export const getIpPlaceholderFromRange = (range?: string) => {
  const [address, prefixStr] = (range || DEFAULT_NETWORK_RANGE).split("/");
  const octets = address?.split(".") ?? [];
  const prefix = Number(prefixStr);
  if (octets.length !== 4 || !Number.isFinite(prefix)) return "100.x.x.x";
  const fixedOctets = Math.min(4, Math.max(0, Math.floor(prefix / 8)));
  return octets.map((o, i) => (i < fixedOctets ? o : "x")).join(".");
};

export const PLACEHOLDER_BASE_NAMES: Record<string, string> = {
  agent: "Agent",
  server: "Server",
  "user-device": "User Device",
};

// Keeps a bound group's name unique when two placeholders share a base name.
export const makeBoundGroupSuffix = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)
  )
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 5);

// The group IS visible in group lists (the API has no hidden flag), so the name
// has to read as temporary and disposable to anyone who stumbles on it.
export const draftBoundGroupName = (
  placeholderName: string,
  taken: Set<string>,
) => {
  const base = `${placeholderName} (Draft)`;
  if (!taken.has(base)) return base;
  let candidate = base;
  while (taken.has(candidate)) {
    candidate = `${placeholderName} (${makeBoundGroupSuffix()}) (Draft)`;
  }
  return candidate;
};

export const kindHasBoundGroup = (kind?: string) =>
  kind === "server" || kind === "agent";

// Pseudo-Peer so a not-yet-installed placeholder can take part in policies and selectors.
export const getPlaceholderPeer = (node?: CanvasNode): Peer | undefined => {
  const data = node?.data as
    | {
        placeholderKind?: string;
        placeholderName?: string;
        peer?: Peer;
        setupKey?: string;
        setupKeyId?: string;
        boundGroupId?: string;
        installHostname?: string;
      }
    | undefined;
  if (!node || !data?.placeholderKind || data.peer) return undefined;
  const pseudo: Partial<Peer> & {
    setupKey?: string;
    setupKeyId?: string;
    boundGroupId?: string;
    installHostname?: string;
  } = {
    id: node.id.replace("peer-", ""),
    name:
      data.placeholderName ??
      PLACEHOLDER_BASE_NAMES[data.placeholderKind] ??
      "Peer",
    ip: "",
    // The kind rides in `os` so selectors show the placeholder icon, not a wrong OS logo.
    os: `draft-${data.placeholderKind}`,
    setupKey: data.setupKey,
    setupKeyId: data.setupKeyId,
    boundGroupId: data.boundGroupId,
    installHostname: data.installHostname,
  };
  return pseudo as Peer;
};

export const getPlaceholderSetupKey = (
  nodes: CanvasNode[],
  draftId: string,
): string | undefined => {
  const own = nodes.find((n) => n.id === `peer-${draftId}`);
  if (own) return (own.data as { setupKey?: string })?.setupKey;
  for (const n of nodes) {
    const held = n.data?.draftPeers as
      | (Peer & { setupKey?: string })[]
      | undefined;
    const entry = held?.find((p) => p.id === draftId);
    if (entry) return entry.setupKey;
  }
  return undefined;
};

// Sanitizing can collide ("Agent (1)" and "Agent 1"), so hostnames go in node order.
export const getPlaceholderHostname = (
  nodes: CanvasNode[],
  nodeId: string,
): string | undefined => {
  const sanitize = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  const taken = new Set<string>();
  const seenIds = new Set<string>();
  let result: string | undefined;
  const assign = (name: string, forNodeId: string) => {
    const base = sanitize(name) || "peer";
    let candidate = base;
    let suffix = 1;
    while (taken.has(candidate)) candidate = `${base}-${suffix++}`;
    taken.add(candidate);
    if (forNodeId === nodeId) result = candidate;
  };
  nodes.forEach((n) => {
    const peer = getPlaceholderPeer(n);
    if (peer?.id && !seenIds.has(peer.id)) {
      seenIds.add(peer.id);
      assign(peer.name ?? "", n.id);
      return;
    }
    // Placeholders absorbed into a group live on the group node, which can appear twice.
    const held = (n.data as { draftPeers?: Peer[] })?.draftPeers;
    held?.forEach((p) => {
      if (!p.id || seenIds.has(p.id)) return;
      seenIds.add(p.id);
      assign(p.name ?? "", `peer-${p.id}`);
    });
  });
  return result;
};

// A grouped entity's node leaves the canvas, so a policy naming it alone points at the group.
export const getPolicyRegroupUpdates = (
  nodes: CanvasNode[],
  groupedIds: Set<string>,
  group: Group,
): Policy[] => {
  const updates: Policy[] = [];
  nodes.forEach((n) => {
    const policy = (n.data as { policy?: Policy })?.policy;
    const rule = policy?.rules?.[0];
    if (!policy || !rule) return;
    const sourceGrouped =
      !!rule.sourceResource && groupedIds.has(rule.sourceResource.id);
    const destGrouped =
      !!rule.destinationResource && groupedIds.has(rule.destinationResource.id);
    if (!sourceGrouped && !destGrouped) return;
    updates.push({
      ...policy,
      rules: [
        {
          ...rule,
          sources: sourceGrouped ? [group] : rule.sources,
          sourceResource: sourceGrouped ? undefined : rule.sourceResource,
          destinations: destGrouped ? [group] : rule.destinations,
          destinationResource: destGrouped
            ? undefined
            : rule.destinationResource,
        },
        ...(policy.rules?.slice(1) ?? []),
      ],
    });
  });
  return updates;
};

// Deployable forbids placeholder peers; trackable allows them so they surface as issues.
const policyComplete = (
  policy: Policy,
  trackedResourceClientIds: Set<string> | undefined,
  peerMustBeInstalled: boolean,
) => {
  const rule = policy.rules?.[0];
  if (!rule) return false;
  const hasSource = (rule.sources?.length ?? 0) > 0 || !!rule.sourceResource;
  const hasDestination =
    (rule.destinations?.length ?? 0) > 0 || !!rule.destinationResource;
  const isOkResource = (r?: { id: string }) => {
    if (!r?.id) return true;
    if (r.id.startsWith("draft-")) return !peerMustBeInstalled;
    // Draft resources deploy first and resolve, but only tracked ones.
    if (r.id.startsWith("new-")) {
      return trackedResourceClientIds?.has(r.id) ?? false;
    }
    return true;
  };
  return (
    hasSource &&
    hasDestination &&
    isOkResource(rule.sourceResource) &&
    isOkResource(rule.destinationResource)
  );
};

export const isDeployablePolicy = (
  policy: Policy,
  trackedResourceClientIds?: Set<string>,
) => policyComplete(policy, trackedResourceClientIds, true);

// A policy still missing a side stays canvas-only, not listed.
export const isTrackablePolicy = (
  policy: Policy,
  trackedResourceClientIds?: Set<string>,
) => policyComplete(policy, trackedResourceClientIds, false);

// `data.enabled` is a DIMMING flag (the owning network's state), NOT the resource's
// own; a draft resource has no live twin, so there the flag IS the state.
export const getResourceNodeEnabled = (node?: {
  id: string;
  data?: unknown;
}): boolean => {
  const data = node?.data as
    | {
        enabled?: boolean;
        resourceEnabled?: boolean;
        resource?: { enabled?: boolean };
      }
    | undefined;
  if (node?.id.startsWith("resource-new-")) return data?.enabled ?? true;
  return data?.resourceEnabled ?? data?.resource?.enabled ?? true;
};

// `data.resource` is NOT the live snapshot — saveDraftResource writes edits into
// it — so the live values are stashed once, on the first edit.
export const getResourceLiveBaseline = (node?: {
  data?: unknown;
}): NetworkResource | undefined => {
  const data = node?.data as
    | { liveResource?: NetworkResource; resource?: NetworkResource }
    | undefined;
  return data?.liveResource ?? data?.resource;
};

export const withResourceLiveBaseline = (
  data: Record<string, unknown>,
): Record<string, unknown> =>
  data.liveResource ? data : { ...data, liveResource: data.resource };

// Edits land on `resourceGroupIds` while `resource.groups` stays live, so reading
// the latter as the current value silently reverts a pending group edit.
export const getResourceDraftGroupIds = (node?: {
  data?: unknown;
}): string[] => {
  const data = node?.data as
    | { resourceGroupIds?: string[]; resource?: NetworkResource }
    | undefined;
  if (data?.resourceGroupIds) return data.resourceGroupIds;
  return ((data?.resource?.groups as (string | { id?: string })[]) ?? [])
    .map((g) => (typeof g === "string" ? g : g.id ?? ""))
    .filter(Boolean);
};

// A placeholder dragged into a group is absorbed into that group node's
// draftPeers and loses its own node, so removing it by node id finds nothing.
export const findPlaceholderHolder = (
  nodes: CanvasNode[],
  draftId: string,
): CanvasNode | undefined =>
  nodes.find((n) =>
    (n.data?.draftPeers as { id?: string }[] | undefined)?.some(
      (p) => p.id === draftId,
    ),
  );

// Also out of addedMembers, so the group's membership change nets back out.
export const dropAbsorbedPlaceholder = (
  nodes: CanvasNode[],
  draftId: string,
): CanvasNode[] =>
  nodes.map((n) => {
    const held = n.data?.draftPeers as { id?: string }[] | undefined;
    if (!held?.some((p) => p.id === draftId)) return n;
    const members = n.data?.addedMembers as Set<string> | undefined;
    return {
      ...n,
      data: {
        ...n.data,
        draftPeers: held.filter((p) => p.id !== draftId),
        ...(members
          ? {
              addedMembers: new Set(
                Array.from(members).filter((id) => id !== draftId),
              ),
            }
          : {}),
      },
    };
  });

// Canvas-display guess only; the API derives the authoritative type on create.
export const deriveResourceType = (
  address: string,
): "domain" | "host" | "subnet" => {
  if (/[a-z*]/i.test(address)) return "domain";
  if (address.includes("/")) return "subnet";
  return "host";
};

// Frame-ness is the explicit `data.frame` flag; the `network-new-` id is only a fallback.
export const isFrameNode = (node?: {
  id: string;
  data?: unknown;
}): boolean =>
  !!node &&
  (node.id.startsWith("network-new-") ||
    !!(node.data as { frame?: boolean } | undefined)?.frame);

// ReactFlow requires parents to PRECEDE their children; applyNodeChanges won't reorder.
export const ensureParentsBeforeChildren = (
  nodes: CanvasNode[],
): CanvasNode[] => {
  const indexOf = new Map(nodes.map((n, i) => [n.id, i]));
  const violated = nodes.some((n, i) => {
    const parentIdx = n.parentId ? indexOf.get(n.parentId) : undefined;
    return parentIdx !== undefined && parentIdx > i;
  });
  if (!violated) return nodes;

  const childrenOf = new Map<string, CanvasNode[]>();
  const roots: CanvasNode[] = [];
  nodes.forEach((n) => {
    if (n.parentId && indexOf.has(n.parentId)) {
      const siblings = childrenOf.get(n.parentId) ?? [];
      siblings.push(n);
      childrenOf.set(n.parentId, siblings);
    } else {
      roots.push(n);
    }
  });
  const out: CanvasNode[] = [];
  const emit = (n: CanvasNode) => {
    out.push(n);
    childrenOf.get(n.id)?.forEach(emit);
  };
  roots.forEach(emit);
  return out;
};

// A frame for a network that does NOT exist yet.
export const isDraftNetworkNode = (node?: { id: string }): boolean =>
  !!node && node.id.startsWith("network-new-");

export type DraftNetworkRef = {
  networkId?: string;
  networkClientId?: string;
  name: string;
};

// Pseudo-NetworkResource for a draft resource node; undefined for real ones.
export const getDraftResource = (
  node?: CanvasNode,
): NetworkResource | undefined => {
  if (!node?.id.startsWith("resource-new-")) return undefined;
  const resource = (node.data as { resource?: Partial<NetworkResource> })
    ?.resource;
  return {
    ...resource,
    id: node.id.replace("resource-", ""),
    name: resource?.name ?? "Resource",
    address: resource?.address ?? "",
    type: resource?.address ? deriveResourceType(resource.address) : undefined,
    enabled: true,
  } as NetworkResource;
};

export const isCompleteDraftResource = (node?: CanvasNode): boolean => {
  const resource = getDraftResource(node);
  // Check the RAW name: getDraftResource defaults it to "Resource".
  const rawName = (node?.data as { resource?: { name?: string } })?.resource
    ?.name;
  const network = (node?.data as { draftNetwork?: DraftNetworkRef })
    ?.draftNetwork;
  return !!rawName && !!resource?.address && !!network?.name;
};

// Display-only dashed line showing a resource's parent network.
export const makeMembershipEdge = (
  resourceNodeId: string,
  networkNodeId: string,
): CanvasEdge => ({
  id: `member-${resourceNodeId}-${networkNodeId}`,
  source: resourceNodeId,
  target: networkNodeId,
  type: "simple",
  data: { membership: true },
});

// Seed the initial placement only; real row heights are measured (useNetworkFrameLayout).
export const NETWORK_FRAME_WIDTH = 300;
export const NETWORK_FRAME_HEADER = 72;
export const NETWORK_FRAME_PADDING_X = 20;
export const NETWORK_FRAME_PADDING_Y = 14;
export const NETWORK_FRAME_GAP = 0;
export const NETWORK_FRAME_ROW_GAP = 4;
export const NETWORK_FRAME_FALLBACK_ROW = 58;

export const NETWORK_FRAME_CHILD_WIDTH =
  NETWORK_FRAME_WIDTH - NETWORK_FRAME_PADDING_X * 2;
// Rows hug their content in multi-column layouts, else the columns gap apart.
export const NETWORK_FRAME_CHILD_WIDTH_MULTI = 185;

// Past this cap the last cell becomes "+N more"; the drill-down shows everything.
export const NETWORK_FRAME_MAX_VISIBLE = 6;
// NetworkNode pins the button (h-9) so the gap below the resources is exact.
export const NETWORK_FRAME_ADD_BUTTON_H = 36;
// Larger than NETWORK_FRAME_ROW_GAP so the button reads as a separate action.
export const NETWORK_FRAME_ADD_GAP = 12;
// Matches the button container's `pb-5` in NetworkNode.
export const NETWORK_FRAME_ADD_PAD = 20;
export const NETWORK_FRAME_ADD_ROW =
  NETWORK_FRAME_ADD_GAP + NETWORK_FRAME_ADD_BUTTON_H + NETWORK_FRAME_ADD_PAD;
// Breathing room for the centered "Add Resource" button of an empty frame.
export const NETWORK_FRAME_EMPTY_EXTRA_H = 28;

// The column count targets a square-ish frame (width ≈ height in pixels).
export const getFrameGridColumns = (count: number) => {
  if (count <= 2) return 1;
  const cellW = NETWORK_FRAME_CHILD_WIDTH + NETWORK_FRAME_GAP;
  const cellH = NETWORK_FRAME_FALLBACK_ROW + NETWORK_FRAME_ROW_GAP;
  return Math.max(1, Math.round(Math.sqrt(count * (cellH / cellW))));
};

export const getNetworkFrameWidth = (
  cols: number,
  childWidth = NETWORK_FRAME_CHILD_WIDTH,
) =>
  NETWORK_FRAME_PADDING_X * 2 +
  cols * childWidth +
  (cols - 1) * NETWORK_FRAME_GAP;

// An empty frame still reserves one row so it keeps the one-resource height.
export const getNetworkFrameHeight = (resourceCount: number) =>
  NETWORK_FRAME_HEADER +
  NETWORK_FRAME_PADDING_Y +
  Math.max(resourceCount, 1) *
    (NETWORK_FRAME_FALLBACK_ROW + NETWORK_FRAME_ROW_GAP) -
  NETWORK_FRAME_ROW_GAP +
  NETWORK_FRAME_PADDING_Y +
  NETWORK_FRAME_ADD_ROW +
  (resourceCount === 0 ? NETWORK_FRAME_EMPTY_EXTRA_H : 0);

// Frame-relative; corrected by the measured layout once heights are known.
export const getFrameChildPosition = (index: number) => ({
  x: NETWORK_FRAME_PADDING_X,
  y:
    NETWORK_FRAME_HEADER +
    NETWORK_FRAME_PADDING_Y +
    index * (NETWORK_FRAME_FALLBACK_ROW + NETWORK_FRAME_ROW_GAP),
});

// Seed grid for a live overview frame; must match what useNetworkFrameLayout reconciles to.
export const getLiveFrameGrid = (resourceCount: number) => {
  const hasMore = resourceCount > NETWORK_FRAME_MAX_VISIBLE;
  const visibleCount = hasMore
    ? NETWORK_FRAME_MAX_VISIBLE - 1
    : Math.min(resourceCount, NETWORK_FRAME_MAX_VISIBLE);
  const cellCount = visibleCount + (hasMore ? 1 : 0);
  const cols = cellCount > 1 ? 2 : 1;
  const sparse = resourceCount <= 1;
  const childWidth =
    cols > 1
      ? NETWORK_FRAME_CHILD_WIDTH_MULTI
      : sparse
      ? 2 * NETWORK_FRAME_CHILD_WIDTH_MULTI + NETWORK_FRAME_GAP
      : NETWORK_FRAME_CHILD_WIDTH;
  const rows = Math.max(Math.ceil(cellCount / cols), 1);
  const cellPosition = (index: number) => ({
    x: NETWORK_FRAME_PADDING_X + (index % cols) * (childWidth + NETWORK_FRAME_GAP),
    y:
      NETWORK_FRAME_HEADER +
      NETWORK_FRAME_PADDING_Y +
      Math.floor(index / cols) *
        (NETWORK_FRAME_FALLBACK_ROW + NETWORK_FRAME_ROW_GAP),
  });
  return {
    width: getNetworkFrameWidth(cols, childWidth),
    // Empty frames mirror the reconciler's empty height.
    height:
      resourceCount > 0
        ? NETWORK_FRAME_HEADER +
          NETWORK_FRAME_PADDING_Y +
          rows * NETWORK_FRAME_FALLBACK_ROW +
          (rows - 1) * NETWORK_FRAME_ROW_GAP +
          NETWORK_FRAME_ADD_ROW
        : getNetworkFrameHeight(0),
    childWidth,
    visibleCount,
    cellPosition,
  };
};

export function isFocusWorthy(
  nodeId: string,
  nodes: { id: string; type?: string }[],
  edges: { source: string; target: string }[],
): boolean {
  // Focus only pays off when there is something to dim away.
  if (!edges.some((e) => e.source === nodeId || e.target === nodeId)) {
    return false;
  }
  const policyCount = nodes.filter((n) => n.type === "policyNode").length;
  return policyCount >= 2;
}

// Policy-reached resources sort to the TOP so they stay above the "+N more" cap.
export function orderFrameResources(
  resources: NetworkResource[],
  networkPolicyIds: string[] | undefined,
  policies: Policy[] | undefined,
): NetworkResource[] {
  const relevant = (policies ?? []).filter((p) =>
    (networkPolicyIds ?? []).includes(p.id ?? ""),
  );
  const directTargets = new Set<string>();
  const destGroupIds = new Set<string>();
  relevant.forEach((p) => {
    const rule = p.rules?.[0];
    if (!rule) return;
    const dr = rule.destinationResource as { id?: string } | undefined;
    if (dr?.id) directTargets.add(dr.id);
    ((rule.destinations as (Group | string)[]) ?? []).forEach((g) => {
      const id = typeof g === "string" ? g : g?.id;
      if (id) destGroupIds.add(id);
    });
  });
  const isTargeted = (r: NetworkResource) =>
    directTargets.has(r.id) ||
    ((r.groups ?? []) as (Group | string)[]).some((g) =>
      destGroupIds.has(typeof g === "string" ? g : g?.id ?? ""),
    );
  return [...resources.filter(isTargeted), ...resources.filter((r) => !isTargeted(r))];
}

// Ignores positions/measure/drag state so node drags don't re-render mounted consumers.
export function useStructuralNodes(options?: { selection?: boolean }) {
  const withSelection = options?.selection ?? false;
  return useStore(
    (s: { nodes: CanvasNode[] }) => s.nodes,
    (a: CanvasNode[], b: CanvasNode[]) =>
      a === b ||
      (a.length === b.length &&
        a.every((n, i) => {
          const m = b[i];
          return (
            n.id === m.id &&
            n.data === m.data &&
            n.parentId === m.parentId &&
            (!withSelection || n.selected === m.selected)
          );
        })),
  );
}

// Shared by the live overview and the draft build so the policy → network gap matches.
export const FRAME_GRID_BASE_X = 1050;
export const FRAME_GRID_GAP_X = 280;
export const FRAME_GRID_GAP_Y = 200;

// The grid centers frames on the column midline, so a lone source peer would hang low.
export const SOURCE_NODE_HALF_HEIGHT = 30;

// Odd columns start half a cell lower so edges flow between frames; mutates in place.
export function packFrameGrid(
  frames: CanvasNode[],
  baseX: number,
  centerMidY: number,
) {
  if (frames.length === 0) return;
  const cellW = NETWORK_FRAME_WIDTH + FRAME_GRID_GAP_X;
  const heights = frames.map((f) => Number(f.style?.height) || 300);
  const avgH =
    heights.reduce((a, b) => a + b, 0) / heights.length + FRAME_GRID_GAP_Y;
  const cols = Math.min(
    Math.max(1, Math.round(Math.sqrt((frames.length * avgH) / cellW))),
    frames.length,
  );
  const columnY = Array.from({ length: cols }, (_, col) =>
    col % 2 === 1 ? avgH / 2 : 0,
  );
  // Order by name so live and draft fill the grid identically.
  const nameOf = (n: CanvasNode) =>
    ((n.data as { network?: { name?: string } })?.network?.name ?? "")
      .toLowerCase();
  const ordered = frames.slice().sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
  ordered.forEach((frame, i) => {
    const col = i % cols;
    frame.position = { x: baseX + col * cellW, y: columnY[col] };
    columnY[col] += (Number(frame.style?.height) || 300) + FRAME_GRID_GAP_Y;
  });
  const minY = Math.min(...ordered.map((f) => f.position.y));
  const maxY = Math.max(
    ...ordered.map((f) => f.position.y + (Number(f.style?.height) || 300)),
  );
  const shiftY = centerMidY - (minY + maxY) / 2;
  ordered.forEach((f) => {
    f.position = { x: f.position.x, y: f.position.y + shiftY };
  });
}

// The side panels freeze `order` per open so a save's mutate never reshuffles rows.
export function pinByOrder<T>(
  items: T[],
  order: string[],
  keyOf: (t: T) => string,
): T[] {
  const index = new Map(order.map((id, i) => [id, i] as const));
  return [...items].sort(
    (a, b) =>
      (index.get(keyOf(a)) ?? Number.MAX_SAFE_INTEGER) -
      (index.get(keyOf(b)) ?? Number.MAX_SAFE_INTEGER),
  );
}
