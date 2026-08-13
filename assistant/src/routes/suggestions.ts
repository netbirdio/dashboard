/**
 * GET /v1/suggestions — curated starter prompts for the chat empty state, so the
 * dashboard doesn't hardcode them (configurable via SUGGESTIONS_STARTERS).
 * Conversation-aware follow-ups/quick-replies come from the chat stream instead
 * (see llm/suggestions.ts). Authenticated; not account-specific.
 */
import { loadConfig } from "@/config.ts";

export function suggestions(): Response {
  return Response.json({ starters: loadConfig().SUGGESTIONS_STARTERS });
}
