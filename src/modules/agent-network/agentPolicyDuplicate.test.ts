import { describe, expect, it } from "vitest";
import { duplicateAgentPolicy } from "@/modules/agent-network/agentPolicyDuplicate";
import { AgentPolicy } from "@/modules/agent-network/data/mockData";

const policy: AgentPolicy = {
  id: "pol-1",
  name: "Engineering → OpenAI",
  description: "Engineers call OpenAI under production guardrails",
  enabled: false,
  sourceGroups: ["g-eng"],
  destinationProviderIds: ["p-openai", "p-anthropic"],
  guardrailIds: ["gr-models"],
  limits: {
    tokenLimit: {
      enabled: true,
      groupCap: 1_000_000,
      userCap: 50_000,
      windowSeconds: 86_400,
    },
    budgetLimit: {
      enabled: true,
      groupCapUsd: 500,
      userCapUsd: 25,
      windowSeconds: 2_592_000,
    },
  },
};

describe("duplicateAgentPolicy", () => {
  it("drops the id so saving creates a new policy", () => {
    expect(duplicateAgentPolicy(policy, [])).not.toHaveProperty("id");
  });

  it("renames the duplicate against the names already taken", () => {
    expect(duplicateAgentPolicy(policy, []).name).toBe(
      "Engineering → OpenAI (copy)",
    );
    expect(
      duplicateAgentPolicy(policy, ["Engineering → OpenAI (copy)"]).name,
      "the first (copy) name is taken",
    ).toBe("Engineering → OpenAI (copy 2)");
  });

  it("keeps groups, providers, guardrails, limits and state", () => {
    const { id: _id, name: _name, ...source } = policy;
    const { name: _duplicateName, ...duplicate } = duplicateAgentPolicy(
      policy,
      [],
    );

    expect(duplicate).toEqual(source);
  });

  it("does not share lists or limits with the source policy", () => {
    const duplicate = duplicateAgentPolicy(policy, []);
    duplicate.sourceGroups.push("g-other");
    duplicate.limits.tokenLimit.userCap = 1;

    expect(policy.sourceGroups).toEqual(["g-eng"]);
    expect(policy.limits.tokenLimit.userCap).toBe(50_000);
  });
});
