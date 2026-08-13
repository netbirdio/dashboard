/**
 * Output guardrails — vet what the model produces. Every tool_use must be a known
 * tool; `mutating` ones are flagged so the caller gates them behind confirmation.
 * (Tool results returning from the caller are untrusted data — the system prompt
 * tells the model never to obey them.)
 */
import { isKnownTool, isMutating } from "@/llm/tools.ts";
import type { LlmContentBlock } from "@/types.ts";

export interface ToolUseDecision {
  toolUseId: string;
  name: string;
  allowed: boolean;
  mutating: boolean;
}

/** Vet the tool_use blocks in an assistant message against the allowlist. */
export function vetToolUses(content: LlmContentBlock[]): ToolUseDecision[] {
  const decisions: ToolUseDecision[] = [];
  for (const block of content) {
    if (block.type !== "tool_use") continue;
    decisions.push({
      toolUseId: block.id,
      name: block.name,
      allowed: isKnownTool(block.name),
      mutating: isMutating(block.name),
    });
  }
  return decisions;
}
