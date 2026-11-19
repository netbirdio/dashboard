import { beforeEach, describe, expect, it } from "vitest";
import { ExitNodeRequest } from "@/interfaces/ExitNode";
import { Group } from "@/interfaces/Group";
import { Policy } from "@/interfaces/Policy";
import { buildExitNodesSeed } from "@/modules/exit-nodes/mock/seed";
import {
  ExitNodesMockStore,
  MOCK_POLICY_ID_PREFIX,
} from "@/modules/exit-nodes/mock/store";

const request = (
  name: string,
  peerIds: string[],
  extra: Partial<ExitNodeRequest> = {},
): ExitNodeRequest => ({
  name,
  description: "",
  enabled: true,
  auto_apply: true,
  peers: peerIds.map((peer_id, i) => ({
    peer_id,
    metric: (i + 1) * 100,
    enabled: true,
  })),
  ...extra,
});

const policyTo = (exitNodeId: string, name = "Access"): Policy => ({
  name,
  description: "",
  enabled: true,
  source_posture_checks: [{ id: "pc1", name: "Check", checks: {} }],
  rules: [
    {
      name,
      description: "",
      enabled: true,
      action: "accept",
      bidirectional: false,
      protocol: "tcp",
      ports: ["443"],
      // The dashboard sends groups as objects or ids.
      sources: [{ id: "g1", name: "Engineering" }, "g2"] as Group[],
      destinations: [],
      destinationResource: { id: exitNodeId, type: "exit_node" },
    },
  ],
});

describe("ExitNodesMockStore", () => {
  let store: ExitNodesMockStore;

  beforeEach(() => {
    store = new ExitNodesMockStore();
  });

  it("creates, reads, updates and deletes exit nodes", () => {
    const created = store.createExitNode(request(" EU Egress ", ["a", "b"]));
    expect(created.id).toBeTruthy();
    expect(created.name).toBe("EU Egress");
    expect(store.getExitNode(created.id)).toEqual(created);

    const updated = store.updateExitNode(
      created.id,
      request("EU Egress", ["a"], { auto_apply: false }),
    );
    expect(updated.auto_apply).toBe(false);
    expect(store.listExitNodes()).toEqual([updated]);

    store.deleteExitNode(created.id);
    expect(store.listExitNodes()).toEqual([]);
  });

  it("returns copies, so callers can't change its state", () => {
    const created = store.createExitNode(request("EU", ["a"]));
    store.listExitNodes()[0].name = "changed";
    created.peers[0].metric = 1;
    expect(store.getExitNode(created.id).name).toBe("EU");
    expect(store.getExitNode(created.id).peers[0].metric).toBe(100);
  });

  it("rejects invalid requests with API-like errors", () => {
    store.createExitNode(request("EU", ["a"]));
    expect(() => store.createExitNode(request("eu", ["b"]))).toThrow();
    try {
      store.createExitNode(request("US", ["a"]));
    } catch (e) {
      expect(e).toMatchObject({ code: 409 });
    }
    expect(() => store.getExitNode("missing")).toThrowError();
    try {
      store.updateExitNode("missing", request("X", ["c"]));
    } catch (e) {
      expect(e).toMatchObject({ code: 404 });
    }
  });

  it("stores policies with groups and posture checks as ids", () => {
    const node = store.createExitNode(request("EU", ["a"]));
    const policy = store.createPolicy(policyTo(node.id));
    expect(policy.id?.startsWith(MOCK_POLICY_ID_PREFIX)).toBe(true);
    expect(policy.rules[0].sources).toEqual(["g1", "g2"]);
    expect(policy.rules[0].destinations).toBeNull();
    expect(policy.source_posture_checks).toEqual(["pc1"]);
    expect(store.hasPolicy(policy.id as string)).toBe(true);
  });

  it("rejects policies to an exit node that doesn't exist", () => {
    expect(() => store.createPolicy(policyTo("missing"))).toThrow();
  });

  it("upserts policies, also ones it didn't create", () => {
    const node = store.createExitNode(request("EU", ["a"]));
    const created = store.createPolicy(policyTo(node.id));
    store.upsertPolicy(created.id as string, policyTo(node.id, "Renamed"));
    expect(store.getPolicy(created.id as string).name).toBe("Renamed");

    store.upsertPolicy("real-policy", policyTo(node.id, "Shadow"));
    expect(store.hasPolicy("real-policy")).toBe(true);
    expect(store.listPolicies()).toHaveLength(2);

    store.deletePolicy("real-policy");
    expect(store.hasPolicy("real-policy")).toBe(false);
  });

  it("deletes an exit node's policies with it", () => {
    const eu = store.createExitNode(request("EU", ["a"]));
    const us = store.createExitNode(request("US", ["b"]));
    store.createPolicy(policyTo(eu.id, "EU Access"));
    store.createPolicy(policyTo(us.id, "US Access"));
    store.deleteExitNode(eu.id);
    expect(store.listPolicies().map((p) => p.name)).toEqual(["US Access"]);
  });

  it("loads seed data", () => {
    store.load(
      buildExitNodesSeed(
        [
          {
            id: "p1",
            name: "fra",
            os: "Linux",
            country_code: "DE",
            city_name: "Frankfurt am Main",
          },
          {
            id: "p2",
            name: "ams",
            os: "Linux",
            country_code: "NL",
            city_name: "Amsterdam",
          },
        ],
        [{ id: "all", name: "All" }],
      ),
    );
    expect(store.listExitNodes().map((n) => n.name)).toEqual([
      "EU Egress",
      "US Egress",
      "Contractors Egress",
    ]);
    expect(store.listPolicies().length).toBeGreaterThan(0);
  });
});
