import { describe, expect, it } from "vitest";
import { Group } from "@/interfaces/Group";
import {
  patchGroupInPolicies,
  sameGroupMatcher,
} from "./policy-group-sync";

const policyItem = (sources: (Group | string)[], destinations: (Group | string)[]) => ({
  id: "policy-new-1",
  data: {
    policy: {
      id: "new-1",
      name: "P",
      enabled: true,
      rules: [{ name: "P", enabled: true, sources, destinations }],
    },
  },
});

const rename = (to: string) => (g: Group) => ({ ...g, name: to });

describe("patchGroupInPolicies", () => {
  it("renames a draft group inside policy sources and destinations", () => {
    const items = [
      policyItem(
        [{ name: "Ops", peers_count: 0 } as Group],
        [{ name: "Ops", peers_count: 0 } as Group, { id: "g2", name: "Other" } as Group],
      ),
    ];
    const next = patchGroupInPolicies(
      items,
      sameGroupMatcher({ name: "Ops" } as Group),
      rename("Ops-Renamed"),
    );
    const rule = (next[0].data.policy as any).rules[0];
    expect(rule.sources[0].name).toBe("Ops-Renamed");
    expect(rule.destinations[0].name).toBe("Ops-Renamed");
    expect(rule.destinations[1].name).toBe("Other");
  });

  it("matches existing groups by id, not name", () => {
    const items = [
      policyItem([{ id: "g1", name: "Ops" } as Group], [{ name: "Ops" } as Group]),
    ];
    const next = patchGroupInPolicies(
      items,
      sameGroupMatcher({ id: "g1", name: "Ops" } as Group),
      rename("New"),
    );
    const rule = (next[0].data.policy as any).rules[0];
    expect(rule.sources[0].name).toBe("New");
    // The id-less draft group with the same name is a DIFFERENT group.
    expect(rule.destinations[0].name).toBe("Ops");
  });

  it("returns the same array identity when nothing matches", () => {
    const items = [policyItem([{ id: "g1", name: "Ops" } as Group], [])];
    const next = patchGroupInPolicies(
      items,
      sameGroupMatcher({ id: "nope" } as Group),
      rename("X"),
    );
    expect(next).toBe(items);
    expect(next[0]).toBe(items[0]);
  });

  it("leaves items without a policy untouched (same identity)", () => {
    const plain = { id: "group-1", data: { group: { name: "Ops" } } };
    const items = [plain, policyItem([{ name: "Ops" } as Group], [])];
    const next = patchGroupInPolicies(
      items as any,
      sameGroupMatcher({ name: "Ops" } as Group),
      rename("New"),
    );
    expect(next[0]).toBe(plain);
    expect((next[1].data!.policy as any).rules[0].sources[0].name).toBe("New");
  });

  it("patches member counts without touching other fields", () => {
    const items = [
      policyItem([{ name: "Ops", peers_count: 1 } as Group], []),
    ];
    const next = patchGroupInPolicies(
      items,
      sameGroupMatcher({ name: "Ops" } as Group),
      (g) => ({ ...g, peers_count: (g.peers_count || 0) + 1 }),
    );
    const src = (next[0].data.policy as any).rules[0].sources[0];
    expect(src.peers_count).toBe(2);
    expect(src.name).toBe("Ops");
  });

  it("skips string entries in the sides", () => {
    const items = [policyItem(["g1"], [{ name: "Ops" } as Group])];
    const next = patchGroupInPolicies(
      items,
      sameGroupMatcher({ name: "Ops" } as Group),
      rename("New"),
    );
    const rule = (next[0].data.policy as any).rules[0];
    expect(rule.sources[0]).toBe("g1");
    expect(rule.destinations[0].name).toBe("New");
  });
});
