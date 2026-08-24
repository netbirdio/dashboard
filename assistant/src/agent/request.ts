// Shape and size of an incoming chat request. Rejections here never reach the
// model: they are transport-level 4xx, so the caps live with the parser that
// enforces them and index.ts reads MAX_REQUEST_BYTES off the same constant.
import { safeValidateUIMessages, type UIMessage } from "ai";
import { z } from "zod";
import type { RejectionReason } from "@/errors.ts";

export const MAX_MESSAGES = 100;
export const MAX_REQUEST_BYTES = 262_144;

// The AI SDK transport's request body, plus our own fields.
const BodySchema = z.object({
  id: z.string().max(128).optional(),
  messages: z.array(z.unknown()).min(1),
  pageContext: z.string().max(4000).optional(),
});

export interface ChatBody {
  id?: string;
  pageContext?: string;
  messages: UIMessage[];
}

export type ValidationResult =
  | { ok: true; value: ChatBody }
  | { ok: false; status: number; error: string; reason: RejectionReason };

export async function validateChatRequest(req: Request): Promise<ValidationResult> {
  const raw = await req.arrayBuffer();
  // Belt and braces: Bun rejects an oversized body at the transport layer
  // first, so this is only reachable when the app is driven directly.
  if (raw.byteLength > MAX_REQUEST_BYTES) {
    return { ok: false, status: 413, error: "request too large", reason: "too_large" };
  }

  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    return { ok: false, status: 400, error: "malformed JSON", reason: "invalid_json" };
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, status: 400, error: "invalid request body", reason: "invalid_body" };
  }
  if (parsed.data.messages.length > MAX_MESSAGES) {
    return { ok: false, status: 413, error: "too many messages", reason: "too_many_messages" };
  }

  const messages = await safeValidateUIMessages({ messages: parsed.data.messages });
  if (!messages.success) {
    return { ok: false, status: 400, error: "invalid messages", reason: "invalid_body" };
  }
  return { ok: true, value: { ...parsed.data, messages: messages.data } };
}
