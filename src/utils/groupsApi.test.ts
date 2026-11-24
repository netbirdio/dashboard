import { isGroupReadPath, requestGroupsWithFallback } from "@utils/groupsApi";
import { toIds } from "@utils/ids";
import { describe, expect, it, vi } from "vitest";

const notFound = { code: 404, message: "not found" };
const fresh = () => ({ v1alpha1Unavailable: false });

describe("isGroupReadPath", () => {
  it("matches the list and a single group, with or without a query", () => {
    expect(isGroupReadPath("/groups")).toBe(true);
    expect(isGroupReadPath("/groups/abc")).toBe(true);
    expect(isGroupReadPath("/groups?name=All")).toBe(true);
  });

  it("ignores other paths", () => {
    expect(isGroupReadPath("/peers")).toBe(false);
    expect(isGroupReadPath("/groups/a/b")).toBe(false);
    expect(isGroupReadPath("/v1alpha1/groups")).toBe(false);
  });
});

describe("requestGroupsWithFallback", () => {
  it("uses v1alpha1 when it answers", async () => {
    const state = fresh();
    const request = vi.fn().mockResolvedValue([{ id: "g1", peers: ["p1"] }]);
    const res = await requestGroupsWithFallback("/groups", request, state);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith("/v1alpha1/groups");
    expect(res).toEqual([{ id: "g1", peers: ["p1"] }]);
    expect(state.v1alpha1Unavailable).toBe(false);
  });

  it("falls back on 404 and remembers it", async () => {
    const state = fresh();
    const request = vi
      .fn()
      .mockRejectedValueOnce(notFound)
      .mockResolvedValue([{ id: "g1", peers: [{ id: "p1", name: "a" }] }]);
    const res = await requestGroupsWithFallback("/groups", request, state);
    expect(request.mock.calls.map((c) => c[0])).toEqual([
      "/v1alpha1/groups",
      "/groups",
    ]);
    expect(state.v1alpha1Unavailable).toBe(true);
    expect(toIds((res as any)[0].peers)).toEqual(["p1"]);

    await requestGroupsWithFallback("/groups/g1", request, state);
    expect(request).toHaveBeenLastCalledWith("/groups/g1");
    expect(request).toHaveBeenCalledTimes(3);
  });

  it("does not fall back on other errors", async () => {
    const state = fresh();
    const err = { code: 500, message: "internal server error" };
    const request = vi.fn().mockRejectedValue(err);
    await expect(
      requestGroupsWithFallback("/groups", request, state),
    ).rejects.toBe(err);
    expect(request).toHaveBeenCalledTimes(1);
    expect(state.v1alpha1Unavailable).toBe(false);
  });

  it("keeps v1alpha1 probing when a single group is simply missing", async () => {
    const state = fresh();
    const request = vi.fn().mockRejectedValue(notFound);
    await expect(
      requestGroupsWithFallback("/groups/gone", request, state),
    ).rejects.toBe(notFound);
    expect(state.v1alpha1Unavailable).toBe(false);
  });

  it("sends a single group and its query to v1alpha1", async () => {
    const request = vi.fn().mockResolvedValue({ id: "g1" });
    await requestGroupsWithFallback("/groups/g1?x=1", request, fresh());
    expect(request).toHaveBeenCalledWith("/v1alpha1/groups/g1?x=1");
  });

  it("leaves other paths untouched", async () => {
    const request = vi.fn().mockResolvedValue([]);
    await requestGroupsWithFallback("/peers", request, fresh());
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith("/peers");
  });
});
