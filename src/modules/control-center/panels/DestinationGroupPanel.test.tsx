import { act, renderHook } from "@testing-library/react";
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

const { canEditGroupMembers, useInitialGroupTab } = await import(
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

describe("useInitialGroupTab", () => {
  type Props = { groupId: string; preferred: string; loaded: boolean };
  const setup = (initialProps: Props) =>
    renderHook(
      (p: Props) => useInitialGroupTab(p.groupId, p.preferred, p.loaded),
      { initialProps },
    );

  it("follows the preferred tab while the data is still loading", () => {
    const { result, rerender } = setup({
      groupId: "g1",
      preferred: "peers",
      loaded: false,
    });
    rerender({ groupId: "g1", preferred: "users", loaded: true });
    expect(result.current.tab).toBe("users");
  });

  it("keeps the tab when the counts change after the data has loaded", () => {
    const { result, rerender } = setup({
      groupId: "g1",
      preferred: "peers",
      loaded: true,
    });
    rerender({ groupId: "g1", preferred: "resources", loaded: true });
    expect(result.current.tab).toBe("peers");
  });

  it("chooses again for the next group", () => {
    const { result, rerender } = setup({
      groupId: "g1",
      preferred: "peers",
      loaded: true,
    });
    rerender({ groupId: "g2", preferred: "resources", loaded: true });
    expect(result.current.tab).toBe("resources");
    rerender({ groupId: "g2", preferred: "peers", loaded: true });
    expect(result.current.tab).toBe("resources");
  });

  it("keeps the tab the user picked, even before the data has loaded", () => {
    const { result, rerender } = setup({
      groupId: "g1",
      preferred: "peers",
      loaded: false,
    });
    act(() => result.current.pickTab("resources"));
    rerender({ groupId: "g1", preferred: "users", loaded: true });
    expect(result.current.tab).toBe("resources");
  });

  it("stops following once a member is toggled before the data has loaded", () => {
    const { result, rerender } = setup({
      groupId: "g1",
      preferred: "peers",
      loaded: false,
    });
    act(() => result.current.lockTab());
    rerender({ groupId: "g1", preferred: "resources", loaded: true });
    expect(result.current.tab).toBe("peers");
  });
});
