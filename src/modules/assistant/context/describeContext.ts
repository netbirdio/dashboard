/**
 * The context chip, as one line for the model.
 *
 * Attached to the outgoing user turn, never to the bubble the user sees: the
 * thread renders what they typed, the wire carries what they typed plus where
 * they were. Ids go through the same `Redactor` the tools use, so the peer
 * named here is the same `{PEER_1}` a later `list_peers` returns and the model
 * can join the two without either ever holding a real name.
 */
import type { PlaceholderType } from "../privacy/redaction";
import type { Redactor } from "../privacy/redaction";
import type { AssistantContextEntry } from "./AssistantContextProvider";

/** Context kinds that name a resource → the placeholder type to mint. */
const HANDLES: Partial<Record<AssistantContextEntry["type"], PlaceholderType>> =
  {
    peer: "peer",
    group: "group",
    network: "network",
    user: "user",
  };

/**
 * `null` when there's nothing worth saying. The tag marks it as the dashboard
 * speaking rather than the user; `system.md` carries the rules for reading it.
 */
export function describeContext(
  entry: AssistantContextEntry | null,
  redactor: Redactor,
  name?: string,
): string | null {
  if (!entry) return null;

  const handleType = HANDLES[entry.type];

  // Attributes, not prose: what it means is in the system prompt, which the
  // model reads once per conversation instead of once per message. Repeating
  // the explanation on every turn buys nothing and costs tokens.
  if (handleType && entry.id) {
    return `<page-context kind="${entry.type}" ref="${redactor.handle(
      handleType,
      entry.id,
      name,
    )}" />`;
  }

  return entry.label
    ? `<page-context kind="${entry.type}" page="${entry.label}" />`
    : null;
}
