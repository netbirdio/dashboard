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
