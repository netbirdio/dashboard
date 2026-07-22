import {
  Edge as CanvasEdge,
  Node as CanvasNode,
  useReactFlow,
} from "@xyflow/react";
import { orderBy } from "lodash";
import { singularize } from "@utils/helpers";
import { Group } from "@/interfaces/Group";
import { Network, NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import { Policy } from "@/interfaces/Policy";

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

// Shared "X Peer(s), Y Resource(s)" label used by GroupNode and the
// components sidebar so a group reads the same on the canvas and in the list.
export const getGroupCountLabel = (group?: Group) => {
  const peerCount = group?.peers_count || 0;
  const resourceCount = group?.resources_count || 0;
  if (resourceCount === 0)
    return peerCount === 0 ? "No Peers" : singularize("Peers", peerCount, true);
  if (peerCount === 0) return singularize("Resources", resourceCount, true);
  return `${singularize("Peers", peerCount, true)}, ${singularize(
    "Resources",
    resourceCount,
    true,
  )}`;
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

// Policies that grant access to any of the given resources — either directly
// (destinationResource id) or via a destination group the resource belongs
// to. Used when an existing network/resource is dropped onto the draft
// canvas: its policies are drawn alongside it (mirror of dropping an
// existing policy, which draws its sources/destinations).
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

export function useSourceGroupEnabled(sourceId: string) {
  const { getNode } = useReactFlow();
  const node = getNode(sourceId);
  return node?.data?.enabled ?? false;
}

export function useAnySourceGroupEnabled(sourceId: string) {
  const { getNodes, getEdges } = useReactFlow();

  const nodes = getNodes();
  const edges = getEdges();

  const incomingEdges = edges.filter((e) => e.target === sourceId);
  const sourceNodes = incomingEdges
    .map((edge) => nodes.find((n) => n.id === edge.source))
    .filter(Boolean);
  const sourceEnabledStates = incomingEdges.map((e) => e?.data?.enabled);
  return sourceEnabledStates.some(Boolean);
}

export function getFirstGroup(groups?: Group[], policies?: Policy[]) {
  const sortedGroups = orderBy(groups, "peers_count", "desc");
  const groupsWithoutAll = sortedGroups?.filter((g) => g.name !== "All");

  const groupsWithPolicies = orderBy(
    groupsWithoutAll?.filter((g) => {
      return policies?.some((p) => {
        const sources = getSourceGroupsFromPolicy(p);
        return sources?.some((source) => source.id === g.id);
      });
    }),
    "peers_count",
    "desc",
  );

  if (groupsWithPolicies && groupsWithPolicies?.length > 0) {
    return groupsWithPolicies[0];
  }

  if (groupsWithoutAll && groupsWithoutAll?.length > 0) {
    return groupsWithoutAll[0];
  }

  return sortedGroups?.[0];
}

// NetBird's default peer network range, used when the account has no custom
// `settings.network_range`.
const DEFAULT_NETWORK_RANGE = "100.64.0.0/10";

// Placeholder for the IP slot of not-yet-installed peers, derived from the
// account's peer network range: octets fully fixed by the prefix are kept,
// the rest become "x" — 100.64.0.0/10 → "100.x.x.x", 10.20.0.0/16 →
// "10.20.x.x", 192.168.1.0/24 → "192.168.1.x".
export const getIpPlaceholderFromRange = (range?: string) => {
  const [address, prefixStr] = (range || DEFAULT_NETWORK_RANGE).split("/");
  const octets = address?.split(".") ?? [];
  const prefix = Number(prefixStr);
  if (octets.length !== 4 || !Number.isFinite(prefix)) return "100.x.x.x";
  const fixedOctets = Math.min(4, Math.max(0, Math.floor(prefix / 8)));
  return octets.map((o, i) => (i < fixedOctets ? o : "x")).join(".");
};

// Default names per placeholder kind ("Agent", "Agent (1)", …).
export const PLACEHOLDER_BASE_NAMES: Record<string, string> = {
  agent: "Agent",
  server: "Server",
  "user-device": "User Device",
};

// A placeholder peer node (Server / Agent / User Device, not installed yet)
// as a pseudo-Peer: unique draft id ("draft-<uuid>", from node id
// "peer-draft-<uuid>") plus its canvas name — lets placeholders participate
// in policies and the policy modal's peer selector before they exist in the
// API. A user-device select node with a peer chosen is that real peer, not
// a placeholder anymore.
export const getPlaceholderPeer = (node?: CanvasNode): Peer | undefined => {
  const data = node?.data as
    | { placeholderKind?: string; placeholderName?: string; peer?: Peer }
    | undefined;
  if (!node || !data?.placeholderKind || data.peer) return undefined;
  return {
    id: node.id.replace("peer-", ""),
    name:
      data.placeholderName ??
      PLACEHOLDER_BASE_NAMES[data.placeholderKind] ??
      "Peer",
    ip: "",
    // The kind rides along in `os` so peer selectors/badges can show the
    // Server/Agent/User-Device icon instead of a (wrong) OS logo — see
    // PeerOperatingSystemIcon; getOperatingSystem treats it as unknown.
    os: `draft-${data.placeholderKind}`,
  } as Peer;
};

// Suggested install hostname for a placeholder peer: its canvas name,
// sanitized (lowercase, dashes), made unique across the other draft peers on
// the canvas by appending -1, -2, … Names are unique, but sanitizing can
// still collide — "Agent (1)" and "Agent 1" both become "agent-1" — so
// hostnames are assigned greedily in node order.
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
  let result: string | undefined;
  nodes.forEach((n) => {
    // Skips non-placeholders and user-device selects that picked a peer.
    const peer = getPlaceholderPeer(n);
    if (!peer) return;
    const base = sanitize(peer.name ?? "") || "peer";
    let candidate = base;
    let suffix = 1;
    while (taken.has(candidate)) candidate = `${base}-${suffix++}`;
    taken.add(candidate);
    if (n.id === nodeId) result = candidate;
  });
  return result;
};

// Policies that referenced one of the grouped entities as their single
// source/destination get rewritten to point at the group instead — the
// entity's node leaves the canvas when it's grouped, so the reference would
// otherwise dangle with no connection. Returns the updated policies; run
// them through updateDraftPolicy (which records changes + redraws edges).
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

// Only a policy with both a source and a destination is deployable — and
// neither side may reference a placeholder peer ("draft-…" id): the peer
// doesn't exist in the API until it's installed. Policies failing this stay
// out of the changeset (canvas-only) until the draft completes them.
export const isDeployablePolicy = (
  policy: Policy,
  // Client ids of draft resources that ARE tracked (complete) — a policy
  // referencing a "new-…" resource is deployable only when the resource
  // itself will be created on deploy.
  trackedResourceClientIds?: Set<string>,
) => {
  const rule = policy.rules?.[0];
  if (!rule) return false;
  const hasSource = (rule.sources?.length ?? 0) > 0 || !!rule.sourceResource;
  const hasDestination =
    (rule.destinations?.length ?? 0) > 0 || !!rule.destinationResource;
  const isDeployableResource = (r?: { id: string }) => {
    if (!r?.id) return true;
    // Placeholder peers don't exist in the API until installed.
    if (r.id.startsWith("draft-")) return false;
    // Draft resources deploy first and resolve — but only tracked ones.
    if (r.id.startsWith("new-")) {
      return trackedResourceClientIds?.has(r.id) ?? false;
    }
    return true;
  };
  return (
    hasSource &&
    hasDestination &&
    isDeployableResource(rule.sourceResource) &&
    isDeployableResource(rule.destinationResource)
  );
};

// Derived resource type for canvas display; the API derives the
// authoritative type on create. Mirrors ResourceSingleAddressInput: letters
// → domain, "/" → subnet, otherwise a single host address.
export const deriveResourceType = (
  address: string,
): "domain" | "host" | "subnet" => {
  if (/[a-z*]/i.test(address)) return "domain";
  if (address.includes("/")) return "subnet";
  return "host";
};

// A network node that renders/behaves as a draft-canvas FRAME. Frame-ness is
// an explicit `data.frame` flag (set on existing networks dropped as frames),
// with the `network-new-` id kept as a built-in fallback for draft networks
// (always frames) — so it is NOT tied to the id prefix. Distinct from
// `isDraftNetworkNode` (a not-yet-created network: `network-new-`).
export const isFrameNode = (node?: {
  id: string;
  data?: unknown;
}): boolean =>
  !!node &&
  (node.id.startsWith("network-new-") ||
    !!(node.data as { frame?: boolean } | undefined)?.frame);

// A frame for a network that does NOT exist yet — it's tracked as a
// create-network change and is editable/removable as a draft. Existing
// networks dropped as frames are not draft networks.
export const isDraftNetworkNode = (node?: { id: string }): boolean =>
  !!node && node.id.startsWith("network-new-");

// The parent-network reference a draft resource node carries (set by the
// draft resource editor / drag-onto-network).
export type DraftNetworkRef = {
  networkId?: string;
  networkClientId?: string;
  name: string;
};

// A draft resource node's pseudo-NetworkResource (counterpart of
// getPlaceholderPeer): pseudo id "new-<uuid>" from node id
// resource-new-<uuid>. Returns undefined for real resources.
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

// A draft resource is complete (and thus changeset-worthy) once it has a
// name, a valid-enough address, and a parent network.
export const isCompleteDraftResource = (node?: CanvasNode): boolean => {
  const resource = getDraftResource(node);
  const network = (node?.data as { draftNetwork?: DraftNetworkRef })
    ?.draftNetwork;
  return !!resource?.name && !!resource?.address && !!network?.name;
};

// Routing edge (peer/group → network): gray dashed "routes" line, visually
// distinct from policy edges; never opens the policy modal.
export const makeRouterEdge = (
  sourceNodeId: string,
  networkNodeId: string,
): CanvasEdge => ({
  id: `router-${sourceNodeId}-${networkNodeId}`,
  source: sourceNodeId,
  target: networkNodeId,
  type: "floating-straight",
  data: { router: true, label: "routes" },
});

// Membership edge (resource → network): subtle dashed line showing the
// parent-network relationship when both are on canvas. Display-only.
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

// Draft network frame (a bordered container node that wraps its resource
// nodes as ReactFlow children). Children stack under the header with a
// NETWORK_FRAME_PADDING_X/Y around the content; the actual row
// heights are measured at runtime (useNetworkFrameLayout) — the constants
// below only seed the initial placement until nodes report their size.
export const NETWORK_FRAME_WIDTH = 300;
// Height of the frame's header band; the content area starts below it.
export const NETWORK_FRAME_HEADER = 72;
// Content padding inside the frame: X = left/right, Y = below the header
// and above the bottom edge.
export const NETWORK_FRAME_PADDING_X = 20;
export const NETWORK_FRAME_PADDING_Y = 14;
export const NETWORK_FRAME_GAP = 0;
// Vertical spacing between resource rows (tighter than the column gap).
export const NETWORK_FRAME_ROW_GAP = 4;
// Estimated resource card height before measurement.
export const NETWORK_FRAME_FALLBACK_ROW = 58;

export const NETWORK_FRAME_CHILD_WIDTH =
  NETWORK_FRAME_WIDTH - NETWORK_FRAME_PADDING_X * 2;
// Row width in MULTI-column layouts — rows hug their content there, a
// full-width row per column would leave a big gap between the columns.
export const NETWORK_FRAME_CHILD_WIDTH_MULTI = 185;

// Parent (collapsed) frame view shows at most this many grid cells; once
// resources exceed the cap the last cell becomes a "+N more" cell (occupying
// one slot) and the rest are hidden. Everything is visible in the drill-down.
export const NETWORK_FRAME_MAX_VISIBLE = 6;
// Fixed height of the bottom "Add Resource" button — NetworkNode pins it
// (h-9 = 36px) so the gap below the resources is exact, not dependent on the
// button's ambiguous intrinsic size.
export const NETWORK_FRAME_ADD_BUTTON_H = 36;
// Gap between the last resource row and the bottom "Add Resource" button.
// Deliberately larger than NETWORK_FRAME_ROW_GAP so the button reads as a
// separate action, not just another resource row.
export const NETWORK_FRAME_ADD_GAP = 12;
// Padding between the "Add Resource" button and the frame's bottom edge.
// Matches the button container's `pb-5` (20px) in NetworkNode.
export const NETWORK_FRAME_ADD_PAD = 20;
// Vertical band the frame reserves below the resources for the add button:
// the top gap + the button height + the bottom padding. The button is
// bottom-pinned with NETWORK_FRAME_ADD_PAD below it, leaving
// NETWORK_FRAME_ADD_GAP above it.
export const NETWORK_FRAME_ADD_ROW =
  NETWORK_FRAME_ADD_GAP + NETWORK_FRAME_ADD_BUTTON_H + NETWORK_FRAME_ADD_PAD;
// Empty frames get a little extra height so the centered "Add Resource"
// button has breathing room (only the empty state — 1+ resources keep the
// one-row height).
export const NETWORK_FRAME_EMPTY_EXTRA_H = 28;

// Drill-down grid math: the column count targets a square-ish frame
// (width ≈ height in pixels) — cols = sqrt(N * cellH / cellW).
export const getFrameGridColumns = (count: number) => {
  if (count <= 2) return 1;
  const cellW = NETWORK_FRAME_CHILD_WIDTH + NETWORK_FRAME_GAP;
  const cellH = NETWORK_FRAME_FALLBACK_ROW + NETWORK_FRAME_ROW_GAP;
  return Math.max(1, Math.round(Math.sqrt(count * (cellH / cellW))));
};

// Frame width for a column count (1 column = NETWORK_FRAME_WIDTH).
export const getNetworkFrameWidth = (
  cols: number,
  childWidth = NETWORK_FRAME_CHILD_WIDTH,
) =>
  NETWORK_FRAME_PADDING_X * 2 +
  cols * childWidth +
  (cols - 1) * NETWORK_FRAME_GAP;

// Frame body = header + resource rows + the bottom "Add Resource" band. An
// empty frame still reserves ONE row (Math.max(count, 1)) so it's about the
// single/two-resource height, plus a little extra so its centered button
// breathes. Seed height; useNetworkFrameLayout reconciles it from measured
// rows (and swaps the add band for the "+N More" footer once resources
// overflow the visible cap).
export const getNetworkFrameHeight = (resourceCount: number) =>
  NETWORK_FRAME_HEADER +
  NETWORK_FRAME_PADDING_Y +
  Math.max(resourceCount, 1) *
    (NETWORK_FRAME_FALLBACK_ROW + NETWORK_FRAME_ROW_GAP) -
  NETWORK_FRAME_ROW_GAP +
  NETWORK_FRAME_PADDING_Y +
  NETWORK_FRAME_ADD_ROW +
  (resourceCount === 0 ? NETWORK_FRAME_EMPTY_EXTRA_H : 0);

// Initial child position of the i-th resource inside its network frame
// (relative coordinates — the resource node carries parentId); corrected by
// the measured layout once heights are known.
export const getFrameChildPosition = (index: number) => ({
  x: NETWORK_FRAME_PADDING_X,
  y:
    NETWORK_FRAME_HEADER +
    NETWORK_FRAME_PADDING_Y +
    index * (NETWORK_FRAME_FALLBACK_ROW + NETWORK_FRAME_ROW_GAP),
});
