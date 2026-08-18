import type { RejectionReason } from "@/instrumentation/metrics.ts";

const MESSAGES: Record<RejectionReason, string> = {
  cors: "The assistant refused this request's origin. Ask your administrator to check the dashboard's assistant configuration.",
  unauthorized: "Your session expired. Reload the page and sign in again.",
  rate_limited: "Too many requests — give it a moment and try again.",
  usage_limit: "The AI assistant has reached its usage limit for this account.",
  too_large: "This conversation is too long. Start a new chat to continue.",
  too_many_messages:
    "This conversation has too many messages. Start a new chat to continue.",
  invalid_json: "The assistant couldn't read that request. Starting a new chat usually clears it.",
  invalid_body: "The assistant couldn't read that request. Starting a new chat usually clears it.",
  guardrail_blocked:
    "That request was blocked before it reached the assistant. Try rewording it.",
  internal_error:
    "The assistant service is temporarily unavailable. It may be restarting — try again in a minute.",
  other: "The assistant couldn't complete that request. Try again in a moment.",
};

export function errorBody(code: RejectionReason): { code: RejectionReason; message: string } {
  return { code, message: MESSAGES[code] };
}

interface ErrorOptions {
  detail?: string;
  requestId?: string;
}

export function errorResponse(
  code: RejectionReason,
  status: number,
  { detail, requestId }: ErrorOptions = {},
): Response {
  if (detail) {
    console.error(`[${requestId ?? "-"}] ${code}: ${detail}`);
  }
  return Response.json(
    { ...errorBody(code), ...(requestId ? { requestId } : {}) },
    { status },
  );
}
