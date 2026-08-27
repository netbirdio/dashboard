import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Group, GroupIssued } from "@/interfaces/Group";
import { GroupUsage } from "@/modules/groups/useGroupsUsage";

// The node menu filtered group deletes through three guards, the multi-select
// toolbar through none: two selected groups could queue a delete-group for an
// IdP-issued, still-referenced group, without the groups.delete permission.

const fullRights = () => ({
  groups: { create: true, read: true, update: true, delete: true },
});
let permission = fullRights();
let usage: GroupUsage[] = [];
let changes: unknown[] = [];
let policies: unknown[] = [];

vi.mock("@/contexts/PermissionsProvider", () => ({
  usePermissions: () => ({ permission }),
}));
vi.mock("@/modules/groups/useGroupsUsage", () => ({
  default: () => ({ data: usage }),
}));
vi.mock("@/modules/control-center/draft/DraftChangesetContext", () => ({
  useDraftChangeset: () => ({ changes }),
}));
vi.mock("@utils/api", () => ({
  default: () => ({ data: policies }),
}));

const { useCanDeleteGroup } = await import(
  "@/modules/control-center/hooks/useCanDeleteGroup"
);

const unused = (over: Partial<GroupUsage> = {}): GroupUsage =>
  ({
    id: "g1",
    name: "Servers",
    peers_count: 0,
    policies_count: 0,
    nameservers_count: 0,
    zones_count: 0,
    routes_count: 0,
    setup_keys_count: 0,
    users_count: 0,
    resources_count: 0,
    ...over,
  }) as GroupUsage;

const groupNode = (group: Partial<Group>) => ({
  id: `group-${group.id ?? "new"}`,
  type: "groupNode",
  position: { x: 0, y: 0 },
  data: { group: { id: "g1", name: "Servers", ...group } },
});

const subject = () => renderHook(() => useCanDeleteGroup()).result.current;

beforeEach(() => {
  permission = fullRights();
  usage = [unused()];
  changes = [];
  policies = [];
});

const policyReferencing = (groupId: string, id = "p1") => ({
  id,
  name: "Policy",
  rules: [{ sources: [{ id: groupId, name: "Servers" }], destinations: [] }],
});

describe("canDeleteGroup", () => {
  it("allows an unused API group with the permission", () => {
    expect(subject().canDeleteGroup({ id: "g1", name: "Servers" })).toBe(true);
  });

  it("refuses without groups.delete", () => {
    permission.groups.delete = false;
    expect(subject().canDeleteGroup({ id: "g1", name: "Servers" })).toBe(false);
  });

  it("refuses an IdP-issued group, which the API will not delete", () => {
    expect(
      subject().canDeleteGroup({
        id: "g1",
        name: "Servers",
        issued: GroupIssued.INTEGRATION,
      }),
    ).toBe(false);
  });

  // Any single usage counter is enough: the API refuses the DELETE while the group is
  // referenced, so Delete must never be offered for one that is.
  it.each([
    ["peers_count"],
    ["policies_count"],
    ["nameservers_count"],
    ["zones_count"],
    ["routes_count"],
    ["setup_keys_count"],
    ["users_count"],
    ["resources_count"],
  ])("refuses a group still counted by %s", (key) => {
    usage = [unused({ [key]: 1 } as Partial<GroupUsage>)];
    expect(subject().canDeleteGroup({ id: "g1", name: "Servers" })).toBe(false);
  });

  it("refuses a group missing from the usage data rather than guessing", () => {
    usage = [];
    expect(subject().canDeleteGroup({ id: "g1", name: "Servers" })).toBe(false);
  });

  it("refuses a draft group, which has no id to delete", () => {
    expect(subject().canDeleteGroup({ name: "Draft group" })).toBe(false);
  });

  // The deploy sends delete-policy before delete-group, so a group whose only
  // reference the draft already deletes CAN be deleted — the live counts alone
  // made the strip machinery in deleteGroups unreachable through the UI.
  it("allows a group whose only referencing policy has a pending delete-policy", () => {
    usage = [unused({ policies_count: 1 })];
    policies = [policyReferencing("g1")];
    changes = [
      { id: "c1", type: "delete-policy", policyId: "p1", name: "Policy" },
    ];
    expect(subject().canDeleteGroup({ id: "g1", name: "Servers" })).toBe(true);
  });

  it("allows a group a pending update-policy no longer references", () => {
    usage = [unused({ policies_count: 1 })];
    policies = [policyReferencing("g1")];
    changes = [
      {
        id: "c1",
        type: "update-policy",
        policyId: "p1",
        name: "Policy",
        origin: "edit",
        policy: {
          id: "p1",
          rules: [{ sources: [{ id: "other" }], destinations: [] }],
        },
      },
    ];
    expect(subject().canDeleteGroup({ id: "g1", name: "Servers" })).toBe(true);
  });

  it("still refuses while a pending update-policy keeps referencing the group", () => {
    usage = [unused({ policies_count: 1 })];
    policies = [policyReferencing("g1")];
    changes = [
      {
        id: "c1",
        type: "update-policy",
        policyId: "p1",
        name: "Policy",
        origin: "edit",
        policy: policyReferencing("g1"),
      },
    ];
    expect(subject().canDeleteGroup({ id: "g1", name: "Servers" })).toBe(
      false,
    );
  });

  it("ignores a pending delete-policy for a policy that never referenced the group", () => {
    usage = [unused({ policies_count: 1 })];
    policies = [policyReferencing("other", "p2")];
    changes = [
      { id: "c1", type: "delete-policy", policyId: "p2", name: "Policy" },
    ];
    expect(subject().canDeleteGroup({ id: "g1", name: "Servers" })).toBe(
      false,
    );
  });

  it("subtracts members a pending update-group removes from peers_count", () => {
    usage = [unused({ peers_count: 2 })];
    changes = [
      {
        id: "c1",
        type: "update-group",
        groupId: "g1",
        name: "Servers",
        originalName: "Servers",
        peerIds: [],
        resourceIds: [],
        removedPeerIds: ["peer-1", "peer-2"],
      },
    ];
    expect(subject().canDeleteGroup({ id: "g1", name: "Servers" })).toBe(true);
  });
});

// What the toolbar's bulk Delete filters through. A draft-only group is Removed rather
// than deleted, so it needs no permission — nothing about it has reached the account.
describe("deletableGroupNodes", () => {
  it("keeps an unused API group and a draft group together", () => {
    const nodes = [
      groupNode({ id: "g1" }),
      groupNode({ id: undefined, name: "Draft group" }),
    ];
    expect(subject().deletableGroupNodes(nodes as never).length).toBe(2);
  });

  it("drops the API group but keeps the draft one when permission is missing", () => {
    permission.groups.delete = false;
    const nodes = [
      groupNode({ id: "g1" }),
      groupNode({ id: undefined, name: "Draft group" }),
    ];
    const kept = subject().deletableGroupNodes(nodes as never);
    expect(kept.length).toBe(1);
    expect((kept[0].data as { group: Group }).group.name).toBe("Draft group");
  });

  it("drops an in-use group out of a multi-selection", () => {
    usage = [unused({ policies_count: 2 })];
    const nodes = [groupNode({ id: "g1" }), groupNode({ id: "g1" })];
    expect(subject().deletableGroupNodes(nodes as never)).toEqual([]);
  });

  it("drops a node carrying no group at all", () => {
    const nodes = [{ id: "peer-1", type: "peerNode", data: {} }];
    expect(subject().deletableGroupNodes(nodes as never)).toEqual([]);
  });
});
