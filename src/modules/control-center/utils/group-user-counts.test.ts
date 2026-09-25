import { describe, expect, it } from "vitest";
import type { DraftChange } from "@/modules/control-center/draft/DraftChangesetContext";
import {
  groupUserCounts,
  userGroupChangeSignature,
} from "@/modules/control-center/utils/group-user-counts";

const users = [
  { id: "u1", name: "Ada", auto_groups: ["g1"] },
  { id: "u2", name: "Linus", auto_groups: ["g1", "g2"] },
] as never;

const membership = (userId: string, groupRefs: string[]): DraftChange =>
  ({
    id: `c-${userId}`,
    type: "update-user-groups",
    userId,
    name: userId,
    groupRefs,
    addedGroupNames: [],
    removedGroupNames: [],
  }) as never;

describe("groupUserCounts", () => {
  it("counts the account's own membership with no draft", () => {
    const counts = groupUserCounts(users, [], false);
    expect(counts.get("g1")).toBe(2);
    expect(counts.get("g2")).toBe(1);
  });

  it("lets a queued change replace the user's live ref list", () => {
    const counts = groupUserCounts(users, [membership("u2", ["g2"])], true);
    expect(counts.get("g1")).toBe(1);
    expect(counts.get("g2")).toBe(1);
  });

  // The count has to fall back on its own, or discarding the change in Review &
  // Deploy would leave the node showing a membership nothing will deploy.
  it("falls back to live the moment the change leaves the changeset", () => {
    const counts = groupUserCounts(users, [], true);
    expect(counts.get("g1")).toBe(2);
  });

  it("counts a draft group under its name, which is its ref", () => {
    const counts = groupUserCounts(users, [membership("u1", ["Ops"])], true);
    expect(counts.get("Ops")).toBe(1);
    expect(counts.get("g1")).toBe(1);
  });

  it("ignores the changeset in live mode", () => {
    const counts = groupUserCounts(users, [membership("u2", ["g2"])], false);
    expect(counts.get("g1")).toBe(2);
  });
});

describe("userGroupChangeSignature", () => {
  it("is blind to changes that carry no user membership", () => {
    const unrelated = { id: "x", type: "create-group", name: "Ops" } as never;
    expect(userGroupChangeSignature([unrelated])).toBe(
      userGroupChangeSignature([]),
    );
  });

  it("moves when a tracked ref list does", () => {
    expect(userGroupChangeSignature([membership("u1", ["g1"])])).not.toBe(
      userGroupChangeSignature([membership("u1", ["g2"])]),
    );
  });
});
