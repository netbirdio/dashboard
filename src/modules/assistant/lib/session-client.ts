import { MODEL_REFUSALS, SESSION_UNAVAILABLE_CODE } from "./contract";

const REFUSAL_MESSAGES = new Set<string>(Object.values(MODEL_REFUSALS));

export const ERROR_MESSAGES = {
  sessionExpired: "Your session expired. Reload the page and sign in again.",
  wrongAddress:
    "The assistant service isn't available at this address. Ask your administrator to check the dashboard's assistant configuration.",
  tooManyRequests: "Too many requests — give it a moment and try again.",
  temporarilyUnavailable:
    "The assistant service is temporarily unavailable. It may be restarting — try again in a minute.",
  requestFailed:
    "The assistant couldn't complete that request. Try again in a moment.",
  timeout: "The assistant took too long to respond. Try again in a moment.",
  unreachable:
    "Can't reach the assistant service — it looks offline or is restarting. Try again in a minute, or contact your administrator if it keeps happening.",
  unexpected:
    "The assistant ran into an unexpected problem. Try again in a moment.",
  chatTooLong: "This chat is too long. Start a new one to continue.",
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

// Never echoes the body: it may be a proxy error page.
function fallbackFailure(status: number): string {
  if (status === 401) return ERROR_MESSAGES.sessionExpired;
  if (status === 404) return ERROR_MESSAGES.wrongAddress;
  if (status === 429) return ERROR_MESSAGES.tooManyRequests;
  if (status >= 500) return ERROR_MESSAGES.temporarilyUnavailable;
  return ERROR_MESSAGES.requestFailed;
}

export const serverFailure = (
  status: number,
  body: string,
): { code?: string; message: string } => {
  let parsed: { code?: unknown; message?: unknown } | null = null;
  try {
    parsed = JSON.parse(body);
  } catch {
    // Not JSON, e.g. a proxy error page.
  }
  if (typeof parsed?.code === "string" && parsed.code && typeof parsed.message === "string" && parsed.message) {
    return { code: parsed.code, message: parsed.message };
  }
  return { message: fallbackFailure(status) };
};

export function isUnresumableSession(err: unknown): boolean {
  return err instanceof AssistantHttpError && err.status === 403 && err.code === SESSION_UNAVAILABLE_CODE;
}

export function describeAssistantError(err: unknown): string {
  if (err instanceof AssistantHttpError) return err.message;
  if ((err as Error)?.name === "TimeoutError") return ERROR_MESSAGES.timeout;
  if (err instanceof TypeError) return ERROR_MESSAGES.unreachable;
  if ((err as Error)?.name === "SESSION_TOKEN_LIMIT_REACHED") return ERROR_MESSAGES.chatTooLong;
  const message = (err as Error)?.message;
  if (typeof message === "string" && REFUSAL_MESSAGES.has(message)) return message;
  // Raw error text can name internal hosts, providers or billing state, so it is never shown.
  return ERROR_MESSAGES.unexpected;
}
