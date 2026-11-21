import {
  EXIT_NODE_DEFAULT_METRIC,
  EXIT_NODE_MAX_METRIC,
  EXIT_NODE_METRIC_STEP,
  EXIT_NODE_MIN_METRIC,
  EXIT_NODE_NAME_MAX_LENGTH,
  ExitNode,
  ExitNodePeer,
  ExitNodeRequest,
} from "@/interfaces/ExitNode";
import { Group } from "@/interfaces/Group";
import { Peer } from "@/interfaces/Peer";
import { Policy, PolicyRule } from "@/interfaces/Policy";

export const EXIT_NODES_DOCS_URL =
  "https://docs.netbird.io/how-to/configuring-default-routes-for-internet-traffic";

/** The node's peers, preferred (lowest metric) first. */
export const sortPeersByMetric = (peers: ExitNodePeer[] = []) =>
  [...peers].sort((a, b) => a.metric - b.metric);

/**
 * High availability needs more than one enabled peer. The badge shows the
 * enabled peers only; a node without any shows no badge.
 */
export const getHighAvailability = (node: Pick<ExitNode, "peers">) => {
  const activePeerCount = (node.peers ?? []).filter((p) => p.enabled).length;
  return {
    activePeerCount,
    hasActivePeers: activePeerCount > 0,
    isHighlyAvailable: activePeerCount > 1,
  };
};

/** The enabled peer with the lowest metric, else the lowest metric overall. */
export const getPrimaryPeer = (
  node: Pick<ExitNode, "peers">,
): ExitNodePeer | undefined => {
  const sorted = sortPeersByMetric(node.peers);
  return sorted.find((p) => p.enabled) ?? sorted[0];
};

export type ExitNodeLocation = {
  country_code: string;
  city_name: string;
  // Shown when traffic can exit in more than one country.
  primary: boolean;
};

/**
 * Where traffic exits: the countries and cities of the enabled peers,
 * ordered by metric so the primary comes first. Falls back to all peers when
 * none is enabled, so a paused node still shows where it would exit.
 */
export const getExitNodeLocations = (
  node: Pick<ExitNode, "peers">,
  peers: Pick<Peer, "id" | "country_code" | "city_name">[] = [],
): { countries: string[]; locations: ExitNodeLocation[] } => {
  const sorted = sortPeersByMetric(node.peers);
  const enabled = sorted.filter((p) => p.enabled);
  const source = enabled.length > 0 ? enabled : sorted;

  const rows: Omit<ExitNodeLocation, "primary">[] = [];
  source.forEach((entry) => {
    const peer = peers.find((p) => p.id === entry.peer_id);
    const country_code = peer?.country_code?.toUpperCase();
    if (!country_code) return;
    const city_name = peer?.city_name ?? "";
    const exists = rows.some(
      (r) => r.country_code === country_code && r.city_name === city_name,
    );
    if (!exists) rows.push({ country_code, city_name });
  });

  const countries: string[] = [];
  rows.forEach((r) => {
    if (!countries.includes(r.country_code)) countries.push(r.country_code);
  });

  return {
    countries,
    locations: rows.map((r, i) => ({
      ...r,
      primary: countries.length > 1 && i === 0,
    })),
  };
};

const ruleTargetsExitNode = (rule?: PolicyRule, exitNodeId?: string) =>
  rule?.destinationResource?.type === "exit_node" &&
  (exitNodeId === undefined || rule.destinationResource.id === exitNodeId);

/** The policy's destination is an exit node (any, or the given one). */
export const isExitNodePolicy = (
  policy?: Pick<Policy, "rules">,
  exitNodeId?: string,
) => !!policy?.rules?.some((rule) => ruleTargetsExitNode(rule, exitNodeId));

/** The policies whose destination is this exit node. */
export const getExitNodePolicies = (
  exitNodeId: string | undefined,
  policies: Policy[] = [],
) =>
  exitNodeId
    ? policies.filter((policy) => isExitNodePolicy(policy, exitNodeId))
    : [];

/** Metric for a peer added next: after the last one, or the default. */
export const getNextMetric = (peers: Pick<ExitNodePeer, "metric">[] = []) => {
  if (peers.length === 0) return EXIT_NODE_DEFAULT_METRIC;
  const max = Math.max(...peers.map((p) => Number(p.metric) || 0));
  return Math.min(EXIT_NODE_MAX_METRIC, max + EXIT_NODE_METRIC_STEP);
};

export const isValidMetric = (metric: number | string) => {
  const value = String(metric).trim();
  if (!/^\d+$/.test(value)) return false;
  const n = Number(value);
  return n >= EXIT_NODE_MIN_METRIC && n <= EXIT_NODE_MAX_METRIC;
};

/** The name's error message, or "" when it is fine (or still empty). */
export const getExitNodeNameError = (
  name: string,
  exitNodes: Pick<ExitNode, "id" | "name">[] = [],
  currentId?: string,
) => {
  const trimmed = name.trim();
  if (trimmed.length > EXIT_NODE_NAME_MAX_LENGTH)
    return `Name must be at most ${EXIT_NODE_NAME_MAX_LENGTH} characters`;
  const lower = trimmed.toLowerCase();
  if (
    trimmed &&
    exitNodes.some((n) => n.id !== currentId && n.name.toLowerCase() === lower)
  )
    return "An exit node with this name already exists";
  return "";
};

/** Peers are valid when there is at least one, one is enabled and every metric is in range. */
export const arePeersValid = (
  peers: { peer_id: string; metric: number | string; enabled: boolean }[],
) =>
  peers.length > 0 &&
  peers.some((p) => p.enabled) &&
  peers.every((p) => isValidMetric(p.metric));

/** Peer ids used by other exit nodes than `currentId`, mapped to that node's name. */
export const getPeersUsedByOtherExitNodes = (
  exitNodes: ExitNode[] = [],
  currentId?: string,
) => {
  const used = new Map<string, string>();
  exitNodes.forEach((node) => {
    if (node.id === currentId) return;
    node.peers.forEach((p) => used.set(p.peer_id, node.name));
  });
  return used;
};

/**
 * Text the table search matches: name, description, the peers' names and
 * the source groups of the node's policies.
 */
export const getExitNodeSearchText = (
  node: ExitNode,
  peers: Pick<Peer, "id" | "name">[] = [],
  policies: Policy[] = [],
) => {
  const peerNames = node.peers.map(
    (p) => peers.find((peer) => peer.id === p.peer_id)?.name ?? "",
  );
  const sourceGroups = getExitNodePolicies(node.id, policies).flatMap(
    (policy) =>
      (policy.rules?.[0]?.sources ?? []).map((s) =>
        typeof s === "string" ? "" : (s as Group).name,
      ),
  );
  return [node.name, node.description, ...peerNames, ...sourceGroups]
    .filter(Boolean)
    .join(" ");
};
