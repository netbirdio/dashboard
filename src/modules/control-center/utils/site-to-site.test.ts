import { Node } from "@xyflow/react";
import { describe, expect, it } from "vitest";
import { Network, NetworkResource } from "@/interfaces/Network";
import { Policy } from "@/interfaces/Policy";
import {
  buildSiteToSiteDrilled,
  orientSiteToSiteEdges,
  placeSiteToSitePolicies,
  resourceNetworkIndex,
  siteToSiteSourceNetwork,
  widenColumnsForSiteToSite,
} from "@/modules/control-center/utils/site-to-site";

const networks: Network[] = [
  { id: "berlin", name: "Berlin Office", resources: ["lan", "printer"], policies: ["p-in"] },
  { id: "aws", name: "AWS Production", resources: ["vpc", "db"], policies: ["p-out"] },
];
const resources = ["lan", "printer", "vpc", "db"].map(
  (id) => ({ id, name: id, address: "10.0.0.0/24", type: "subnet", enabled: true }) as NetworkResource,
);
const policy = (id: string, source: string, destination: string, name = id) =>
  ({
    id,
    name,
    enabled: true,
    rules: [
      {
        enabled: true,
        bidirectional: false,
        sourceResource: { id: source, type: "subnet" },
        destinationResource: { id: destination, type: "subnet" },
      },
    ],
  }) as unknown as Policy;

describe("siteToSiteSourceNetwork", () => {
  const index = resourceNetworkIndex(networks);

  it("names the source network of a rule coming from another network", () => {
    expect(siteToSiteSourceNetwork(policy("p", "vpc", "lan").rules[0], "berlin", index)).toBe("aws");
  });

  it("ignores peers, groups and rules inside one network", () => {
    const peerRule = { ...policy("p", "vpc", "lan").rules[0], sourceResource: { id: "peer-1", type: "peer" as const } };
    expect(siteToSiteSourceNetwork(peerRule, "berlin", index)).toBeUndefined();
    expect(siteToSiteSourceNetwork(policy("p", "printer", "lan").rules[0], "berlin", index)).toBeUndefined();
  });
});

describe("placeSiteToSitePolicies", () => {
  const frame = (id: string, x: number, y: number): Node => ({
    id: `network-${id}`,
    type: "networkNode",
    position: { x, y },
    style: { width: 300, height: 200 },
    data: {},
  });
  const pill = (id: string, from: string, to: string): Node => ({
    id: `policy-${id}`,
    type: "policyNode",
    position: { x: 0, y: 0 },
    data: { policy: { id, name: id }, siteToSite: { from, to } },
  });

  it("centres the policies of a pair in the gap between their frames", () => {
    const frames = [frame("berlin", 0, 0), frame("aws", 580, 0)];
    const pills = [pill("b", "aws", "berlin"), pill("a", "berlin", "aws")];
    placeSiteToSitePolicies(pills, frames);

    // Gap between 300 and 580 is centred on 440; the pill is 240 wide.
    expect(pills.map((p) => p.position.x)).toEqual([320, 320]);
    // Sorted by name and stacked around the frames' shared middle (100).
    const [a, b] = [...pills].sort((p, q) => p.id.localeCompare(q.id));
    expect(a.position.y).toBeLessThan(b.position.y);
    expect((a.position.y + b.position.y) / 2 + 20).toBe(100);
  });

  it("uses the vertical gap for stacked frames", () => {
    const frames = [frame("berlin", 0, 0), frame("aws", 0, 400)];
    const pills = [pill("a", "berlin", "aws")];
    placeSiteToSitePolicies(pills, frames);
    expect(pills[0].position).toEqual({ x: 30, y: 280 });
  });
});

describe("widenColumnsForSiteToSite", () => {
  const frame = (id: string, x: number, width: number): Node => ({
    id: `network-${id}`,
    type: "networkNode",
    position: { x, y: 0 },
    style: { width, height: 200 },
    data: {},
  });
  const pill = (from: string, to: string): Node => ({
    id: `policy-${from}-${to}`,
    type: "policyNode",
    position: { x: 0, y: 0 },
    data: { policy: { name: "p" }, siteToSite: { from, to } },
  });

  it("widens every column boundary when a pill would not fit", () => {
    // A 450 wide frame in a 580 pitch grid leaves only 130 between columns.
    const frames = [frame("a", 0, 450), frame("b", 580, 300), frame("c", 1160, 300)];
    widenColumnsForSiteToSite([pill("a", "b")], frames);
    expect(frames.map((f) => f.position.x)).toEqual([0, 770, 1540]);
  });

  it("leaves the grid alone when the gap is wide enough", () => {
    const frames = [frame("a", 0, 300), frame("b", 700, 300)];
    widenColumnsForSiteToSite([pill("a", "b")], frames);
    expect(frames.map((f) => f.position.x)).toEqual([0, 700]);
  });
});

describe("orientSiteToSiteEdges", () => {
  const frames: Node[] = [
    { id: "network-left", type: "networkNode", position: { x: 0, y: 0 }, style: { width: 300 }, data: {} },
    { id: "network-right", type: "networkNode", position: { x: 700, y: 0 }, style: { width: 300 }, data: {} },
  ];
  const pill = (bidirectional: boolean): Node => ({
    id: "policy-p",
    type: "policyNode",
    position: { x: 0, y: 0 },
    data: {
      policy: { rules: [{ bidirectional }] },
      siteToSite: { from: "right", to: "left" },
    },
  });
  const edges = [
    { id: "in", source: "network-right", target: "policy-p" },
    { id: "out", source: "policy-p", target: "network-left" },
  ];

  it("draws a both-ways policy from its left frame to its right one", () => {
    const oriented = orientSiteToSiteEdges(edges, [pill(true)], frames);
    expect(oriented.map((e) => `${e.source}>${e.target}`)).toEqual([
      "network-left>policy-p",
      "policy-p>network-right",
    ]);
  });

  it("keeps a one-way policy pointing the way traffic goes", () => {
    expect(orientSiteToSiteEdges(edges, [pill(false)], frames)).toBe(edges);
  });
});

describe("buildSiteToSiteDrilled", () => {
  const laidOut: Node[] = [
    { id: "policy-p-in", type: "policyNode", position: { x: 500, y: 0 }, data: {} },
    { id: "resource-lan", type: "resourceNode", position: { x: 1400, y: -40 }, data: {} },
    { id: "resource-printer", type: "resourceNode", position: { x: 1400, y: 55 }, data: {} },
  ];
  const policies = [policy("p-in", "vpc", "lan"), policy("p-out", "printer", "db")];

  it("adds inbound sources on the left and outbound policies on the right", () => {
    const { nodes, edges } = buildSiteToSiteDrilled({
      network: networks[0],
      networks,
      networkResources: resources,
      policies,
      laidOut,
    });

    const vpc = nodes.find((n) => n.id === "resource-vpc");
    expect(vpc?.position).toEqual({ x: 0, y: 0 });
    expect(vpc?.data).toMatchObject({ draftNetwork: { networkId: "aws" }, siteToSiteRemote: true });

    const outbound = nodes.find((n) => n.id === "policy-p-out");
    expect(outbound?.position).toEqual({ x: 1820, y: 55 });
    expect(nodes.find((n) => n.id === "resource-db")?.position).toEqual({ x: 2240, y: 55 });

    expect(edges.map((e) => `${e.source}>${e.target}`)).toEqual([
      "resource-vpc>policy-p-in",
      "resource-printer>policy-p-out",
      "policy-p-out>resource-db",
    ]);
  });
});
