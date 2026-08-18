// Every failure the chat can hit → one sentence the user can act on.
const ERROR_MESSAGES = {
  sessionExpired: "Your session expired. Reload the page and sign in again.",
  wrongAddress:
    "The assistant service isn't available at this address. Ask your administrator to check the dashboard's assistant configuration.",
  tooManyRequests: "Too many requests — give it a moment and try again.",
  temporarilyUnavailable:
    "The assistant service is temporarily unavailable. It may be restarting — try again in a minute.",
  requestFailed:
    "The assistant couldn't complete that request. Try again in a moment.",
  staleModel:
    "The model this chat was set to isn't available any more. Reopen the assistant to pick up the current one.",
  timeout: "The assistant took too long to respond. Try again in a moment.",
  unreachable:
    "Can't reach the assistant service — it looks offline or is restarting. Try again in a minute, or contact your administrator if it keeps happening.",
  unexpected:
    "The assistant ran into an unexpected problem. Try again in a moment.",
  unexpectedDetail: (detail: string) =>
    `The assistant ran into an unexpected problem (${detail}). Try again in a moment.`,
} as const;

export class AssistantHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = "AssistantHttpError";
  }
}

// Fallbacks for bodies the assistant server did not word itself (proxy error
// pages, older servers). Never echoes the body.
function fallbackFailure(status: number): string {
  if (status === 401) return ERROR_MESSAGES.sessionExpired;
  if (status === 404) return ERROR_MESSAGES.wrongAddress;
  if (status === 429) return ERROR_MESSAGES.tooManyRequests;
  if (status >= 500) return ERROR_MESSAGES.temporarilyUnavailable;
  return ERROR_MESSAGES.requestFailed;
}

// The server words every refusal it can (`{ code, message }`); that copy is
// shown as-is so the two sides cannot drift.
export const serverFailure = (
  status: number,
  body: string,
): { code?: string; message: string } => {
  let parsed: { code?: string; message?: string; error?: string } | null = null;
  try {
    parsed = JSON.parse(body);
  } catch {
    // not JSON — a proxy error page
  }
  if (parsed?.code && parsed?.message) {
    return { code: parsed.code, message: parsed.message };
  }
  // Pre-`{code, message}` servers signal a stale model id this way.
  if (status === 400 && parsed?.error === "unknown model") {
    return { code: "unknown_model", message: ERROR_MESSAGES.staleModel };
  }
  return { message: fallbackFailure(status) };
};

export function describeAssistantError(err: unknown): string {
  if (err instanceof AssistantHttpError) return err.message;
  if ((err as Error)?.name === "TimeoutError") return ERROR_MESSAGES.timeout;
  if (err instanceof TypeError) return ERROR_MESSAGES.unreachable;

  const detail = (err as Error)?.message;
  if (detail) return ERROR_MESSAGES.unexpectedDetail(detail);
  return ERROR_MESSAGES.unexpected;
}
