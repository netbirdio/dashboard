import { Edge, Node } from "@xyflow/react";
import { Network, NetworkResource } from "@/interfaces/Network";
import { Policy, PolicyRule } from "@/interfaces/Policy";

/**
 * A site-to-site policy names a network resource on both sides. On the
 * canvas it runs from the source network to the destination network, so it
 * is drawn between their frames instead of in the policy column.
 */
export type SiteToSiteEnds = { from: string; to: string };

// Measured sizes are not known when the view is built; these match the pill.
const PILL_WIDTH = 240;
const PILL_HEIGHT = 40;
const PILL_PITCH = 64;
const FALLBACK_FRAME_HEIGHT = 300;

// Columns to the right of the drilled network's own resources (x 1400).
const OUTBOUND_POLICY_GAP = 420;
const OUTBOUND_RESOURCE_GAP = 840;
const REMOTE_SOURCE_PITCH = 120;

/** Maps every network resource id to the network that lists it. */
export const resourceNetworkIndex = (networks?: Network[]) => {
  const index = new Map<string, string>();
  networks?.forEach((n) => n.resources?.forEach((id) => index.set(id, n.id)));
  return index;
};

const isNetworkResourceRef = (ref?: { id?: string; type?: string }) =>
  !!ref?.id && ref.type !== "peer";

/**
 * The network a rule's source resource belongs to, when the rule is
 * site-to-site into `networkId`; undefined otherwise.
 */
export const siteToSiteSourceNetwork = (
  rule: PolicyRule,
  networkId: string,
  networkOf: Map<string, string>,
) => {
  if (!isNetworkResourceRef(rule.sourceResource)) return undefined;
  const source = networkOf.get(rule.sourceResource!.id);
  return source && source !== networkId ? source : undefined;
};

export const isSiteToSitePolicyNode = (n: Node) =>
  n.type === "policyNode" &&
  !!(n.data as { siteToSite?: SiteToSiteEnds })?.siteToSite;

type Rect = { x: number; y: number; w: number; h: number };

const frameRect = (frames: Node[], networkId: string): Rect | undefined => {
  const f = frames.find((n) => n.id === `network-${networkId}`);
  if (!f) return undefined;
  return {
    x: f.position.x,
    y: f.position.y,
    w: Number(f.style?.width) || 300,
    h: Number(f.style?.height) || FALLBACK_FRAME_HEIGHT,
  };
};

// The middle of the gap between two spans, or of their centres when they
// overlap.
const between = (a0: number, a1: number, b0: number, b1: number) => {
  if (a1 <= b0) return (a1 + b0) / 2;
  if (b1 <= a0) return (b1 + a0) / 2;
  return (a0 + a1 + b0 + b1) / 4;
};

const policyName = (n: Node) =>
  ((n.data as { policy?: Policy })?.policy?.name ?? "").toLowerCase();

// Room a pill needs between two frames side by side.
const PILL_GAP = PILL_WIDTH + 80;

/**
 * Frames can be wider than the grid's cell, which leaves less than a pill's
 * width between columns. Where a site-to-site policy joins frames in
 * different columns, every column boundary is widened by the same amount so
 * the grid stays regular. Mutates in place.
 */
export function widenColumnsForSiteToSite(pills: Node[], frames: Node[]) {
  let extra = 0;
  pills.forEach((pill) => {
    const ends = (pill.data as { siteToSite: SiteToSiteEnds }).siteToSite;
    const a = frameRect(frames, ends.from);
    const b = frameRect(frames, ends.to);
    if (!a || !b) return;
    const [left, right] = a.x <= b.x ? [a, b] : [b, a];
    if (left.x + left.w > right.x) return;
    extra = Math.max(extra, PILL_GAP - (right.x - (left.x + left.w)));
  });
  if (extra <= 0) return;
  const columns = [...new Set(frames.map((f) => f.position.x))].sort(
    (x, y) => x - y,
  );
  frames.forEach((f) => {
    const col = columns.indexOf(f.position.x);
    f.position = { x: f.position.x + col * extra, y: f.position.y };
  });
}

/**
 * Policies have fixed sides on the canvas: traffic enters on the left and
 * leaves on the right. A policy that goes both ways reads the same either
 * way round, so it is drawn from its left frame to its right one, which
 * keeps its lines from looping around the pill.
 */
export function orientSiteToSiteEdges(
  edges: Edge[],
  pills: Node[],
  frames: Node[],
): Edge[] {
  const flip = new Map<string, SiteToSiteEnds>();
  pills.forEach((pill) => {
    const data = pill.data as { siteToSite: SiteToSiteEnds; policy?: Policy };
    if (!data.policy?.rules?.[0]?.bidirectional) return;
    const a = frameRect(frames, data.siteToSite.from);
    const b = frameRect(frames, data.siteToSite.to);
    if (a && b && a.x > b.x) flip.set(pill.id, data.siteToSite);
  });
  if (flip.size === 0) return edges;
  return edges.map((e) => {
    const into = flip.get(e.target);
    if (into && e.source === `network-${into.from}`)
      return { ...e, source: `network-${into.to}` };
    const outOf = flip.get(e.source);
    if (outOf && e.target === `network-${outOf.to}`)
      return { ...e, target: `network-${outOf.from}` };
    return e;
  });
}

/**
 * Puts each site-to-site policy in the gap between the two frames it joins,
 * stacking the policies of one pair of networks. Mutates in place, after the
 * frames have their positions.
 */
export function placeSiteToSitePolicies(pills: Node[], frames: Node[]) {
  const byPair = new Map<string, Node[]>();
  pills.forEach((pill) => {
    const ends = (pill.data as { siteToSite: SiteToSiteEnds }).siteToSite;
    const key = [ends.from, ends.to].sort().join(":");
    byPair.set(key, [...(byPair.get(key) ?? []), pill]);
  });

  byPair.forEach((group) => {
    const ends = (group[0].data as { siteToSite: SiteToSiteEnds }).siteToSite;
    const a = frameRect(frames, ends.from);
    const b = frameRect(frames, ends.to);
    if (!a || !b) return;
    const cx = between(a.x, a.x + a.w, b.x, b.x + b.w);
    const cy = between(a.y, a.y + a.h, b.y, b.y + b.h);
    const sorted = [...group].sort((p, q) =>
      policyName(p).localeCompare(policyName(q)),
    );
    sorted.forEach((pill, i) => {
      pill.position = {
        x: cx - PILL_WIDTH / 2,
        y:
          cy -
          ((sorted.length - 1) * PILL_PITCH) / 2 +
          i * PILL_PITCH -
          PILL_HEIGHT / 2,
      };
    });
  });
}

const remoteResourceNode = (
  resource: NetworkResource,
  network: Network,
  position: { x: number; y: number },
  enabled: boolean,
): Node => ({
  id: `resource-${resource.id}`,
  type: "resourceNode",
  position,
  data: {
    resource,
    enabled,
    // Not `drilled`: the card names its own network, which is not the one
    // the header shows.
    draftNetwork: { networkId: network.id, name: network.name },
    siteToSiteRemote: true,
  },
});

const edge = (source: string, target: string, policy: Policy): Edge => ({
  id: `${source}-${target}`,
  source,
  target,
  type: "smart",
  data: { enabled: policy.rules?.[0]?.enabled ?? policy.enabled, policy },
});

type DrilledInput = {
  network: Network;
  networks: Network[];
  networkResources: NetworkResource[];
  policies: Policy[];
  // The drilled layout's nodes, already positioned.
  laidOut: Node[];
};

/**
 * The other networks' resources a drilled network exchanges traffic with:
 * sources of its inbound site-to-site policies join the source column, and
 * its outbound policies run from its own resources to the right.
 */
export function buildSiteToSiteDrilled({
  network,
  networks,
  networkResources,
  policies,
  laidOut,
}: DrilledInput): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const networkOf = resourceNetworkIndex(networks);
  const own = new Set(network.resources ?? []);
  const placed = new Set(laidOut.map((n) => n.id));
  const resourceById = (id?: string) =>
    networkResources.find((r) => r.id === id);
  const networkById = (id?: string) => networks.find((n) => n.id === id);

  // Inbound: below whatever already fills the source column.
  const sourceColumn = laidOut.filter(
    (n) =>
      (n.type === "groupNode" || n.type === "peerNode") && n.position.x <= 0,
  );
  let nextSourceY = sourceColumn.length
    ? Math.max(...sourceColumn.map((n) => n.position.y)) + REMOTE_SOURCE_PITCH
    : 0;
  (network.policies ?? []).forEach((policyId) => {
    const policy = policies.find((p) => p.id === policyId);
    const rule = policy?.rules?.[0];
    if (!policy || !rule) return;
    const fromId = siteToSiteSourceNetwork(rule, network.id, networkOf);
    const resource = resourceById(rule.sourceResource?.id);
    const from = networkById(fromId);
    if (!fromId || !resource || !from) return;
    const id = `resource-${resource.id}`;
    if (!placed.has(id)) {
      nodes.push(
        remoteResourceNode(resource, from, { x: 0, y: nextSourceY }, true),
      );
      placed.add(id);
      nextSourceY += REMOTE_SOURCE_PITCH;
    }
    edges.push(edge(id, `policy-${policy.id}`, policy));
  });

  // Outbound: own resource -> policy -> the other network's resource.
  const ownNodes = laidOut.filter(
    (n) => n.type === "resourceNode" && own.has(n.id.replace(/^resource-/, "")),
  );
  const ownX = ownNodes[0]?.position.x ?? 1400;
  const stackAt = new Map<string, number>();
  policies.forEach((policy) => {
    const rule = policy.rules?.[0];
    if (!rule || !own.has(rule.sourceResource?.id ?? "")) return;
    if (!isNetworkResourceRef(rule.destinationResource)) return;
    const toId = networkOf.get(rule.destinationResource!.id);
    const to = networkById(toId);
    const target = resourceById(rule.destinationResource!.id);
    if (!toId || toId === network.id || !to || !target) return;

    const sourceNodeId = `resource-${rule.sourceResource!.id}`;
    const sourceNode = ownNodes.find((n) => n.id === sourceNodeId);
    if (!sourceNode) return;
    const offset = stackAt.get(sourceNodeId) ?? 0;
    stackAt.set(sourceNodeId, offset + PILL_PITCH);
    const y = sourceNode.position.y + offset;

    const policyNodeId = `policy-${policy.id}`;
    if (!placed.has(policyNodeId)) {
      nodes.push({
        id: policyNodeId,
        type: "policyNode",
        position: { x: ownX + OUTBOUND_POLICY_GAP, y },
        data: {
          policy,
          enabled: rule.enabled,
          siteToSite: { from: network.id, to: toId },
        },
      });
      placed.add(policyNodeId);
    }
    const targetId = `resource-${target.id}`;
    if (!placed.has(targetId)) {
      nodes.push(
        remoteResourceNode(
          target,
          to,
          { x: ownX + OUTBOUND_RESOURCE_GAP, y },
          !!rule.enabled,
        ),
      );
      placed.add(targetId);
    }
    edges.push(edge(sourceNodeId, policyNodeId, policy));
    edges.push(edge(policyNodeId, targetId, policy));
  });

  return { nodes, edges };
}
