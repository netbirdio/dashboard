import { useReactFlow } from "@xyflow/react";
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
