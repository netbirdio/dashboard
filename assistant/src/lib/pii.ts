import type { UIMessage, UIMessageChunk } from "ai";
import { LRUCache } from "lru-cache";
import { loadConfig } from "@/config.ts";

/**
 * The server-side PII backstop, behind the dashboard's own redaction.
 *
 * The dashboard pseudonymizes everything it can recognise (account data by
 * catalog, structural values by pattern) before a request leaves the browser.
 * What it cannot recognise — a person's name in free text, above all — reaches
 * this service in the clear. Before the transcript goes to the model provider,
 * Presidio's analyzer finds those values and this module swaps them for
 * `[REDACTED_<TYPE>_n]` tokens; on the way back, the stream is restored so the
 * user reads their own words, not tokens.
 *
 * The vault lives for ONE request: never persisted, never logged, never sent
 * anywhere. Its tokens use a namespace of their own so they can never collide
 * with the dashboard's `[PEER_1]`-style tokens, which this service must pass
 * through untouched.
 *
 * The one thing that outlives a request is the analysis cache, and it holds no
 * plaintext either: its keys are hashes of the analysed text and its values are
 * offsets and entity types.
 */

export interface PresidioFinding {
  entity_type: string;
  start: number;
  end: number;
  score: number;
}

/*
  Analysis results are pure functions of the text, and every chat round resends
  the whole transcript — without a cache each old message would hit the
  analyzer again on every round.

  Keyed by a hash of the text, never the text: the entries outlive the request
  that made them, and plaintext keys would leave up to 500 unredacted user
  messages in RSS — and in any heap dump — for the process lifetime. Wyhash
  rather than SHA-256 because this key guards a cache, not a secret, and it is
  computed for every text part of every turn. The TTL bounds how long a finding
  set survives a conversation that has long since ended.
*/
const ANALYSIS_TTL_MS = 60 * 60 * 1_000;
const analysisCache = new LRUCache<string, PresidioFinding[]>({
  max: 500,
  ttl: ANALYSIS_TTL_MS,
});

const cacheKey = (text: string): string => Bun.hash.wyhash(text).toString(36);

/*
  Circuit breaker on the analyzer. A down analyzer would otherwise be probed
  once per text part per turn — a connection error (or worse, a full timeout)
  each, and a log line each. One failure opens the breaker: calls skip the
  network for a cooldown and a single line marks the outage instead of a
  stream of them.
*/
const BREAKER_MS = 30_000;
let breakerUntil = 0;

export function resetPiiCacheForTests(): void {
  analysisCache.clear();
  breakerUntil = 0;
}

export function piiCacheKeysForTests(): string[] {
  return [...analysisCache.keys()];
}

/*
  Fails OPEN, like the input guardrail: the backstop reduces what reaches the
  model provider, and refusing to chat whenever the analyzer hiccups would turn
  a privacy enhancement into an outage. The failure is counted and logged —
  without the text.
*/
export async function analyzeText(text: string): Promise<PresidioFinding[]> {
  const cfg = loadConfig();
  const key = cacheKey(text);
  const cached = analysisCache.get(key);
  if (cached) return cached;
  if (Date.now() < breakerUntil) return [];
  try {
    const res = await fetch(`${cfg.PRESIDIO_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        language: "en",
        score_threshold: cfg.PRESIDIO_SCORE_THRESHOLD,
        entities: cfg.PRESIDIO_ENTITIES,
      }),
      signal: AbortSignal.timeout(cfg.PRESIDIO_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`analyzer returned ${res.status}`);
    const findings = (await res.json()) as PresidioFinding[];
    analysisCache.set(key, findings);
    return findings;
  } catch (err) {
    console.error(
      `pii backstop unavailable at ${cfg.PRESIDIO_URL} (${(err as Error)?.message ?? err}) — ` +
        `continuing unscrubbed, retrying in ${BREAKER_MS / 1000}s. ` +
        "Start the analyzer with: docker compose -f docker/docker-compose.yml up -d presidio",
    );
    breakerUntil = Date.now() + BREAKER_MS;
    return [];
  }
}

const tokenKind = (entityType: string): string =>
  `REDACTED_${entityType.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`;

export class PiiVault {
  private counters = new Map<string, number>();
  private forward = new Map<string, string>();
  private reverse = new Map<string, string>();
  /*
    `restoreText` runs once per stream chunk of a reply, so the alternation is
    compiled once and thrown away only when `mint` adds a token to it.
  */
  private restorePattern: RegExp | null = null;

  get size(): number {
    return this.reverse.size;
  }

  private mint(entityType: string, value: string): string {
    const kind = tokenKind(entityType);
    const key = `${kind} ${value}`;
    const existing = this.forward.get(key);
    if (existing) return existing;
    const n = (this.counters.get(kind) ?? 0) + 1;
    this.counters.set(kind, n);
    const token = `[${kind}_${n}]`;
    this.forward.set(key, token);
    this.reverse.set(token, value);
    this.restorePattern = null;
    return token;
  }

  /*
    Findings are minted left to right so numbering is stable for a given
    transcript, then replaced right to left so earlier offsets stay valid.
    Overlapping findings keep the first (Presidio can report both an address
    and a location over the same span).
  */
  applyFindings(text: string, findings: PresidioFinding[]): string {
    const kept: PresidioFinding[] = [];
    let lastEnd = -1;
    for (const f of [...findings].sort((a, b) => a.start - b.start || b.end - a.end)) {
      if (f.start < lastEnd || f.start < 0 || f.end > text.length || f.end <= f.start) continue;
      kept.push(f);
      lastEnd = f.end;
    }
    const tokens = kept.map((f) => this.mint(f.entity_type, text.slice(f.start, f.end)));
    let out = text;
    for (let i = kept.length - 1; i >= 0; i--) {
      out = out.slice(0, kept[i]!.start) + tokens[i] + out.slice(kept[i]!.end);
    }
    return out;
  }

  async scrubText(text: string): Promise<string> {
    if (!text.trim()) return text;
    return this.applyFindings(text, await analyzeText(text));
  }

  /*
    Longest body first so `[REDACTED_PERSON_10]` is not eaten by the alternative
    for `[REDACTED_PERSON_1]`.
  */
  private pattern(): RegExp {
    if (!this.restorePattern) {
      const bodies = [...this.reverse.keys()]
        .map((token) => token.slice(1, -1))
        .sort((a, b) => b.length - a.length);
      const body = `(${bodies.join("|")})`.replace(/_/g, "[ _]");
      this.restorePattern = new RegExp(`\\[\\s*${body}\\s*\\]|\\b${body}\\b`, "gi");
    }
    return this.restorePattern;
  }

  /*
    Tolerant the same way the dashboard's restore is: models drop the brackets and
    write spaces for underscores. Only tokens actually minted are matched, so
    the tolerance can't touch ordinary prose.
  */
  restoreText = (text: string): string => {
    if (this.reverse.size === 0) return text;
    return text.replace(this.pattern(), (whole, braced?: string, bare?: string) => {
      const matched = braced ?? bare;
      if (!matched) return whole;
      const canonical = `[${matched.replace(/ /g, "_").toUpperCase()}]`;
      return this.reverse.get(canonical) ?? whole;
    });
  };

  restoreDeep = (value: unknown): unknown => {
    if (typeof value === "string") return this.restoreText(value);
    if (Array.isArray(value)) return value.map((v) => this.restoreDeep(v));
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([k, v]) => [
          k,
          this.restoreDeep(v),
        ]),
      );
    }
    return value;
  };
}

/*
  Only text parts of user and assistant turns are scrubbed. Reasoning parts are
  signature-protected by the provider and must pass through byte-identical;
  tool parts carry data the dashboard already redacted.

  The analyzer is asked about every text part at once, then minting walks the
  transcript in message order off the warm cache. The two passes are separate
  because the numbering must be identical across the resends of one
  conversation: renumber it and the provider's prompt cache misses and the model
  sees tokens that moved under it. A cold 100-message transcript would otherwise
  be 100 sequential round-trips before the model call starts.
*/
export async function scrubMessages(messages: UIMessage[], vault: PiiVault): Promise<void> {
  const pending = new Set<string>();
  for (const message of messages) {
    if (message.role !== "user" && message.role !== "assistant") continue;
    for (const part of message.parts) {
      if (part.type === "text" && part.text?.trim()) pending.add(part.text);
    }
  }
  /*
    Each analysis already fails open on its own; the catch is only here so that
    one unexpected rejection cannot take the whole fan-out with it.
  */
  await Promise.all([...pending].map((text) => analyzeText(text).catch(() => [])));

  for (const message of messages) {
    if (message.role !== "user" && message.role !== "assistant") continue;
    for (const part of message.parts) {
      if (part.type === "text" && part.text) {
        part.text = await vault.scrubText(part.text);
      }
    }
  }
}

/*
  A token can split across two stream chunks (`…[REDACTED_I` / `P_1]…`), so a
  chunk that ends in what could be the start of a token is held back until the
  next chunk (or the part's end) settles it. The hold is capped: past the
  longest possible token, the bracket was just a bracket.
*/
const MAX_HOLD = 48;

function partialTokenStart(buf: string): number {
  const idx = buf.lastIndexOf("[");
  if (idx === -1 || buf.length - idx > MAX_HOLD) return -1;
  if (buf.indexOf("]", idx) !== -1) return -1;
  return /^\[[A-Za-z0-9_ ]*$/.test(buf.slice(idx)) ? idx : -1;
}

class StreamRestorer {
  private held = "";
  constructor(private readonly vault: PiiVault) {}

  push(chunk: string): string {
    const buf = this.held + chunk;
    const idx = partialTokenStart(buf);
    this.held = idx === -1 ? "" : buf.slice(idx);
    return this.vault.restoreText(idx === -1 ? buf : buf.slice(0, idx));
  }

  flush(): string {
    const out = this.vault.restoreText(this.held);
    this.held = "";
    return out;
  }
}

/*
  Restores the vault's tokens in everything the client will see: streamed text
  and reasoning, tool inputs (the model may pass a token into a client tool),
  server tool outputs, custom data parts, and error text.
*/
export function restoreChunkStream(
  vault: PiiVault,
): TransformStream<UIMessageChunk, UIMessageChunk> {
  const restorers = new Map<string, StreamRestorer>();
  const restorer = (key: string): StreamRestorer => {
    let r = restorers.get(key);
    if (!r) {
      r = new StreamRestorer(vault);
      restorers.set(key, r);
    }
    return r;
  };
  const flush = (key: string): string => {
    const rest = restorers.get(key)?.flush() ?? "";
    restorers.delete(key);
    return rest;
  };

  return new TransformStream<UIMessageChunk, UIMessageChunk>({
    transform(chunk, controller) {
      if (vault.size === 0) {
        controller.enqueue(chunk);
        return;
      }
      switch (chunk.type) {
        case "text-delta":
          controller.enqueue({ ...chunk, delta: restorer(`t:${chunk.id}`).push(chunk.delta) });
          return;
        case "text-end": {
          const rest = flush(`t:${chunk.id}`);
          if (rest) controller.enqueue({ type: "text-delta", id: chunk.id, delta: rest });
          controller.enqueue(chunk);
          return;
        }
        case "reasoning-delta":
          controller.enqueue({ ...chunk, delta: restorer(`r:${chunk.id}`).push(chunk.delta) });
          return;
        case "reasoning-end": {
          const rest = flush(`r:${chunk.id}`);
          if (rest) controller.enqueue({ type: "reasoning-delta", id: chunk.id, delta: rest });
          controller.enqueue(chunk);
          return;
        }
        case "tool-input-delta":
          controller.enqueue({
            ...chunk,
            inputTextDelta: restorer(`i:${chunk.toolCallId}`).push(chunk.inputTextDelta),
          });
          return;
        case "tool-input-available":
        case "tool-input-error": {
          const rest = flush(`i:${chunk.toolCallId}`);
          if (rest) {
            controller.enqueue({
              type: "tool-input-delta",
              toolCallId: chunk.toolCallId,
              inputTextDelta: rest,
            });
          }
          controller.enqueue({ ...chunk, input: vault.restoreDeep(chunk.input) });
          return;
        }
        case "tool-output-available":
          controller.enqueue({ ...chunk, output: vault.restoreDeep(chunk.output) });
          return;
        case "tool-output-error":
          controller.enqueue({ ...chunk, errorText: vault.restoreText(chunk.errorText) });
          return;
        case "error":
          controller.enqueue({ ...chunk, errorText: vault.restoreText(chunk.errorText) });
          return;
        default:
          if (chunk.type.startsWith("data-") && "data" in chunk) {
            controller.enqueue({ ...chunk, data: vault.restoreDeep(chunk.data) } as UIMessageChunk);
            return;
          }
          controller.enqueue(chunk);
      }
    },
  });
}
