import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The Groups view dereferences peers in addDestinationResourceNodes, and
// useFetchApi resolves a failed /peers request to `data: undefined` with
// isLoading false — the state that used to slip past isDataReady.

let responses: Record<string, unknown> = {};

vi.mock("@utils/api", () => ({
  default: (url: string) => ({ data: responses[url], isLoading: false }),
}));

let canReadExitNodes = true;
vi.mock("@/modules/exit-nodes/useExitNodePermissions", () => ({
  useExitNodePermissions: () => ({ read: canReadExitNodes }),
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
  "/exit-nodes": [],
});

const subject = () => renderHook(() => useControlCenterData()).result.current;

beforeEach(() => {
  responses = allEndpoints();
  canReadExitNodes = true;
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

describe("exit nodes", () => {
  it("returns them", () => {
    responses["/exit-nodes"] = [{ id: "en1" }];
    expect(subject().exitNodes).toEqual([{ id: "en1" }]);
  });

  it("don't hold the canvas back when missing (no API, no permission)", () => {
    delete responses["/exit-nodes"];
    expect(subject().isDataReady()).toBe(true);
  });
});
