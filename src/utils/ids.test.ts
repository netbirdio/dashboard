import { describe, expect, it } from "vitest";
import { toIds } from "@/utils/ids";

describe("toIds", () => {
  it("returns plain ids unchanged", () => {
    expect(toIds(["a", "b"])).toEqual(["a", "b"]);
  });

  it("maps legacy objects to their ids", () => {
    expect(toIds([{ id: "a" }, { id: "b" }])).toEqual(["a", "b"]);
  });

  it("accepts a mix and drops empties", () => {
    expect(toIds(["a", { id: "b" }, "", {}, { id: "" }])).toEqual(["a", "b"]);
  });

  it("handles missing lists", () => {
    expect(toIds(undefined)).toEqual([]);
    expect(toIds(null)).toEqual([]);
  });
});
