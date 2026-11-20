import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The Groups view dereferences peers in addDestinationResourceNodes, and
// useFetchApi resolves a failed /peers request to `data: undefined` with
// isLoading false — the state that used to slip past isDataReady.

let responses: Record<string, unknown> = {};

vi.mock("@utils/api", () => ({
  default: (url: string) => ({ data: responses[url], isLoading: false }),
}));

const { useControlCenterData } = await import(
  "@/modules/control-center/hooks/useControlCenterData"
);

const allEndpoints = () => ({
  "/policies": [],
  "/peers": [],
  "/networks": [],
  "/networks/resources": [],
  "/groups": [],
  "/users?service_user=false": [],
});

const subject = () => renderHook(() => useControlCenterData()).result.current;

beforeEach(() => {
  responses = allEndpoints();
});

describe("isDataReady", () => {
  it("is ready once every canvas-critical list resolved", () => {
    expect(subject().isDataReady()).toBe(true);
  });

  it.each([
    ["/policies"],
    ["/peers"],
    ["/networks"],
    ["/networks/resources"],
    ["/groups"],
  ])("is not ready while %s has no data", (endpoint) => {
    delete responses[endpoint];
    expect(subject().isDataReady()).toBe(false);
  });
});

describe("groupsByPeerId", () => {
  it("derives a peer's groups from the groups' member ids", () => {
    responses["/groups"] = [
      { id: "g1", name: "A", peers: ["p1", "p2"] },
      { id: "g2", name: "B", peers: ["p2"] },
    ];
    const { groupsByPeerId } = subject();
    expect(groupsByPeerId.get("p1")?.map((g) => g.id)).toEqual(["g1"]);
    expect(groupsByPeerId.get("p2")?.map((g) => g.id)).toEqual(["g1", "g2"]);
    expect(groupsByPeerId.get("p3")).toBeUndefined();
  });
});
