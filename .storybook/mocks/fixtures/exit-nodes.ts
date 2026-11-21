import type { ExitNode } from "@/interfaces/ExitNode";
import type { Group } from "@/interfaces/Group";
import type { Policy, PolicyRule } from "@/interfaces/Policy";
import { groups as coreGroups } from "./core-data";
import { GROUP, PEER } from "./ids";
import type { Handler, HandlerContext } from "./index";
import { policies } from "./network";

/* Exit nodes as the future /exit-nodes API returns them. The peers are the
   core fixture peers: EU Egress exits in Frankfurt and Amsterdam with a
   disabled Berlin peer, US Egress in New York, and Contractors Egress is
   switched off. */
export const EXIT_NODE = {
  eu: "exit-node-eu",
  us: "exit-node-us",
  contractors: "exit-node-contractors",
} as const;

export const exitNodes: ExitNode[] = [
  {
    id: EXIT_NODE.eu,
    name: "EU Egress",
    description: "Internet egress for EU teams",
    enabled: true,
    auto_apply: true,
    peers: [
      { peer_id: PEER.webServer, metric: 100, enabled: true },
      { peer_id: PEER.linuxLaptop, metric: 200, enabled: true },
      { peer_id: PEER.routerBerlin, metric: 300, enabled: false },
    ],
  },
  {
    id: EXIT_NODE.us,
    name: "US Egress",
    description: "Opt-in egress for the sales team",
    enabled: true,
    auto_apply: false,
    peers: [
      { peer_id: PEER.routerNewYork, metric: 100, enabled: true },
      { peer_id: PEER.iphone, metric: 200, enabled: true },
    ],
  },
  {
    id: EXIT_NODE.contractors,
    name: "Contractors Egress",
    description: "Fixed public IP for vendor portals",
    enabled: false,
    auto_apply: true,
    peers: [{ peer_id: PEER.k8sNode, metric: 100, enabled: true }],
  },
];

const group = (id: string): Group => {
  const { name, peers_count, resources_count } = coreGroups.find(
    (g) => g.id === id,
  )!;
  return { id, name, peers_count, resources_count };
};

const exitNodePolicy = (
  id: string,
  name: string,
  description: string,
  exitNodeId: string,
  sources: string[],
  rule: Partial<PolicyRule> = {},
): Policy => ({
  id,
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
      protocol: "all",
      ports: [],
      sources: sources.map(group),
      destinations: null,
      destinationResource: { id: exitNodeId, type: "exit_node" },
      ...rule,
    },
  ],
});

/* Policies whose destination is an exit node; Contractors Egress has none. */
export const exitNodePolicies: Policy[] = [
  exitNodePolicy(
    "pol-exit-eu",
    "EU Egress Access",
    "Engineering and remote staff",
    EXIT_NODE.eu,
    [GROUP.developers, GROUP.devops],
  ),
  exitNodePolicy(
    "pol-exit-eu-web",
    "Sales EU Web",
    "",
    EXIT_NODE.eu,
    [GROUP.officeBerlin],
    { protocol: "tcp", ports: ["80", "443"] },
  ),
  exitNodePolicy("pol-exit-us", "US Egress Access", "", EXIT_NODE.us, [
    GROUP.officeNewYork,
  ]),
];

const allPolicies = [...policies, ...exitNodePolicies];

const byId =
  <T extends { id?: string }>(items: T[]) =>
  ({ path }: HandlerContext) =>
    items.find((item) => item.id === path.split("/").pop()) ?? {};

export const exitNodeFixtures: Record<string, Handler> = {
  "GET /exit-nodes": exitNodes,
  "GET /exit-nodes/:id": byId(exitNodes),
  // The account's policies include the ones that target an exit node.
  "GET /policies": allPolicies,
  "GET /policies/:id": byId(allPolicies),
};
