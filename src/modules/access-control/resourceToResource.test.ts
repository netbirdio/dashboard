import { describe, expect, it } from "vitest";
import {
  isNetworkResource,
  isResourceToResource,
} from "@/modules/access-control/useAccessControl";

describe("isResourceToResource", () => {
  const subnet = { id: "vpc", type: "subnet" as const };
  const host = { id: "db", type: "host" as const };
  const domain = { id: "s3", type: "domain" as const };
  const peer = { id: "router", type: "peer" as const };

  it("is true between two network resources that can start connections", () => {
    expect(isResourceToResource(subnet, host)).toBe(true);
  });

  it("is false when a side is a peer, missing, or the destination a domain", () => {
    expect(isResourceToResource(peer, host)).toBe(false);
    expect(isResourceToResource(subnet, peer)).toBe(false);
    expect(isResourceToResource(undefined, host)).toBe(false);
    expect(isResourceToResource(subnet, domain)).toBe(false);
  });

  it("treats a resource without an id as no resource", () => {
    expect(isNetworkResource({ id: "", type: "host" })).toBe(false);
    expect(isNetworkResource(domain)).toBe(true);
  });
});
