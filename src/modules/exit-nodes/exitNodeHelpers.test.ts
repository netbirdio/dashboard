import { describe, expect, it } from "vitest";
import { ExitNode } from "@/interfaces/ExitNode";
import { Policy } from "@/interfaces/Policy";
import {
  arePeersValid,
  getExitNodeLocations,
  getExitNodeNameError,
  getExitNodePolicies,
  getExitNodeSearchText,
  getHighAvailability,
  getNextMetric,
  getPeersUsedByOtherExitNodes,
  getPrimaryPeer,
  isExitNodePolicy,
  isValidMetric,
  sortPeersByMetric,
  validateExitNodeRequest,
} from "@/modules/exit-nodes/exitNodeHelpers";

const peers = [
  { id: "fra", name: "fra-gw-01", country_code: "DE", city_name: "Frankfurt" },
  { id: "ams", name: "ams-gw-01", country_code: "NL", city_name: "Amsterdam" },
  { id: "ber", name: "ber-gw-01", country_code: "de", city_name: "Berlin" },
  { id: "fra2", name: "fra-gw-02", country_code: "DE", city_name: "Frankfurt" },
  { id: "nogeo", name: "no-geo", country_code: "", city_name: "" },
];

const node = (
  entries: [string, number, boolean][],
  extra: Partial<ExitNode> = {},
): ExitNode => ({
  id: "en1",
  name: "EU Egress",
  description: "",
  enabled: true,
  auto_apply: true,
  peers: entries.map(([peer_id, metric, enabled]) => ({
    peer_id,
    metric,
    enabled,
  })),
  ...extra,
});

const exitPolicy = (id: string, exitNodeId: string): Policy => ({
  id,
  name: id,
  description: "",
  enabled: true,
  source_posture_checks: [],
  rules: [
    {
      name: id,
      description: "",
      enabled: true,
      action: "accept",
      bidirectional: false,
      protocol: "all",
      ports: [],
      sources: [{ id: "g1", name: "Engineering" }],
      destinations: null,
      destinationResource: { id: exitNodeId, type: "exit_node" },
    },
  ],
});

describe("getHighAvailability", () => {
  it("is active with more than one enabled peer", () => {
    expect(
      getHighAvailability(
        node([
          ["fra", 100, true],
          ["ams", 200, true],
        ]),
      ),
    ).toEqual({
      activePeerCount: 2,
      hasActivePeers: true,
      isHighlyAvailable: true,
    });
  });

  it("only counts enabled peers", () => {
    expect(
      getHighAvailability(
        node([
          ["fra", 100, true],
          ["ams", 200, false],
        ]),
      ),
    ).toEqual({
      activePeerCount: 1,
      hasActivePeers: true,
      isHighlyAvailable: false,
    });
  });

  it("has no active peers when every peer is disabled", () => {
    expect(getHighAvailability(node([["fra", 100, false]]))).toEqual({
      activePeerCount: 0,
      hasActivePeers: false,
      isHighlyAvailable: false,
    });
  });
});

describe("getPrimaryPeer", () => {
  it("is the enabled peer with the lowest metric", () => {
    const n = node([
      ["ams", 50, false],
      ["fra", 300, true],
      ["ber", 200, true],
    ]);
    expect(getPrimaryPeer(n)?.peer_id).toBe("ber");
  });

  it("falls back to the lowest metric when none is enabled", () => {
    const n = node([
      ["fra", 300, false],
      ["ams", 100, false],
    ]);
    expect(getPrimaryPeer(n)?.peer_id).toBe("ams");
  });

  it("is undefined without peers", () => {
    expect(getPrimaryPeer(node([]))).toBeUndefined();
  });
});

describe("sortPeersByMetric", () => {
  it("sorts without changing the input", () => {
    const input = node([
      ["ams", 200, true],
      ["fra", 100, true],
    ]).peers;
    expect(sortPeersByMetric(input).map((p) => p.peer_id)).toEqual([
      "fra",
      "ams",
    ]);
    expect(input[0].peer_id).toBe("ams");
  });
});

describe("getExitNodeLocations", () => {
  it("orders countries by metric and marks the primary", () => {
    const result = getExitNodeLocations(
      node([
        ["ams", 200, true],
        ["fra", 100, true],
      ]),
      peers,
    );
    expect(result.countries).toEqual(["DE", "NL"]);
    expect(result.locations).toEqual([
      { country_code: "DE", city_name: "Frankfurt", primary: true },
      { country_code: "NL", city_name: "Amsterdam", primary: false },
    ]);
  });

  it("lists each country once but every city", () => {
    const result = getExitNodeLocations(
      node([
        ["fra", 100, true],
        ["ber", 200, true],
        ["fra2", 300, true],
      ]),
      peers,
    );
    expect(result.countries).toEqual(["DE"]);
    expect(result.locations.map((l) => l.city_name)).toEqual([
      "Frankfurt",
      "Berlin",
    ]);
  });

  it("marks no primary when traffic exits in one country only", () => {
    const result = getExitNodeLocations(
      node([
        ["fra", 100, true],
        ["ber", 200, true],
      ]),
      peers,
    );
    expect(result.locations.every((l) => !l.primary)).toBe(true);
  });

  it("uses the enabled peers only", () => {
    const result = getExitNodeLocations(
      node([
        ["fra", 100, false],
        ["ams", 200, true],
      ]),
      peers,
    );
    expect(result.countries).toEqual(["NL"]);
  });

  it("falls back to all peers when none is enabled", () => {
    const result = getExitNodeLocations(
      node([
        ["ams", 200, false],
        ["fra", 100, false],
      ]),
      peers,
    );
    expect(result.countries).toEqual(["DE", "NL"]);
  });

  it("skips peers without a location or unknown peers", () => {
    const result = getExitNodeLocations(
      node([
        ["nogeo", 100, true],
        ["deleted", 150, true],
        ["ams", 200, true],
      ]),
      peers,
    );
    expect(result.countries).toEqual(["NL"]);
    expect(result.locations[0].primary).toBe(false);
  });
});

describe("policies", () => {
  const policies = [
    exitPolicy("p1", "en1"),
    exitPolicy("p2", "en2"),
    { ...exitPolicy("p3", "x"), rules: [] },
  ];

  it("finds the policies targeting an exit node", () => {
    expect(getExitNodePolicies("en1", policies).map((p) => p.id)).toEqual([
      "p1",
    ]);
    expect(getExitNodePolicies(undefined, policies)).toEqual([]);
  });

  it("tells exit node policies apart", () => {
    expect(isExitNodePolicy(policies[0])).toBe(true);
    expect(isExitNodePolicy(policies[0], "en2")).toBe(false);
    expect(isExitNodePolicy(policies[2])).toBe(false);
    expect(isExitNodePolicy(undefined)).toBe(false);
  });
});

describe("metrics", () => {
  it("adds new peers after the last metric", () => {
    expect(getNextMetric([])).toBe(100);
    expect(getNextMetric([{ metric: 100 }, { metric: 250 }])).toBe(350);
    expect(getNextMetric([{ metric: 9950 }])).toBe(9999);
  });

  it.each([
    [1, true],
    [9999, true],
    ["100", true],
    [0, false],
    [10000, false],
    ["", false],
    ["1.5", false],
    ["-1", false],
  ])("isValidMetric(%j) is %s", (metric, valid) => {
    expect(isValidMetric(metric)).toBe(valid);
  });

  it("needs a peer, an enabled one and valid metrics", () => {
    expect(arePeersValid([])).toBe(false);
    expect(arePeersValid([{ peer_id: "a", metric: 100, enabled: false }])).toBe(
      false,
    );
    expect(arePeersValid([{ peer_id: "a", metric: 0, enabled: true }])).toBe(
      false,
    );
    expect(
      arePeersValid([
        { peer_id: "a", metric: 100, enabled: true },
        { peer_id: "b", metric: "200", enabled: false },
      ]),
    ).toBe(true);
  });
});

describe("names", () => {
  const nodes = [node([], { id: "en1", name: "EU Egress" })];

  it("rejects duplicates case-insensitively, except the node itself", () => {
    expect(getExitNodeNameError("eu egress", nodes)).toMatch(/already exists/);
    expect(getExitNodeNameError("EU Egress", nodes, "en1")).toBe("");
    expect(getExitNodeNameError("", nodes)).toBe("");
  });

  it("limits the length", () => {
    expect(getExitNodeNameError("x".repeat(40), [])).toBe("");
    expect(getExitNodeNameError("x".repeat(41), [])).toMatch(/40/);
  });
});

describe("validateExitNodeRequest", () => {
  const existing = [
    node([["fra", 100, true]], { id: "en1", name: "EU Egress" }),
  ];
  const request = (peerIds: string[], name = "New") => ({
    name,
    description: "",
    enabled: true,
    auto_apply: true,
    peers: peerIds.map((peer_id, i) => ({
      peer_id,
      metric: (i + 1) * 100,
      enabled: true,
    })),
  });

  it("accepts a valid request", () => {
    expect(validateExitNodeRequest(request(["ams"]), existing)).toBeUndefined();
  });

  it("rejects a missing name, missing peers and duplicates", () => {
    expect(validateExitNodeRequest(request(["ams"], " "), existing)?.code).toBe(
      422,
    );
    expect(validateExitNodeRequest(request([]), existing)?.code).toBe(422);
    expect(
      validateExitNodeRequest(request(["ams", "ams"]), existing)?.code,
    ).toBe(422);
    expect(
      validateExitNodeRequest(request(["ams"], "eu egress"), existing)?.code,
    ).toBe(409);
  });

  it("rejects a peer another exit node uses, but not its own", () => {
    expect(validateExitNodeRequest(request(["fra"]), existing)?.code).toBe(409);
    expect(
      validateExitNodeRequest(request(["fra"], "EU Egress"), existing, "en1"),
    ).toBeUndefined();
  });

  it("rejects metrics out of range", () => {
    const bad = request(["ams"]);
    bad.peers[0].metric = 0;
    expect(validateExitNodeRequest(bad, existing)?.code).toBe(422);
  });
});

describe("getPeersUsedByOtherExitNodes", () => {
  it("maps peers of other nodes to the node's name", () => {
    const nodes = [
      node([["fra", 100, true]], { id: "en1", name: "EU" }),
      node([["ams", 100, true]], { id: "en2", name: "NL" }),
    ];
    const used = getPeersUsedByOtherExitNodes(nodes, "en1");
    expect([...used.entries()]).toEqual([["ams", "NL"]]);
  });
});

describe("getExitNodeSearchText", () => {
  it("contains the name, description, peer names and source groups", () => {
    const text = getExitNodeSearchText(
      node([["fra", 100, true]], { description: "For EU teams" }),
      peers,
      [exitPolicy("p1", "en1")],
    );
    expect(text).toBe("EU Egress For EU teams fra-gw-01 Engineering");
  });
});
