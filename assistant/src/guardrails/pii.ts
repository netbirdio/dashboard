/**
 * Server-side PII backstop. The frontend pseudonymizes tool results AND the user's
 * own text — names from the data it has loaded, addresses and emails by pattern —
 * via src/privacy/redaction.ts. This is defense-in-depth: it scrubs structural
 * identifiers a user may type into a prompt — emails, IPv4/IPv6 addresses, CIDR
 * ranges — before the model sees them, in case the frontend missed one.
 *
 * A value that reaches here is therefore one the frontend did NOT tokenize, and so
 * one the model cannot match against account data: that only works in the
 * frontend's namespace, where the same real value mints the same token whether it
 * came from a tool result or from what the user typed. The system prompt says so,
 * so the model asks for a name instead of claiming it looked.
 *
 * REVERSIBLE, and per request. The model gets `{REDACTED_IP_1}`, reasons about it
 * and hands it back; the route restores real values on everything it streams out,
 * so the user reads the address they typed and a tool call carries a usable one.
 * A one-way marker looked safe but wasn't free: the model echoed "[redacted-ip]"
 * into answers, and a tool input built from one was unusable.
 *
 * The mapping lives in ONE vault, for the life of ONE request — never persisted,
 * never logged, never sent anywhere. That keeps the service stateless: a later
 * turn re-scrubs the transcript the caller resends and mints its own tokens.
 *
 * Token names are deliberately unlike the frontend's (`{IP_1}`): both sides
 * rewrite the same stream, and each must only ever touch its own tokens.
 *
 * CONSERVATIVE by design: only high-confidence patterns, no bare domains or
 * hostnames, so ordinary text and documentation URLs survive. It cannot catch
 * resource *names* (nothing structural to match) — that's the frontend's job.
 */
import { countPiiRedaction } from "@/telemetry/metrics.ts";
import type { LlmContentBlock, LlmMessage } from "@/types.ts";

type PiiKind = "IP" | "CIDR" | "EMAIL";

// CIDR before bare IPv4 so the mask isn't left dangling.
const PATTERNS: readonly [RegExp, PiiKind][] = [
  [/\b(?:\d{1,3}\.){3}\d{1,3}\/\d{1,2}\b/g, "CIDR"],
  [/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "IP"],
  // IPv6, uncompressed (>=3 hextet groups, so short hex tokens like "a:b:c" don't
  // match). Heavily `::`-compressed forms rely on the frontend's pseudonymizer.
  [/\b(?:[0-9a-fA-F]{1,4}:){3,}[0-9a-fA-F]{1,4}\b/g, "IP"],
  [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "EMAIL"],
];

/** Every token this module can mint. Used to restore, and to hold back a partial one. */
export const TOKEN_PATTERN = /\{REDACTED_(?:IP|CIDR|EMAIL)_\d+\}/g;

/**
 * The tail of a chunk that might be the START of a token (`…{REDACTED_I`).
 * Streaming has to hold that back rather than emit half a token.
 */
const PARTIAL_TOKEN_PATTERN = /\{[A-Z_]*\d*$/;

export interface PiiVault {
  /** Real values → tokens. Stable within the vault: same value, same token. */
  scrub(text: string): string;
  /** Tokens → real values. Leaves alone any token this vault didn't mint. */
  restore(text: string): string;
  /**
   * `restore` through a whole SSE payload. Skips `thinking` blocks: Anthropic
   * rejects a tool loop whose thinking text no longer matches its signature.
   */
  restoreDeep<T>(value: T): T;
  /** How many distinct values are held (0 means nothing was scrubbed). */
  readonly size: number;
}

export function createPiiVault(): PiiVault {
  const forward = new Map<string, string>();
  const reverse = new Map<string, string>();
  const counters = new Map<PiiKind, number>();

  const mint = (kind: PiiKind, real: string): string => {
    countPiiRedaction(kind);
    const key = `${kind} ${real}`;
    const existing = forward.get(key);
    if (existing) return existing;
    const n = (counters.get(kind) ?? 0) + 1;
    counters.set(kind, n);
    const token = `{REDACTED_${kind}_${n}}`;
    forward.set(key, token);
    reverse.set(token, real);
    return token;
  };

  const restore = (text: string): string => {
    if (reverse.size === 0 || !text.includes("{REDACTED_")) return text;
    return text.replace(TOKEN_PATTERN, (t) => reverse.get(t) ?? t);
  };

  const restoreDeep = <T,>(value: T): T => {
    if (typeof value === "string") return restore(value) as T;
    if (Array.isArray(value)) return value.map((v) => restoreDeep(v)) as T;
    if (value && typeof value === "object") {
      const src = value as Record<string, unknown>;
      if (src.type === "thinking") return value;
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(src)) out[k] = restoreDeep(v);
      return out as T;
    }
    return value;
  };

  return {
    scrub(text) {
      let out = text;
      for (const [re, kind] of PATTERNS) {
        out = out.replace(re, (match) => mint(kind, match));
      }
      return out;
    },
    restore,
    restoreDeep,
    get size() {
      return reverse.size;
    },
  };
}

/**
 * Scrub a transcript on its way to the model.
 *
 * Both roles, unlike the one-way version this replaces: because real values are
 * restored on the way OUT, the assistant turns the caller resends carry them too
 * — in text and in the tool inputs the model built. Same vault, so a value keeps
 * one token across the whole request.
 */
export function scrubTranscript(
  messages: LlmMessage[],
  vault: PiiVault,
): LlmMessage[] {
  const scrubBlock = (b: LlmContentBlock): LlmContentBlock => {
    if (b.type === "text") return { ...b, text: vault.scrub(b.text) };
    if (b.type === "tool_result") return { ...b, content: vault.scrub(b.content) };
    // Thinking is carried verbatim (signature); tool inputs are scrubbed field
    // by field so a restored address the model passed back is a token again.
    if (b.type === "tool_use") return { ...b, input: scrubValue(b.input, vault) };
    return b;
  };

  return messages.map((m) =>
    typeof m.content === "string"
      ? { ...m, content: vault.scrub(m.content) }
      : { ...m, content: m.content.map(scrubBlock) },
  );
}

function scrubValue(value: unknown, vault: PiiVault): unknown {
  if (typeof value === "string") return vault.scrub(value);
  if (Array.isArray(value)) return value.map((v) => scrubValue(v, vault));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        scrubValue(v, vault),
      ]),
    );
  }
  return value;
}

/**
 * Restores tokens across a stream of deltas, where a token can straddle two
 * chunks. Holds back a trailing partial token until the next chunk completes it;
 * `flush` releases whatever is left when the stream ends.
 */
export function createRestoreStream(vault: PiiVault) {
  let held = "";
  return {
    push(delta: string): string {
      const text = held + delta;
      const partial = text.match(PARTIAL_TOKEN_PATTERN);
      // A `{` that never becomes a token still has to go out eventually — that's
      // what flush is for. Cap the hold so an unclosed brace can't swallow the
      // rest of an answer.
      if (partial && partial[0].length < 24) {
        held = partial[0];
        return vault.restore(text.slice(0, text.length - held.length));
      }
      held = "";
      return vault.restore(text);
    },
    flush(): string {
      const rest = held;
      held = "";
      return rest ? vault.restore(rest) : "";
    },
  };
}
