import { describe, expect, it } from "vitest";
import { Network, NetworkResource } from "@/interfaces/Network";
import {
  emptySide,
  NEW_NETWORK,
  rangeProblem,
  sideInfo,
  siteToSitePolicyName,
} from "@/modules/site-to-site/wizard/wizardSides";

const berlin: Network = { id: "berlin", name: "Berlin Office", resources: ["lan"] };
const staging: Network = { id: "staging", name: "Staging", resources: ["docs"] };
const resources: NetworkResource[] = [
  { id: "lan", name: "Office LAN", address: "192.168.1.0/24", type: "subnet", enabled: true },
  { id: "docs", name: "Docs", address: "docs.internal", type: "domain", enabled: true },
];

describe("rangeProblem", () => {
  it("accepts a CIDR block", () => {
    expect(rangeProblem("10.30.0.0/24")).toBe("");
  });

  it("refuses a bare address and a single host", () => {
    expect(rangeProblem("10.30.0.1")).toMatch(/CIDR block/);
    expect(rangeProblem("10.30.0.1/32")).toMatch(/single host/);
  });

  it("refuses a range that overlaps the other network's", () => {
    expect(
      rangeProblem("192.168.0.0/16", { name: "Office LAN", address: "192.168.1.0/24" }),
    ).toMatch(/overlaps Office LAN/);
    expect(
      rangeProblem("10.0.0.0/24", { name: "Office LAN", address: "192.168.1.0/24" }),
    ).toBe("");
  });
});

describe("sideInfo", () => {
  it("uses an existing network's IP ranges", () => {
    const info = sideInfo({ ...emptySide, networkId: "berlin" }, [berlin, staging], resources);
    expect(info.ranges.map((r) => r.id)).toEqual(["lan"]);
    expect(info.needsRange).toBe(false);
    expect(info.valid).toBe(true);
  });

  it("asks a network without an IP range for one, with its name", () => {
    const side = { ...emptySide, networkId: "staging", range: "10.40.0.0/24" };
    expect(sideInfo(side, [berlin, staging], resources).valid).toBe(false);
    expect(
      sideInfo({ ...side, rangeName: "Staging LAN" }, [berlin, staging], resources).valid,
    ).toBe(true);
  });

  it("needs a free name and a range for a new network", () => {
    const side = { networkId: NEW_NETWORK, name: "berlin office", rangeName: "LAN", range: "10.30.0.0/24" };
    expect(sideInfo(side, [berlin], resources).nameError).toMatch(/already exists/);
    expect(sideInfo({ ...side, name: "Lisbon Office" }, [berlin], resources).valid).toBe(true);
  });

  it("checks the range against the other side", () => {
    const a = sideInfo({ ...emptySide, networkId: "berlin" }, [berlin], resources);
    const b = sideInfo(
      { networkId: NEW_NETWORK, name: "Lisbon", rangeName: "LAN", range: "192.168.1.0/25" },
      [berlin],
      resources,
      a,
    );
    expect(b.rangeError).toMatch(/overlaps Office LAN/);
  });
});

describe("siteToSitePolicyName", () => {
  it("names both resources with their networks", () => {
    expect(
      siteToSitePolicyName(
        { resource: resources[0], network: berlin },
        { resource: { ...resources[0], name: "Lisbon LAN" }, network: { id: "l", name: "Lisbon Office" } },
      ),
    ).toBe("Office LAN (Berlin Office) to Lisbon LAN (Lisbon Office)");
    expect(siteToSitePolicyName({ network: berlin }, undefined)).toBe("");
  });
});
