import { copyName } from "@utils/copyName";
import { AgentPolicy } from "@/modules/agent-network/data/mockData";

/**
 * Builds an unsaved copy of an agent policy to seed the create modal: every
 * setting is kept, the id is dropped so the save creates a new policy, and
 * the name gets a copy suffix that is free among `takenNames`. Source groups,
 * providers and guardrails stay referenced, not duplicated.
 */
export function copyOfAgentPolicy(
  policy: AgentPolicy,
  takenNames: string[],
): Omit<AgentPolicy, "id"> {
  const { id: _id, ...rest } = policy;
  return {
    ...rest,
    name: copyName(policy.name, takenNames),
    sourceGroups: [...policy.sourceGroups],
    destinationProviderIds: [...policy.destinationProviderIds],
    guardrailIds: [...policy.guardrailIds],
    limits: {
      tokenLimit: { ...policy.limits.tokenLimit },
      budgetLimit: { ...policy.limits.budgetLimit },
    },
  };
}
