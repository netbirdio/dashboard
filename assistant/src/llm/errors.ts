/**
 * Provider-neutral LLM failures, and what to tell the user about them.
 *
 * The stream used to end with `{"message": "stream failed"}` — true, useless,
 * and identical whether the provider was overloaded, the key was wrong, or the
 * conversation had outgrown its context. The user can't tell whether to retry,
 * start a new chat, or fetch an administrator.
 *
 * So the adapter classifies (it owns the SDK's typed errors — see
 * llm/anthropic.ts) and this module words it. Two rules for the wording: say
 * what the user can DO, and never leak internals — no provider names, no status
 * codes, no exception text. The `code` rides along separately for logs and
 * metrics, which is where that detail belongs.
 */

export type LlmErrorKind =
  | "rate_limit"
  | "overloaded"
  | "timeout"
  | "connection"
  | "auth"
  | "invalid_request"
  | "aborted"
  | "unknown";

export class LlmError extends Error {
  constructor(
    readonly kind: LlmErrorKind,
    /** Whether the same request has a fair chance of working again. */
    readonly retryable: boolean,
    /** Internal detail, for logs only. Never sent to the caller. */
    message: string,
  ) {
    super(message);
    this.name = "LlmError";
  }
}

const MESSAGES: Record<LlmErrorKind, string> = {
  rate_limit:
    "The assistant is handling too many requests right now. Wait a few seconds and try again.",
  overloaded:
    "The assistant is busy at the moment. Try again in a few seconds — it usually clears quickly.",
  timeout: "The assistant took too long to answer. Try again.",
  connection:
    "The assistant couldn't be reached. Try again in a minute; if it keeps failing, let your administrator know.",
  auth: "The assistant isn't set up correctly on this deployment. This one needs an administrator.",
  invalid_request:
    "Something in this conversation stopped the assistant from answering. Starting a new chat usually clears it.",
  aborted: "The assistant stopped before finishing.",
  unknown:
    "The assistant ran into an unexpected problem. Try again in a moment; if it keeps happening, let your administrator know.",
};

export interface UserFacingFailure {
  /** For the user. Actionable, and free of internals. */
  message: string;
  /** For logs, metrics and the caller's own telemetry. */
  code: LlmErrorKind;
  retryable: boolean;
}

/**
 * The failure as the user should hear it. `hadAnswer` says whether anything had
 * already been streamed: "the answer was cut short" is a different situation
 * from "nothing happened", and only the caller of the stream knows which it was.
 */
export function describeFailure(
  err: unknown,
  hadAnswer = false,
): UserFacingFailure {
  const kind = err instanceof LlmError ? err.kind : "unknown";
  const retryable = err instanceof LlmError ? err.retryable : true;
  const base = MESSAGES[kind];
  return {
    code: kind,
    retryable,
    message: hadAnswer ? `That answer was cut short. ${base}` : base,
  };
}
