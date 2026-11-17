import { isEqual } from "lodash";
import type { DraftChange } from "@/modules/control-center/draft/DraftChangesetContext";

const NONE: ReadonlySet<string> = new Set();

export const policyEntityKey = (policyId: string) => `policy:${policyId}`;
export const agentPolicyEntityKey = (agentPolicyId: string) =>
  `agent-policy:${agentPolicyId}`;

export function changeEntityKey(change: DraftChange): string {
  switch (change.type) {
    case "create-group":
      return `group:${change.clientId}`;
    case "update-group":
    case "delete-group":
      return `group:${change.groupId}`;
    case "create-policy":
      return policyEntityKey(change.clientId);
    case "update-policy":
    case "delete-policy":
      return policyEntityKey(change.policyId);
    case "create-network":
      return `network:${change.clientId}`;
    case "update-network":
    case "delete-network":
      return `network:${change.networkId}`;
    case "create-resource":
      return `resource:${change.clientId}`;
    case "update-resource":
    case "delete-resource":
      return `resource:${change.resourceId}`;
    case "create-router":
      return `router:${change.clientId}`;
    case "update-router":
      return `router:${change.routerId}`;
    case "install-peer":
      return `peer:${change.clientId}`;
    case "create-provider":
      return `provider:${change.clientId}`;
    case "update-provider":
    case "delete-provider":
      return `provider:${change.providerId}`;
    case "create-agent-policy":
      return agentPolicyEntityKey(change.clientId);
    case "update-agent-policy":
    case "delete-agent-policy":
      return agentPolicyEntityKey(change.agentPolicyId);
    case "update-user-groups":
      return `user:${change.userId}`;
  }
}

// Text the assistant reads can carry instructions, so the review must show
// which changes it made. A mark stays on an entity for the whole draft,
// whoever changes it afterwards.
export function markAssistantChanges(
  prev: readonly DraftChange[],
  next: readonly DraftChange[],
  marked: ReadonlySet<string>,
  assistantActing: boolean,
  replacedIds: ReadonlySet<string> = NONE,
): ReadonlySet<string> {
  const inherits =
    replacedIds.size > 0 &&
    prev.some(
      (c) => replacedIds.has(c.id) && marked.has(changeEntityKey(c)),
    );
  if (!assistantActing && !inherits) return marked;
  const before = new Map(prev.map((c) => [c.id, c]));
  let out: Set<string> | undefined;
  for (const change of next) {
    const key = changeEntityKey(change);
    if ((out ?? marked).has(key)) continue;
    const old = before.get(change.id);
    const mark = assistantActing
      ? !old || (old !== change && !isEqual(old, change))
      : !old;
    if (mark) (out ??= new Set(marked)).add(key);
  }
  return out ?? marked;
}

export function presentAssistantChanges(
  changes: readonly DraftChange[],
  marked: ReadonlySet<string>,
): ReadonlySet<string> {
  return new Set(
    changes.filter((c) => marked.has(changeEntityKey(c))).map((c) => c.id),
  );
}
