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
  // Resources lead once the group holds any; a zero side is omitted.
  if (peerCount === 0) return singularize("Resources", resourceCount, true);
  return `${singularize("Resources", resourceCount, true)}, ${singularize(
    "Peers",
    peerCount,
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

// Whether a GROUP node may be dropped INTO a network frame (it becomes a
// resource-group row): allowed when the group is EMPTY (no peers/resources,
// no draft-added members) or when at least one of the network's resources
// (API list + draft/standalone resources assigned to the frame) belongs to
// the group.
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
  // A draft group carrying UNASSIGNED draft resources (grouped standalone
  // cards) may drop into any network — the drop assigns those resources to
  // it (see useDragToGroup).
  const carriedDraftResources = (
    groupNode.data as { draftResources?: NetworkResource[] }
  )?.draftResources;
  if (carriedDraftResources?.length) return true;

  const groupKey = group.id ?? group.name;
  const network = (
    frameNode.data as { network?: { id?: string; resources?: string[] } }
  )?.network;

  // The network's resources: the API list plus draft/standalone resource
  // nodes assigned to this frame (children or a matching draftNetwork ref).
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

// Z-index that puts a node above everything settled on the canvas — dropped
// and dragged nodes call this so they paint over frames (which elevate to
// maxZ+2 themselves; their children render at parent+1, so +2 beats both).
// Drag-time elevations (>= 1000) are transient and ignored.
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

// `skip` when the caller already has an explicit enabled flag (the common
// case) — getNodes()/getEdges() copy the full arrays, and running that on
// every render of every node component added up on big canvases.
export function useAnySourceGroupEnabled(sourceId: string, skip = false) {
  const { getEdges } = useReactFlow();
  if (skip) return false;
  const edges = getEdges();
  const incomingEdges = edges.filter((e) => e.target === sourceId);
  return incomingEdges.some((e) => e?.data?.enabled);
}

// Initial group-view pick — always tries to show a non-empty canvas:
// 1. a non-"All" group that is a policy source, 2. "All" if it is one
// (a populated All view beats an empty group), 3. any non-"All" group,
// 4. whatever is left.
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

// A short random suffix that keeps a bound placeholder group's name unique
// even when two placeholders share a base name ("Agent", "Agent").
export const makeBoundGroupSuffix = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)
  )
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 5);

// A bound group's display name: the placeholder's name tagged "(Draft)",
// e.g. "Agent (Draft)". A random suffix is inserted only when that name is
// already taken ("Agent (a3f9c) (Draft)"). The group is hidden and
// short-lived (created at setup-key generation, deleted once the peer is
// matched or the draft is abandoned), so the name is just a recognizable
// label that reads as temporary.
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

// Only server/agent placeholders get a hidden bound group for install
// matching (user devices don't).
export const kindHasBoundGroup = (kind?: string) =>
  kind === "server" || kind === "agent";

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
    // Skips non-placeholders and user-device selects that picked a peer.
    const peer = getPlaceholderPeer(n);
    if (peer?.id && !seenIds.has(peer.id)) {
      seenIds.add(peer.id);
      assign(peer.name ?? "", n.id);
      return;
    }
    // Placeholders absorbed into a group live on the group node instead
    // (data.draftPeers) — a group can appear twice, dedup by id.
    const held = (n.data as { draftPeers?: Peer[] })?.draftPeers;
    held?.forEach((p) => {
      if (!p.id || seenIds.has(p.id)) return;
      seenIds.add(p.id);
      assign(p.name ?? "", `peer-${p.id}`);
    });
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

// Shared core of the two policy gates below. A policy needs both a source and
// a destination, and neither side may reference a draft resource ("new-…" id)
// that isn't tracked (it wouldn't be created on deploy). The one difference is
// placeholder peers ("draft-…" id): they don't exist in the API until
// installed, so a DEPLOYABLE policy can't reference one — but a TRACKABLE one
// can (it enters the changeset and surfaces the missing peer as a blocking
// issue rather than vanishing from Review & Deploy).
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
    // Placeholder peers don't exist in the API until installed.
    if (r.id.startsWith("draft-")) return !peerMustBeInstalled;
    // Draft resources deploy first and resolve — but only tracked ones.
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

// A policy that can actually be POSTed on deploy: both sides set, no
// uninstalled placeholder peer, referenced draft resources tracked.
export const isDeployablePolicy = (
  policy: Policy,
  // Client ids of draft resources that ARE tracked (complete) — a policy
  // referencing a "new-…" resource is deployable only when the resource
  // itself will be created on deploy.
  trackedResourceClientIds?: Set<string>,
) => policyComplete(policy, trackedResourceClientIds, true);

// A policy complete enough to enter the changeset: both sides set and any
// referenced draft resource tracked. It MAY still reference an uninstalled
// placeholder peer — the policy is listed as an ordinary change; that peer's
// own install-peer issue is what blocks the deploy, so the policy isn't hidden
// for it. A policy still missing a side stays canvas-only (visibly unfinished,
// not listed).
export const isTrackablePolicy = (
  policy: Policy,
  trackedResourceClientIds?: Set<string>,
) => policyComplete(policy, trackedResourceClientIds, false);

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

// ReactFlow requires parent nodes to PRECEDE their children in the nodes
// array. Reparenting callers (frame drop adoption, assign-to-network) build a
// correctly ordered array, but on a controlled flow `instance.setNodes`
// round-trips through applyNodeChanges, which keeps replaced nodes at their
// ORIGINAL index — a resource older than its frame silently stays in front of
// it and renders unparented at frame-relative coordinates. Reconciles the
// invariant: children re-emit right after their parent (stable otherwise).
// Returns the SAME array when nothing is violated (per-change hot path).
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

// Seed grid for a LIVE overview frame — the same grid useNetworkFrameLayout
// reconciles to (2 columns, NETWORK_FRAME_MAX_VISIBLE cap with a "+N more"
// cell taking the last slot, fallback row heights). Seeding with the old
// single-column math made every frame resize and its "+N more" cell shift
// one beat after mount.
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
    // Both modes reserve the bottom Add-Resource band; empty frames mirror
    // the reconciler's empty height.
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

// Canvas nodes subscribed STRUCTURALLY (ids, data refs, parentId and —
// optionally — selection), ignoring positions/measure/drag state: for
// always-mounted consumers (components panel, toolbars) that only derive
// from node data, so node drags don't re-render them every tick. Positions
// must be read imperatively (reactFlow.getNodes()) when needed.
// Focus Mode is only offered where it actually declutters: the node needs a
// BUSY neighborhood — at least 4 incident edges and at least 2 policies
// involved (the node itself counts when it IS a policy). Below that the
// path is readable without dimming anything.
export function isFocusWorthy(
  nodeId: string,
  nodes: { id: string; type?: string }[],
  edges: { source: string; target: string }[],
): boolean {
  // Focus only pays off when there is something to dim AWAY: at least two
  // policies on the canvas (with one, everything is on the one path). The
  // node itself just needs a path to trace — a single edge suffices.
  if (!edges.some((e) => e.source === nodeId || e.target === nodeId)) {
    return false;
  }
  const policyCount = nodes.filter((n) => n.type === "policyNode").length;
  return policyCount >= 2;
}

// Resources a policy actually reaches — directly (destinationResource) or
// through a destination group — sort to the TOP of a network frame, so
// connected resources stay visible above the "+N more" cap. SHARED by the
// live networks overview and the draft build so both frames agree on the
// order. Stable: each half keeps its relative order.
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

// Staggered grid for network frames (draft build + live networks overview):
// cols ≈ √(n·avgCellH/cellW) for a ~1:1 block; each column packs frames by
// their own heights; odd columns start half a typical cell lower so edges
// flow between frames. Mutates the frames' positions in place and centers
// the block vertically on `centerMidY`.
// Grid x-origin right of the policies column — SHARED by the live overview
// and the draft build so the policy → network gap reads identical.
export const FRAME_GRID_BASE_X = 1050;
export const FRAME_GRID_GAP_X = 280;
export const FRAME_GRID_GAP_Y = 200;

// The networks-view source/policy columns position node TOPS, while the
// frame grid centers frames on the column midline — without compensating
// for node height, a lone source peer or policy hangs visibly below its
// frame. Half the typical node heights (peer/group card ≈ 60px, policy
// pill ≈ 34px), SHARED by the live overview and the draft build.
export const SOURCE_NODE_HALF_HEIGHT = 30;
export const POLICY_NODE_HALF_HEIGHT = 17;

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
  // Deterministic order by network NAME — live and draft fill the grid
  // identically regardless of how their builds enumerated the frames.
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
