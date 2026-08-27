import { describe, expect, it, vi } from "vitest";
import { Group } from "@/interfaces/Group";

// A draft-created group's members deploy inside its create-group change, while
// an existing group's edits are an update-group / live PUT. Gating both kinds
// on groups.update locked a create-only user out of the group they just created.

// The panel's import graph reaches @utils/api, whose module init reads the
// window config that doesn't exist under vitest.
vi.mock("@utils/api", () => ({
  default: () => ({ data: undefined, isLoading: false }),
  useApiCall: () => ({}),
}));
// @utils/netbird calls loadConfig() at module init, which reads the same
// missing config.
vi.mock("@utils/config", () => ({ default: () => ({}) }));

const { canEditGroupMembers } = await import(
  "@/modules/control-center/panels/DestinationGroupPanel"
);

const perms = (create: boolean, update: boolean) => ({ create, update });
const draftGroup = { name: "Draft Group" } as Group;
const existingGroup = { id: "g1", name: "Prod" } as Group;

describe("canEditGroupMembers", () => {
  it("gates a draft-created group on groups.create", () => {
    expect(canEditGroupMembers(perms(true, false), draftGroup)).toBe(true);
    expect(canEditGroupMembers(perms(false, true), draftGroup)).toBe(false);
  });

  it("gates an existing group on groups.update", () => {
    expect(canEditGroupMembers(perms(false, true), existingGroup)).toBe(true);
    expect(canEditGroupMembers(perms(true, false), existingGroup)).toBe(false);
  });

  it("treats an unresolved group as existing", () => {
    expect(canEditGroupMembers(perms(false, true), undefined)).toBe(true);
    expect(canEditGroupMembers(perms(true, false), undefined)).toBe(false);
  });
});
