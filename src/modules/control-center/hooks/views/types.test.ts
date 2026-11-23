import { Edge, Node } from "@xyflow/react";
import { describe, expect, it } from "vitest";
import { ExitNode } from "@/interfaces/ExitNode";
import { Policy } from "@/interfaces/Policy";
import { addDestinationResourceNodes } from "@/modules/control-center/hooks/views/types";

// useFetchApi resolves a failed /peers request to `data: undefined`, and the
// view builders pass that straight through. A peer-typed destinationResource
// must then degrade to "no node" instead of crashing the view-init effect.

const policyWithPeerDestination = (): Policy =>
  ({
    id: "p1",
    name: "Policy",
    enabled: true,
    rules: [
      {
        id: "r1",
        name: "Policy",
        enabled: true,
        sources: [],
        destinations: [],
        destinationResource: { id: "peer-id-1", type: "peer" },
        bidirectional: true,
        protocol: "all",
        action: "accept",
      },
    ],
  }) as unknown as Policy;

describe("addDestinationResourceNodes", () => {
  it("tolerates an undefined peers list without throwing", () => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    expect(() =>
      addDestinationResourceNodes(
        policyWithPeerDestination(),
        nodes,
        edges,
        undefined,
        [],
      ),
    ).not.toThrow();
    expect(nodes).toHaveLength(0);
  });

  it("still resolves the peer when the list is present", () => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    addDestinationResourceNodes(
      policyWithPeerDestination(),
      nodes,
      edges,
      [{ id: "peer-id-1", name: "Peer" } as never],
      [],
    );
    expect(nodes).toHaveLength(1);
    expect(nodes[0].type).toBe("destinationResourceNode");
  });
});

const exitNodePolicy = (id: string, exitNodeId: string): Policy =>
  ({
    ...policyWithPeerDestination(),
    id,
    rules: [
      {
        ...policyWithPeerDestination().rules[0],
        destinations: null,
        destinationResource: { id: exitNodeId, type: "exit_node" },
      },
    ],
  }) as unknown as Policy;

const euEgress: ExitNode = {
  id: "en1",
  name: "EU Egress",
  description: "",
  enabled: true,
  auto_apply: true,
  peers: [
    { peer_id: "ams", metric: 200, enabled: true },
    { peer_id: "fra", metric: 100, enabled: true },
    { peer_id: "ber", metric: 300, enabled: false },
  ],
};

const geoPeers = [
  { id: "fra", name: "fra", country_code: "DE", city_name: "Frankfurt" },
  { id: "ams", name: "ams", country_code: "NL", city_name: "Amsterdam" },
  { id: "ber", name: "ber", country_code: "DE", city_name: "Berlin" },
] as never;

describe("addDestinationResourceNodes with an exit node destination", () => {
  it("adds the exit node card with its locations and an edge to it", () => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    addDestinationResourceNodes(
      exitNodePolicy("p1", "en1"),
      nodes,
      edges,
      geoPeers,
      [],
      [],
      [euEgress],
    );
    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toMatchObject({
      id: "exit-node-en1",
      type: "exitNodeNode",
      data: {
        id: "en1",
        name: "EU Egress",
        enabled: true,
        countries: ["DE", "NL"],
        peerCount: 3,
        activePeerCount: 2,
      },
    });
    expect(edges).toEqual([
      expect.objectContaining({
        source: "policy-p1",
        target: "exit-node-en1",
      }),
    ]);
  });

  it("adds a placeholder for an unknown exit node, so the edge has a target", () => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    addDestinationResourceNodes(
      exitNodePolicy("p1", "gone"),
      nodes,
      edges,
      geoPeers,
      [],
      [],
      undefined,
    );
    expect(nodes[0]).toMatchObject({
      id: "exit-node-gone",
      data: { missing: true },
    });
    expect(edges[0].target).toBe(nodes[0].id);
  });

  it("draws one card for several policies, each with its own edge", () => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    for (const id of ["p1", "p2"])
      addDestinationResourceNodes(
        exitNodePolicy(id, "en1"),
        nodes,
        edges,
        geoPeers,
        [],
        [],
        [euEgress],
      );
    expect(nodes).toHaveLength(1);
    expect(edges.map((e) => e.source)).toEqual(["policy-p1", "policy-p2"]);
  });
});
