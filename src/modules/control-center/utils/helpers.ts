import { Node as CanvasNode, useReactFlow } from "@xyflow/react";
import { orderBy } from "lodash";
import { Group } from "@/interfaces/Group";
import { Network } from "@/interfaces/Network";
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
    return peerCount === 0 ? "No Peer(s)" : `${peerCount} Peer(s)`;
  if (peerCount === 0) return `${resourceCount} Resource(s)`;
  return `${peerCount} Peer(s), ${resourceCount} Resource(s)`;
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

// A placeholder peer node (Server / Agent, not installed yet) as a
// pseudo-Peer: unique draft id ("draft-<uuid>", from node id
// "peer-draft-<uuid>") plus its canvas name — lets placeholders participate
// in policies and the policy modal's peer selector before they exist in the
// API.
export const getPlaceholderPeer = (node?: CanvasNode): Peer | undefined => {
  const data = node?.data as
    | { placeholderKind?: string; placeholderName?: string }
    | undefined;
  if (!node || !data?.placeholderKind) return undefined;
  return {
    id: node.id.replace("peer-", ""),
    name:
      data.placeholderName ??
      (data.placeholderKind === "agent" ? "Agent" : "Server"),
    ip: "",
    os: "",
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
  const placeholders = nodes.filter(
    (n) => (n.data as { placeholderKind?: string })?.placeholderKind,
  );
  const taken = new Set<string>();
  let result: string | undefined;
  placeholders.forEach((n) => {
    const base = sanitize(getPlaceholderPeer(n)?.name ?? "") || "peer";
    let candidate = base;
    let suffix = 1;
    while (taken.has(candidate)) candidate = `${base}-${suffix++}`;
    taken.add(candidate);
    if (n.id === nodeId) result = candidate;
  });
  return result;
};
