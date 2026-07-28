import { describe, expect, it } from "vitest";
import { buildHistoryGraph } from "@/modules/control-center/netcode/buildHistoryGraph";
import { NetCodeAccountSpec } from "@/interfaces/NetCode";

const SPEC: NetCodeAccountSpec = {
  peers: [{ id: "peer-1", name: "laptop", ip: "100.64.0.1" }],
  groups: [
    { id: "grp-web", name: "Web", peers: ["peer-1"], resources: [] },
    { id: "grp-db", name: "DB", peers: [], resources: [] },
    { id: "grp-all", name: "All", peers: ["peer-1"], resources: [] },
  ],
  networks: [{ id: "net-1", name: "prod" }],
  networkResources: [
    {
      id: "res-1",
      networkId: "net-1",
      name: "db-host",
      address: "10.0.0.5/32",
      type: "host",
      enabled: true,
    },
  ],
  policies: [
    {
      id: "pol-1",
      name: "Web to DB",
      enabled: true,
      rules: [
        {
          id: "rule-1",
          name: "Web to DB",
          enabled: true,
          action: "accept",
          protocol: "tcp",
          ports: ["5432"],
          sources: ["grp-web"],
          destinations: ["grp-db"],
          bidirectional: false,
        },
      ],
    },
    {
      id: "pol-2",
      name: "All to resource",
      enabled: false,
      rules: [
        {
          id: "rule-2",
          name: "All to resource",
          enabled: false,
          action: "accept",
          protocol: "all",
          sources: ["grp-all"],
          destinationResource: { type: "host", address: "res-1" },
          bidirectional: false,
        },
      ],
    },
  ],
};

describe("buildHistoryGraph", () => {
  it("renders a policy with its source and destination groups", () => {
    const { nodes, edges } = buildHistoryGraph(SPEC);
    const ids = nodes.map((n) => n.id);
    expect(ids).toContain("policy-pol-1");
    expect(ids).toContain("group-grp-web");
    expect(ids).toContain("group-grp-db");

    const types = new Map(nodes.map((n) => [n.id, n.type]));
    expect(types.get("policy-pol-1")).toBe("policyNode");
    expect(types.get("group-grp-web")).toBe("groupNode");
    expect(types.get("group-grp-db")).toBe("destinationGroupNode");

    expect(edges.map((e) => e.id)).toContain("group-grp-web-policy-pol-1");
    expect(edges.map((e) => e.id)).toContain("policy-pol-1-group-grp-db");
    expect(edges.every((e) => e.type === "smart")).toBe(true);
  });

  it("renders a destination network resource with its network label", () => {
    const { nodes } = buildHistoryGraph(SPEC);
    const resource = nodes.find((n) => n.id === "resource-res-1");
    expect(resource?.type).toBe("resourceNode");
    expect((resource?.data as any).standalone).toBe(true);
    expect((resource?.data as any).draftNetwork).toEqual({
      networkId: "net-1",
      name: "prod",
    });
  });

  it("never enables connect handles and always sets enabled explicitly", () => {
    const { nodes } = buildHistoryGraph(SPEC);
    for (const node of nodes) {
      const data = node.data as { showHandles?: boolean; enabled?: unknown };
      expect(data.showHandles ?? false).toBe(false);
      expect(data.enabled).toBeDefined();
    }
  });

  it("carries the rule protocol so the policy label cannot crash", () => {
    const { nodes } = buildHistoryGraph({
      ...SPEC,
      policies: [
        {
          id: "pol-3",
          name: "No protocol",
          enabled: true,
          // A snapshot written before protocol existed
          rules: [{ id: "r", name: "r", enabled: true } as never],
        },
      ],
    });
    const policy = nodes.find((n) => n.id === "policy-pol-3");
    expect((policy?.data as any).policy.rules[0].protocol).toBe("all");
  });

  it("gives a self-referencing group a separate destination node", () => {
    const { nodes } = buildHistoryGraph({
      ...SPEC,
      policies: [
        {
          id: "pol-self",
          name: "All to All",
          enabled: true,
          rules: [
            {
              id: "rule-self",
              name: "All to All",
              enabled: true,
              action: "accept",
              protocol: "all",
              sources: ["grp-all"],
              destinations: ["grp-all"],
              bidirectional: true,
            },
          ],
        },
      ],
    });
    const ids = nodes.map((n) => n.id);
    expect(ids).toContain("group-grp-all");
    expect(ids).toContain("dest-group-grp-all-pol-self");
  });

  it("returns an empty graph for an empty snapshot", () => {
    expect(buildHistoryGraph({})).toEqual({ nodes: [], edges: [] });
  });
});
