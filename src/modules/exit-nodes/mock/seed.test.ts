import { describe, expect, it } from "vitest";
import { buildExitNodesSeed } from "@/modules/exit-nodes/mock/seed";

const peer = (
  id: string,
  country_code: string,
  city_name: string,
  os = "Linux",
) => ({ id, name: id, os, country_code, city_name });

const peers = [
  peer("iphone-ny", "US", "New York", "iOS 18.0"),
  peer("fra", "DE", "Frankfurt am Main"),
  peer("ams", "NL", "Amsterdam"),
  peer("ash", "US", "Ashburn"),
  peer("nyc-1", "US", "New York"),
  peer("nyc-2", "US", "New York"),
];

describe("buildExitNodesSeed", () => {
  it("builds the three seed exit nodes", () => {
    const { exitNodes } = buildExitNodesSeed(peers, []);
    expect(
      exitNodes.map(({ name, description, enabled, auto_apply }) => ({
        name,
        description,
        enabled,
        auto_apply,
      })),
    ).toEqual([
      {
        name: "EU Egress",
        description: "Internet egress for EU teams",
        enabled: true,
        auto_apply: true,
      },
      {
        name: "US Egress",
        description: "Opt-in egress for the sales team",
        enabled: true,
        auto_apply: false,
      },
      {
        name: "Contractors Egress",
        description: "Fixed public IP for vendor portals",
        enabled: false,
        auto_apply: true,
      },
    ]);
  });

  it("places peers by city, with metrics 100, 200, …", () => {
    const { exitNodes } = buildExitNodesSeed(peers, []);
    expect(exitNodes[0].peers).toEqual([
      { peer_id: "fra", metric: 100, enabled: true },
      { peer_id: "ams", metric: 200, enabled: true },
    ]);
    expect(exitNodes[1].peers.map((p) => p.peer_id)).toEqual(["ash", "nyc-1"]);
    // Phones are only used when nothing else is left.
    expect(exitNodes[2].peers.map((p) => p.peer_id)).toEqual(["nyc-2"]);
  });

  it("never uses a peer twice and falls back to any free peer", () => {
    const { exitNodes } = buildExitNodesSeed(
      [peer("a", "JP", "Tokyo"), peer("b", "JP", "Osaka")],
      [],
    );
    const used = exitNodes.flatMap((n) => n.peers.map((p) => p.peer_id));
    expect(used).toEqual(["a", "b"]);
    expect(exitNodes[1].peers).toEqual([]);
  });

  it("works without peers", () => {
    const { exitNodes } = buildExitNodesSeed([], []);
    expect(exitNodes.every((n) => n.peers.length === 0)).toBe(true);
  });

  it("adds policies for EU and US Egress from the account's groups", () => {
    const { exitNodes, policies } = buildExitNodesSeed(peers, [
      { id: "all", name: "All" },
      { id: "eng", name: "Engineering" },
      { id: "sales", name: "Sales" },
    ]);
    expect(
      policies.map((p) => ({
        name: p.name,
        to: p.rules[0].destinationResource,
        sources: p.rules[0].sources,
        protocol: p.rules[0].protocol,
        ports: p.rules[0].ports,
      })),
    ).toEqual([
      {
        name: "EU Egress Access",
        to: { id: exitNodes[0].id, type: "exit_node" },
        sources: ["eng", "sales"],
        protocol: "all",
        ports: [],
      },
      {
        name: "Sales EU Web",
        to: { id: exitNodes[0].id, type: "exit_node" },
        sources: ["sales"],
        protocol: "tcp",
        ports: ["80", "443"],
      },
      {
        name: "US Egress Access",
        to: { id: exitNodes[1].id, type: "exit_node" },
        sources: ["sales"],
        protocol: "all",
        ports: [],
      },
    ]);
  });

  it("uses the All group when there is no other", () => {
    const { policies } = buildExitNodesSeed(peers, [
      { id: "all", name: "All" },
    ]);
    expect(policies.every((p) => p.rules[0].sources?.[0] === "all")).toBe(true);
  });
});
