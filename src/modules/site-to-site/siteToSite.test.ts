import { describe, expect, it } from "vitest";
import { Group } from "@/interfaces/Group";
import { Network, NetworkResource, NetworkRouter } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import { Policy } from "@/interfaces/Policy";
import {
  connectionKey,
  connectionNetworks,
  connectionPolicies,
  defaultSiteResource,
  hasAddressResource,
  networkRoutingPeers,
  peerCountries,
  policySiteNetworks,
  routingPeerHostname,
  siteToSiteScope,
} from "@/modules/site-to-site/siteToSite";

const res = (
  id: string,
  type: NetworkResource["type"],
): NetworkResource => ({ id, name: id, address: id, type, enabled: true });

const resources = [
  res("berlin-printer", "host"),
  res("berlin-lan", "subnet"),
  res("aws-domain", "domain"),
  res("aws-vpc", "subnet"),
  res("staging-docs", "domain"),
];

const berlin: Network = {
  id: "berlin",
  name: "Berlin Office",
  resources: ["berlin-printer", "berlin-lan"],
  routers: ["r1"],
};
const aws: Network = {
  id: "aws",
  name: "AWS Production",
  resources: ["aws-domain", "aws-vpc"],
  routers: ["r2"],
};
const staging: Network = {
  id: "staging",
  name: "Staging",
  resources: ["staging-docs"],
};

describe("defaultSiteResource", () => {
  it("prefers the network's first IP range", () => {
    expect(defaultSiteResource(berlin, resources, "source")?.id).toBe("berlin-lan");
  });

  it("lets only a destination fall back to a domain", () => {
    expect(defaultSiteResource(staging, resources, "source")).toBeUndefined();
    expect(defaultSiteResource(staging, resources, "destination")?.id).toBe(
      "staging-docs",
    );
    expect(hasAddressResource(staging, resources)).toBe(false);
  });
});

describe("siteToSiteScope", () => {
  it("limits each side to its network and keeps domains off the source", () => {
    expect(siteToSiteScope(aws, berlin, resources)).toEqual({
      sourceResourceIds: ["aws-vpc"],
      destinationResourceIds: ["berlin-printer", "berlin-lan"],
    });
  });
});

describe("connections", () => {
  const connection = {
    network_ids: ["aws", "berlin"],
    policy_ids: ["p2", "missing"],
    enabled: true,
  };

  it("resolves networks and policies in the connection's order", () => {
    const policies = [{ id: "p1" }, { id: "p2" }] as Policy[];
    expect(connectionNetworks(connection, [berlin, aws]).map((n) => n.id)).toEqual([
      "aws",
      "berlin",
    ]);
    expect(connectionPolicies(connection, policies).map((p) => p.id)).toEqual(["p2"]);
  });

  it("keys a pair the same way in both orders", () => {
    expect(connectionKey(connection)).toBe(
      connectionKey({ ...connection, network_ids: ["berlin", "aws"] }),
    );
  });

  it("finds the networks a policy runs between", () => {
    const policy = {
      id: "p1",
      rules: [
        {
          sourceResource: { id: "aws-vpc", type: "subnet" },
          destinationResource: { id: "berlin-lan", type: "subnet" },
        },
      ],
    } as unknown as Policy;
    const { source, destination } = policySiteNetworks(policy, [berlin, aws]);
    expect(source?.id).toBe("aws");
    expect(destination?.id).toBe("berlin");
  });
});

describe("routing peers", () => {
  const peer = (id: string, country: string, connected = true) =>
    ({ id, name: id, country_code: country, connected }) as Peer;
  const peers = [peer("p1", "DE"), peer("p2", "DE"), peer("p3", "US", false), peer("p4", "US")];
  const routers: NetworkRouter[] = [
    { id: "r1", peer: "p1", metric: 9999, masquerade: true, enabled: true },
    { id: "r2", peer_groups: ["g1"], metric: 9999, masquerade: true, enabled: true },
    { id: "r3", peer: "p4", metric: 9999, masquerade: true, enabled: false },
  ];
  const groups: Group[] = [
    { id: "g1", name: "AWS Routing Peers", peers: [{ id: "p2", name: "p2" }, { id: "p3", name: "p3" }] },
  ];

  it("collects peers named directly and through groups", () => {
    expect(networkRoutingPeers(berlin, routers, groups, peers).map((p) => p.id)).toEqual(["p1"]);
    expect(networkRoutingPeers(aws, routers, groups, peers).map((p) => p.id)).toEqual(["p2", "p3"]);
  });

  it("ignores disabled routers", () => {
    const network = { ...staging, routers: ["r3"] };
    expect(networkRoutingPeers(network, routers, groups, peers)).toEqual([]);
  });

  it("lists each country of a connected peer once", () => {
    expect(peerCountries(peers)).toEqual(["DE", "US"]);
    expect(peerCountries([peer("p3", "US", false)])).toEqual([]);
  });
});

describe("routingPeerHostname", () => {
  it("turns the network name into a hostname", () => {
    expect(routingPeerHostname(berlin)).toBe("router-berlin-office");
    expect(routingPeerHostname({ id: "x", name: "  ¡¿ " })).toBe("router-network");
  });
});
