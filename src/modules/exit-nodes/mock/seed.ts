import { ExitNode } from "@/interfaces/ExitNode";
import { Group } from "@/interfaces/Group";
import { Peer } from "@/interfaces/Peer";
import { Policy, Protocol } from "@/interfaces/Policy";

type SeedPeer = Pick<Peer, "id" | "name" | "os" | "country_code" | "city_name">;
type SeedGroup = Pick<Group, "id" | "name">;

type Want = { country: string; city?: string; enabled?: boolean };

/** The exit nodes the mock starts with, by where their peers should be. */
const SEED_NODES: (Omit<ExitNode, "id" | "peers"> & { wants: Want[] })[] = [
  {
    name: "EU Egress",
    description: "Internet egress for EU teams",
    enabled: true,
    auto_apply: true,
    wants: [
      { country: "DE", city: "Frankfurt" },
      { country: "NL", city: "Amsterdam" },
    ],
  },
  {
    name: "US Egress",
    description: "Opt-in egress for the sales team",
    enabled: true,
    auto_apply: false,
    wants: [
      { country: "US", city: "Ashburn" },
      { country: "US", city: "New York" },
    ],
  },
  {
    name: "Contractors Egress",
    description: "Fixed public IP for vendor portals",
    enabled: false,
    auto_apply: true,
    wants: [{ country: "US", city: "New York" }],
  },
];

// Phones make poor exit nodes; they are only used when nothing else is left.
const isMobile = (peer: SeedPeer) => /android|ios|iphone|ipad/i.test(peer.os);

/**
 * Picks a free peer for a wanted location: same city, then same country,
 * then any peer, preferring non-mobile peers in the account's own order.
 * Real accounts rarely have peers in exactly these cities, so the fallbacks
 * keep the seed useful against any management server.
 */
const pickPeer = (peers: SeedPeer[], used: Set<string>, want: Want) => {
  const free = peers.filter((p) => !!p.id && !used.has(p.id));
  const ranked = [
    ...free.filter((p) => !isMobile(p)),
    ...free.filter((p) => isMobile(p)),
  ];
  const sameCountry = (p: SeedPeer) =>
    p.country_code?.toUpperCase() === want.country;
  const sameCity = (p: SeedPeer) =>
    !!want.city &&
    sameCountry(p) &&
    !!p.city_name?.toLowerCase().includes(want.city.toLowerCase());
  return (
    ranked.find(sameCity) ?? ranked.find(sameCountry) ?? ranked[0] ?? undefined
  );
};

const policy = (
  name: string,
  description: string,
  exitNodeId: string,
  sources: string[],
  protocol: Protocol = "all",
  ports: string[] = [],
): Policy => ({
  name,
  description,
  enabled: true,
  source_posture_checks: [],
  rules: [
    {
      name,
      description,
      enabled: true,
      action: "accept",
      bidirectional: false,
      protocol,
      ports,
      sources,
      destinations: null,
      destinationResource: { id: exitNodeId, type: "exit_node" },
    },
  ],
});

/**
 * Seed data for the mock: "EU Egress" (two peers, high availability),
 * "US Egress" (auto apply off) and a disabled "Contractors Egress", built on
 * the account's real peers and groups so the dashboard can show them.
 */
export const buildExitNodesSeed = (
  peers: SeedPeer[] = [],
  groups: SeedGroup[] = [],
): { exitNodes: ExitNode[]; policies: Policy[] } => {
  const used = new Set<string>();
  const exitNodes: ExitNode[] = SEED_NODES.map(({ wants, ...node }, i) => {
    const picked = wants
      .map((want) => {
        const peer = pickPeer(peers, used, want);
        if (peer?.id) used.add(peer.id);
        return peer;
      })
      .filter((p): p is SeedPeer => !!p);
    return {
      ...node,
      id: `exit-node-seed-${i + 1}`,
      peers: picked.map((p, index) => ({
        peer_id: p.id as string,
        metric: (index + 1) * 100,
        enabled: true,
      })),
    };
  });

  // Groups differ per account: use the named ones first, "All" last.
  const named = groups
    .filter((g) => !!g.id && g.name !== "All")
    .sort((a, b) => a.name.localeCompare(b.name));
  const all = groups.find((g) => g.name === "All");
  const pick = (index: number) =>
    (named.length ? named[index % named.length] : all)?.id;

  const [eu, us] = exitNodes;
  const policies: Policy[] = [];
  const euSources = [pick(0), pick(1)].filter(
    (id, i, list): id is string => !!id && list.indexOf(id) === i,
  );
  if (euSources.length)
    policies.push(
      policy(
        "EU Egress Access",
        "Engineering and remote staff",
        eu.id,
        euSources,
      ),
    );
  const webSource = pick(1);
  if (webSource)
    policies.push(
      policy("Sales EU Web", "", eu.id, [webSource], "tcp", ["80", "443"]),
    );
  const usSource = pick(1);
  if (usSource)
    policies.push(policy("US Egress Access", "", us.id, [usSource]));

  return { exitNodes, policies };
};
