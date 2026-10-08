import { describe, expect, it } from "vitest";
import { Group } from "@/interfaces/Group";
import { Policy } from "@/interfaces/Policy";
import { duplicatePolicy } from "@/modules/access-control/policyDuplicate";

const devs = { id: "g-devs", name: "Devs" } as Group;
const servers = { id: "g-servers", name: "Servers" } as Group;

const policy: Policy = {
  id: "pol-1",
  name: "Devs to Servers",
  description: "Devs reach the servers over SSH and HTTPS",
  enabled: false,
  source_posture_checks: ["pc-1", "pc-2"],
  rules: [
    {
      id: "rule-1",
      name: "Devs to Servers",
      description: "Devs reach the servers over SSH and HTTPS",
      enabled: false,
      sources: [devs],
      destinations: [servers],
      bidirectional: false,
      action: "accept",
      protocol: "tcp",
      ports: ["22", "443"],
      port_ranges: [{ start: 8000, end: 8080 }],
      authorized_groups: { "g-devs": ["root"] },
    },
  ],
};

describe("duplicatePolicy", () => {
  it("drops the policy and rule ids so saving creates a new policy", () => {
    const duplicate = duplicatePolicy(policy, []);

    expect(duplicate.id).toBeUndefined();
    expect(duplicate.rules[0].id).toBeUndefined();
  });

  it("renames the duplicate against the names already taken", () => {
    expect(duplicatePolicy(policy, []).name).toBe("Devs to Servers (copy)");
    expect(
      duplicatePolicy(policy, ["Devs to Servers (copy)"]).name,
      "the first (copy) name is taken",
    ).toBe("Devs to Servers (copy 2)");
  });

  it("keeps every other setting of the policy and its rules", () => {
    const duplicate = duplicatePolicy(policy, []);

    const { id: _id, name: _name, rules, ...rest } = duplicate;
    const { id: _srcId, name: _srcName, rules: srcRules, ...srcRest } = policy;
    expect(rest).toEqual(srcRest);

    const { id: _ruleId, ...rule } = rules[0];
    const { id: _srcRuleId, ...srcRule } = srcRules[0];
    expect(rule).toEqual(srcRule);
  });

  it("leaves the source policy untouched", () => {
    duplicatePolicy(policy, []);

    expect(policy.id).toBe("pol-1");
    expect(policy.name).toBe("Devs to Servers");
    expect(policy.rules[0].id).toBe("rule-1");
  });
});
