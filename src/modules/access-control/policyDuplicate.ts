import { copyName } from "@utils/copyName";
import { Policy } from "@/interfaces/Policy";

/**
 * Builds an unsaved duplicate of an access control policy to seed the create
 * modal: every setting is kept, the policy and rule ids are dropped so the
 * save creates a new policy, and the name gets a "(copy)" suffix that is free
 * among `takenNames`. Posture checks, groups and resources stay referenced,
 * not duplicated.
 */
export function duplicatePolicy(policy: Policy, takenNames: string[]): Policy {
  return {
    ...policy,
    id: undefined,
    name: copyName(policy.name, takenNames),
    rules: (policy.rules ?? []).map((rule) => ({ ...rule, id: undefined })),
  };
}
