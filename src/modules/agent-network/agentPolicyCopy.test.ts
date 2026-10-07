import { describe, expect, it } from "vitest";
import { copyOfAgentPolicy } from "@/modules/agent-network/agentPolicyCopy";
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

describe("copyOfAgentPolicy", () => {
  it("drops the id so saving creates a new policy", () => {
    expect(copyOfAgentPolicy(policy, [])).not.toHaveProperty("id");
  });

  it("renames the copy against the names already taken", () => {
    expect(copyOfAgentPolicy(policy, []).name).toBe(
      "Engineering → OpenAI (copy)",
    );
    expect(
      copyOfAgentPolicy(policy, ["Engineering → OpenAI (copy)"]).name,
      "the first copy name is taken",
    ).toBe("Engineering → OpenAI (copy 2)");
  });

  it("keeps groups, providers, guardrails, limits and state", () => {
    const { id: _id, name: _name, ...source } = policy;
    const { name: _copyName, ...copy } = copyOfAgentPolicy(policy, []);

    expect(copy).toEqual(source);
  });

  it("does not share lists or limits with the source policy", () => {
    const copy = copyOfAgentPolicy(policy, []);
    copy.sourceGroups.push("g-other");
    copy.limits.tokenLimit.userCap = 1;

    expect(policy.sourceGroups).toEqual(["g-eng"]);
    expect(policy.limits.tokenLimit.userCap).toBe(50_000);
  });
});
