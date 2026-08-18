/**
 * The assistant server's wire types, mirrored. Kept in sync by hand with
 * netbird-assistant `src/types.ts` — there's no shared package yet, and adding
 * one is only worth it once a second caller exists.
 *
 * Note `toolUseId` is camelCase on the wire (the server's own neutral shape),
 * not the Anthropic `tool_use_id`.
 */
export type LlmContentBlock =
  | { type: "text"; text: string }
  /** The model's own reasoning, signature included (see the server's types). */
  | { type: "thinking"; thinking: string; signature: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | {
      type: "tool_result";
      toolUseId: string;
      content: string;
      isError?: boolean;
    };

export interface ChatMessage {
  role: "user" | "assistant";
  content: string | LlmContentBlock[];
}
