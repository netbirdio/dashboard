// The error taxonomy: the machine-readable `code` on a rejected request, and
// the classification of a provider call that failed mid-turn. Both map to a
// user-facing message, so both live here.
import { APICallError } from "ai";

// The wire `code` on an error body and the key into the message table below.
export type RejectionReason =
  | "cors"
  | "unauthorized"
  | "too_large"
  | "too_many_messages"
  | "invalid_json"
  | "invalid_body"
  | "guardrail_blocked"
  | "rate_limited"
  | "internal_error";

const MESSAGES: Record<RejectionReason, string> = {
  cors: "The assistant refused this request's origin. Ask your administrator to check the dashboard's assistant configuration.",
  unauthorized: "Your session expired. Reload the page and sign in again.",
  too_large: "This conversation is too long. Start a new chat to continue.",
  too_many_messages:
    "This conversation has too many messages. Start a new chat to continue.",
  invalid_json: "The assistant couldn't read that request. Starting a new chat usually clears it.",
  invalid_body: "The assistant couldn't read that request. Starting a new chat usually clears it.",
  guardrail_blocked:
    "That request was blocked before it reached the assistant. Try rewording it.",
  rate_limited:
    "You're sending requests faster than the assistant can take them. Wait a few seconds and try again.",
  internal_error:
    "The assistant service is temporarily unavailable. It may be restarting — try again in a minute.",
};

function errorBody(code: RejectionReason): { code: RejectionReason; message: string } {
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

export type LlmErrorKind =
  | "rate_limit"
  | "overloaded"
  | "auth"
  | "invalid_request"
  | "connection"
  | "unknown";

const FAILURE_MESSAGES: Record<LlmErrorKind, string> = {
  rate_limit:
    "The assistant is handling too many requests right now. Wait a few seconds and try again.",
  overloaded:
    "The assistant is busy at the moment. Try again in a few seconds — it usually clears quickly.",
  auth: "The assistant isn't set up correctly on this deployment. This one needs an administrator.",
  invalid_request:
    "Something in this conversation stopped the assistant from answering. Starting a new chat usually clears it.",
  connection:
    "The assistant couldn't be reached. Try again in a minute; if it keeps failing, let your administrator know.",
  unknown:
    "The assistant ran into an unexpected problem. Try again in a moment; if it keeps happening, let your administrator know.",
};

export function failureMessage(kind: LlmErrorKind): string {
  return FAILURE_MESSAGES[kind];
}

// A missing status code means the request never came back with a response —
// DNS, TLS, a reset socket or the SDK's own timeout — which reads to the user
// as "couldn't be reached", not as a bad request.
export function classifyLlmError(err: unknown): LlmErrorKind {
  if (!APICallError.isInstance(err)) return "unknown";
  const status = err.statusCode;
  if (status === undefined || status === 0) return "connection";
  if (status === 401 || status === 403) return "auth";
  if (status === 429) return "rate_limit";
  if (status >= 500) return "overloaded";
  if (status >= 400) return "invalid_request";
  return "unknown";
}
