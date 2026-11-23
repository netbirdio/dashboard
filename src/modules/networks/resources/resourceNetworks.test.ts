import { describe, expect, it } from "vitest";
import { Network, NetworkResource } from "@/interfaces/Network";
import {
  findResourceNetwork,
  withNetworkNames,
} from "@/modules/networks/resources/resourceNetworks";

const resource = (id: string): NetworkResource => ({
  id,
  name: id,
  address: "10.0.0.0/24",
  enabled: true,
});

const networks: Network[] = [
  { id: "nyc", name: "New York Office", resources: ["ny-lan"] },
  { id: "aws", name: "AWS Production", resources: ["vpc", "db"] },
];

describe("withNetworkNames", () => {
  it("orders resources by network name and tags each with its network", () => {
    const result = withNetworkNames(
      [resource("ny-lan"), resource("db"), resource("orphan"), resource("vpc")],
      networks,
    );

    expect(result.map((r) => r.id)).toEqual(["db", "vpc", "ny-lan", "orphan"]);
    expect(result[0]).toMatchObject({ networkId: "aws", networkName: "AWS Production" });
    expect(result[3].networkName).toBeUndefined();
  });

  it("keeps the list as it is when networks are not loaded", () => {
    const result = withNetworkNames([resource("b"), resource("a")]);
    expect(result.map((r) => r.id)).toEqual(["b", "a"]);
  });
});

describe("findResourceNetwork", () => {
  it("returns the network listing the resource", () => {
    expect(findResourceNetwork("vpc", networks)?.id).toBe("aws");
    expect(findResourceNetwork("missing", networks)).toBeUndefined();
  });
});
