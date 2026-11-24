import { describe, expect, it } from "vitest";
import { Network, NetworkResource } from "@/interfaces/Network";
import { resourcesWithNetwork } from "@/modules/networks/resources/resourcesWithNetwork";

const resource = (id: string): NetworkResource => ({
  id,
  name: id,
  address: "10.0.0.1",
  enabled: true,
});

const office: Network = { id: "office", name: "Office", resources: ["r1"] };
const aws: Network = { id: "aws", name: "AWS", resources: ["r2", "r3"] };

describe("resourcesWithNetwork", () => {
  it("attaches the network that lists each resource", () => {
    const rows = resourcesWithNetwork(
      [resource("r1"), resource("r2"), resource("r3")],
      [office, aws],
    );
    expect(rows.map((r) => [r.id, r.network.id])).toEqual([
      ["r1", "office"],
      ["r2", "aws"],
      ["r3", "aws"],
    ]);
  });

  it("leaves out resources no network lists", () => {
    const rows = resourcesWithNetwork(
      [resource("r1"), resource("orphan")],
      [office, { id: "empty", name: "Empty" }],
    );
    expect(rows.map((r) => r.id)).toEqual(["r1"]);
  });

  it("is empty until both lists have loaded", () => {
    expect(resourcesWithNetwork(undefined, [office])).toEqual([]);
    expect(resourcesWithNetwork([resource("r1")], undefined)).toEqual([]);
  });
});
