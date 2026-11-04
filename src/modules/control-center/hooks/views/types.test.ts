import { Edge, Node } from "@xyflow/react";
import { describe, expect, it } from "vitest";
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
