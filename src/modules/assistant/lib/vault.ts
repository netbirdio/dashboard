/**
 * The PII boundary, kept in the browser.
 *
 * Everything the dashboard sends the agent passes through the chat's vault
 * first: account reads, canvas results, the page marker and what the user
 * types. What identifies a person or their machine (peer and user names,
 * hostnames, emails, addresses, serials, keys) becomes a token like
 * `[PEER_k3f9a2]`, and only the browser can turn a token back into the value
 * it stands for. Ids pass as they are, and so do labels an admin chose.
 *
 * Going the other way, the vault restores the tokens the model writes: to the
 * display name in what a person reads, and to the real id in what a browser
 * tool runs with.
 *
 * Tokens are random and live for one chat, in memory only: a chat resumed
 * after a reload shows the tokens of its earlier answers as they are.
 *
 * React-free: the agent imports the patterns from here for its own backstop.
 */
import { buildPageContextMarker, parsePageContextMarker, SECRET_PATTERNS } from "./contract";
import { AUDIT_RESULT, type FieldRule, type Profile, PROFILES } from "./profiles";

const IPV4 = String.raw`(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)`;
const IPV6 = "(?:[0-9A-Fa-f]{1,4}:){3,7}[0-9A-Fa-f]{1,4}|(?:[0-9A-Fa-f]{1,4}:){1,6}:(?:[0-9A-Fa-f]{1,4}(?::[0-9A-Fa-f]{1,4}){0,5})?";

function luhn(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1 && (d *= 2) > 9) d -= 9;
    sum += d;
  }
  return digits.length >= 12 && sum % 10 === 0;
}

// Order matters: enveloping shapes (keys, JWTs) before the narrower ones.
export const PII_PATTERNS: readonly [kind: string, re: RegExp, valid?: (m: string) => boolean][] = [
  ...SECRET_PATTERNS.map((re) => ["key", re] as [string, RegExp]),
  ["uuid", /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi],
  ["mac", /\b(?:[0-9A-Fa-f]{2}([:-]))(?:[0-9A-Fa-f]{2}\1){4}[0-9A-Fa-f]{2}\b/g],
  ["cidr", new RegExp(String.raw`\b(?!0\.0\.0\.0/0\b)${IPV4}/\d{1,2}\b|\b(?:${IPV6})/\d{1,3}\b`, "g")],
  ["ip", new RegExp(String.raw`\b(?!(?:0\.0\.0\.0|127\.0\.0\.1)\b)${IPV4}\b|\b(?:${IPV6})\b`, "g")],
  ["email", /\b[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,253}\.[A-Za-z]{2,63}\b/g],
  ["phone", /(?<![\w+])\+\d{1,3}(?:[\s.-]?\(?\d{1,4}\)?){2,5}\b/g],
  ["card", /\b(?:\d[ -]?){12,18}\d\b/g, luhn],
];

/** A redaction token as the model reads and writes it. */
export const TOKEN_PATTERN = /\[[A-Z][A-Z_]*_[a-z2-7]{6,}\]/g;
// The start of a token a stream has not finished writing yet.
const PARTIAL_TOKEN = /\[(?:[A-Z][A-Z_]*(?:_[a-z2-7]*)?)?$/;

// Credentials are never restored: a pasted key must not round-trip into tools.
const ONE_WAY = new Set(["key"]);
// Shorter literals (a peer named "db") would alias ordinary words.
const MIN_KNOWN_LENGTH = 4;
const BASE32 = "abcdefghijklmnopqrstuvwxyz234567";

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

// Tables keyed by values from the account would find `constructor` and its kin on Object.prototype.
const own = <T>(table: Record<string, T>, key: string): T | undefined =>
  Object.hasOwn(table, key) ? table[key] : undefined;

export function mapStrings(value: unknown, fn: (s: string) => string): unknown {
  if (typeof value === "string") return fn(value);
  if (Array.isArray(value)) return value.map((v) => mapStrings(v, fn));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mapStrings(v, fn)]));
  }
  return value;
}

// Not a cryptographic hash, and not meant to be one: it only lets a repeated
// credential find its token without the vault keeping the credential.
function fnv1a(text: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    const c = text.codePointAt(i) ?? 0;
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ c, 0x5bd1e995);
  }
  return (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36);
}

function randomSuffix(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => BASE32[b % 32]).join("");
}

/** Which key carries a canvas node's or subject's readable label. */
const labelKeyOf = (n: Record<string, unknown>): "label" | "name" | undefined => {
  if (typeof n.label === "string") return "label";
  return typeof n.name === "string" ? "name" : undefined;
};

/*
  The run of characters ending at `end` that markdown would read as one
  destination. Only ASCII whitespace ends a destination; `\s` would also stop
  at a no-break space or a line separator, which a URL may carry, and the
  `://` before it would go unseen.
*/
function wordBefore(text: string, end: number): string {
  let start = end;
  while (start > 0 && !/[ \t\n\v\f\r]/.test(text[start - 1])) start--;
  return text.slice(start, end);
}

// A reference-style link definition: `[label]: destination`, where the destination may hold spaces.
const REFERENCE_DEFINITION = /^\s{0,3}\[[^\]]+\]:\s/;
// The same with nothing after the colon: markdown then reads the destination from the next line.
const REFERENCE_DEFINITION_OPEN = /^\s{0,3}\[[^\]]+\]:[ \t]*$/;

/** Whether the line above `lineStart` ends in `](` or `[label]:`, so this line opens with its destination. */
function destinationOpenedAbove(text: string, lineStart: number): boolean {
  if (lineStart === 0) return false;
  const previous = text.slice(text.lastIndexOf("\n", lineStart - 2) + 1, lineStart - 1).trimEnd();
  return previous.endsWith("](") || REFERENCE_DEFINITION_OPEN.test(previous);
}

/**
 * Whether the text at `offset` sits where markdown would read a URL: a bare
 * URL, an inline destination `](…)`, a `<…>` destination or autolink, or a
 * reference definition's line, including a destination markdown lets start
 * on the line after `](` or `[label]:`. A value restored there would travel
 * in an href, so it stays a token.
 */
function inLinkDestination(text: string, offset: number): boolean {
  const word = wordBefore(text, offset);
  if (/:\/\/|\]\(|^www\./i.test(word)) return true;
  const lineStart = text.lastIndexOf("\n", offset - 1) + 1;
  const line = text.slice(lineStart, offset);
  if (REFERENCE_DEFINITION.test(line)) return true;
  if (/^[ \t]*[^ \t]*$/.test(line) && destinationOpenedAbove(text, lineStart)) return true;
  const open = line.lastIndexOf("<");
  return open !== -1 && !line.includes(">", open);
}

// A fence line opens or closes a fenced code block.
const FENCE = /^ {0,3}(?:`{3,}|~{3,})/;

/**
 * Whether the text at `offset` sits in code, where markdown is not parsed:
 * inside a fenced block, or inside a code span on its line. A code span
 * may in fact run over lines, but the model writes a name in one on a
 * single line, and a span read wrongly only costs a stray backslash.
 */
function codeContextAt(text: string, offset: number): "fence" | "span" | null {
  const before = text.slice(0, offset);
  const lines = before.split("\n");
  const fences = lines.slice(0, -1).filter((line) => FENCE.test(line)).length;
  if (fences % 2 === 1) return "fence";
  const runs = lines.at(-1)?.match(/`+/g)?.length ?? 0;
  return runs % 2 === 1 ? "span" : null;
}

const LINE_BREAKS = /[\r\n\u2028\u2029]+/g;
// ASCII punctuation, every character of which markdown reads literally after a backslash.
const MARKDOWN_PUNCTUATION = /[!-/:-@[-`{-~]/g;

/**
 * A restored value as literal text at `offset`. Names and hostnames are
 * written by whoever controls a device or account, so one could otherwise
 * carry headings, emphasis, tables or links into the assistant's answer.
 * Outside code every punctuation mark is escaped; inside code nothing is
 * parsed, so only a backtick (which would close the span) and a line
 * break (which could close the fence) are taken out.
 */
function asMarkdownLiteral(value: string, text: string, offset: number): string {
  const flat = value.replace(LINE_BREAKS, " ");
  switch (codeContextAt(text, offset)) {
    case "fence":
      return flat;
    case "span":
      return flat.replaceAll("`", "'");
    default:
      return flat.replace(MARKDOWN_PUNCTUATION, String.raw`\$&`);
  }
}

interface Entry {
  kind: string;
  real: string;
  display: string;
}

export type RestoreAs = "real" | "display";

export class Vault {
  private readonly entries = new Map<string, Entry>();
  private readonly tokenOf = new Map<string, string>();
  private readonly known = new Map<string, string>();
  private knownRe: RegExp | null = null;
  private readonly listeners = new Set<() => void>();
  /** Bumped on every new token, so a view of restored text knows to redraw. */
  revision = 0;

  get size(): number {
    return this.entries.size;
  }

  /** Called after the vault learns a new value. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private changed() {
    this.revision++;
    for (const listener of this.listeners) listener();
  }

  private newToken(kind: string): string {
    const prefix = kind.toUpperCase().replace(/[^A-Z_]/g, "_").replace(/^[^A-Z]+/, "") || "VALUE";
    for (let length = 6; ; length++) {
      const token = `[${prefix}_${randomSuffix(length)}]`;
      if (!this.entries.has(token)) return token;
    }
  }

  /** The token for a value, minting one the first time it is seen. */
  mint(kind: string, real: string, display = real, aliases: string[] = []): string {
    const oneWay = ONE_WAY.has(kind);
    const key = `${kind}\0${oneWay ? fnv1a(real) : real}`;
    let token = this.tokenOf.get(key);
    let learned = false;
    if (!token) {
      token = this.newToken(kind);
      this.tokenOf.set(key, token);
      this.entries.set(token, oneWay ? { kind, real: "", display: "" } : { kind, real, display });
      learned = true;
    }
    // Repeats of a credential are caught by its pattern, not by keeping it as a known value.
    if (!oneWay) {
      for (const literal of [real, ...aliases]) {
        const lower = literal.toLowerCase();
        if (literal.length >= MIN_KNOWN_LENGTH && !this.known.has(lower)) {
          this.known.set(lower, token);
          this.knownRe = null;
          learned = true;
        }
      }
    }
    if (learned) this.changed();
    return token;
  }

  /** Free text: values the vault knows first, then PII patterns. Tokens pass through. */
  scrub = (text: string): string => {
    if (this.known.size > 0) {
      this.knownRe ??= new RegExp(
        // `_` counts as a word character so a known `peer` never matches inside `[PEER_1]`.
        `(?<![A-Za-z0-9_])(${[...this.known.keys()]
          .sort((a, b) => b.length - a.length)
          .map(escapeRe)
          .join("|")})(?![A-Za-z0-9_])`,
        "gi",
      );
      text = text.replace(this.knownRe, (m) => this.known.get(m.toLowerCase()) ?? m);
    }
    for (const [kind, re, valid] of PII_PATTERNS) {
      text = text.replace(re, (m) => (valid && !valid(m) ? m : this.mint(kind, m)));
    }
    return text;
  };

  /** A record walked through a profile: unlisted fields are dropped. */
  redact(value: unknown, profile: Profile): unknown {
    if (Array.isArray(value)) return value.map((v) => this.redact(v, profile));
    // A record given by its id alone.
    if (typeof value === "string") return profile.handle ? value : undefined;
    if (!value || typeof value !== "object") return value;
    const src = value as Record<string, unknown>;
    const out: Record<string, unknown> = profile.handle ? this.handleOf(src, profile.handle, profile.personal) : {};
    for (const [key, raw] of Object.entries(src)) {
      const rule = own(profile.fields, key);
      if (rule === undefined || raw === null || raw === undefined) continue;
      if (profile.handle && (key === "id" || key === "name")) continue;
      out[key] = this.redactField(rule, raw);
    }
    return out;
  }

  /** A record's id and name: the id as is, the name a token when the record is a person's or a machine's. */
  private handleOf(src: Record<string, unknown>, handle: string, personal: boolean | undefined): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    if (typeof src.id === "string") out.id = src.id;
    if (typeof src.name === "string") out.name = personal ? this.mint(handle, src.name) : this.scrub(src.name);
    return out;
  }

  private redactField(rule: FieldRule, raw: unknown): unknown {
    if (rule === true) return mapStrings(raw, this.scrub);
    if (typeof rule === "function") return mapStrings(rule(raw), this.scrub);
    if (typeof rule === "string") return mapStrings(raw, (s) => (s ? this.mint(rule, s) : s));
    return this.redact(raw, rule);
  }

  /**
   * A canvas result. A peer's or person's label becomes a token, and the rest
   * of the payload is scrubbed as text. A node carries its label as `name`, a
   * canvas subject as `label`.
   */
  redactCanvas(value: unknown): unknown {
    // First pass mints, so the second can scrub every string against all of it.
    const tokenise = (node: unknown): unknown => {
      if (Array.isArray(node)) return node.map(tokenise);
      if (!node || typeof node !== "object") return node;
      const n = node as Record<string, unknown>;
      const labelKey = labelKeyOf(n);
      // A node points at its entity; a canvas subject is the entity itself.
      const entity = n.entity ?? (typeof n.id === "string" ? n : undefined);
      const entityKind = entity && typeof entity === "object" ? (entity as { kind?: unknown }).kind : undefined;
      const kind = [n.kind, entityKind].find((k): k is "peer" | "user" => k === "peer" || k === "user");
      const out = Object.fromEntries(Object.entries(n).map(([k, v]) => [k, tokenise(v)]));
      // A placeholder card's name is one the draft gave it, not a machine's.
      if (kind && labelKey && !n.placeholder) out[labelKey] = this.mint(kind, n[labelKey] as string);
      return out;
    };
    return mapStrings(tokenise(value), this.scrub);
  }

  /**
   * Tokens back to what a person reads, except inside a URL: a link or image
   * the model was steered into writing must not carry real values off-site.
   */
  restoreText = (text: string): string =>
    text.replace(TOKEN_PATTERN, (m, offset: number) => {
      const entry = this.entries.get(m);
      if (!entry) return m;
      if (inLinkDestination(text, offset)) return m;
      return ONE_WAY.has(entry.kind) ? "[redacted credential]" : entry.display;
    });

  /** The same for text still streaming in: a token cut off at the end is held back. */
  restoreStreamingText = (text: string): string => this.restoreText(text.replace(PARTIAL_TOKEN, ""));

  /** Tokens back in markdown a person reads, each value restored as literal text rather than markup. */
  restoreMarkdown = (text: string): string =>
    text.replace(TOKEN_PATTERN, (m, offset: number) => {
      const entry = this.entries.get(m);
      if (!entry) return m;
      if (inLinkDestination(text, offset)) return m;
      if (ONE_WAY.has(entry.kind)) return "\\[redacted credential\\]";
      return asMarkdownLiteral(entry.display, text, offset);
    });

  /** The same for markdown still streaming in. */
  restoreStreamingMarkdown = (text: string): string => this.restoreMarkdown(text.replace(PARTIAL_TOKEN, ""));

  /** Tokens back inside a string a system reads: an id, a filter value. */
  restoreString = (text: string, as: RestoreAs): string =>
    text.replace(TOKEN_PATTERN, (m) => {
      const entry = this.entries.get(m);
      return entry && !ONE_WAY.has(entry.kind) ? entry[as] : m;
    });

  /** Every string in a value, restored. */
  restoreValue(value: unknown, as: RestoreAs): unknown {
    return mapStrings(value, (s) => this.restoreString(s, as));
  }
}

const WITHHELD = "[result withheld: no redaction profile for this data]";

const RESULT_ENVELOPE = new Set([
  "operation", "total", "shown", "status", "statusText", "error", "note", "withheld", "count_by", "distinct", "missing", "other",
]);

/** A read's or a tool's result as the model may see it. Account data is profiled, the rest scrubbed. */
function redactValue(vault: Vault, toolName: string, value: unknown): unknown {
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return vault.scrub(value as string);
    }
  }
  if (!value || typeof value !== "object") return mapStrings(value, vault.scrub);
  const v = value as Record<string, unknown>;
  if (toolName === "netbird_api") return redactApiRead(vault, v);
  if (toolName === "account_search") return redactSearch(vault, v);
  if (toolName === "audit_events") return "rows" in v ? vault.redact(v, AUDIT_RESULT) : mapStrings(v, vault.scrub);
  if (toolName.startsWith("control_center_")) return vault.redactCanvas(v);
  return mapStrings(v, vault.scrub);
}

/** One management read: its envelope scrubbed, its data cut to the operation's profile. */
function redactApiRead(vault: Vault, v: Record<string, unknown>): unknown {
  const op = own(PROFILES, String(v.operation));
  if (!op) return WITHHELD;
  return {
    ...(mapStrings(Object.fromEntries(Object.entries(v).filter(([k]) => RESULT_ENVELOPE.has(k))), vault.scrub) as object),
    ...(v.data === undefined ? {} : { data: vault.redact(v.data, op.profile) }),
    // A count is shaped like a row with its `count`: the row part goes through the profile like any row.
    ...(Array.isArray(v.counts)
      ? {
          counts: v.counts.flatMap((c) => {
            const { count, ...value } = (c ?? {}) as Record<string, unknown>;
            return typeof count === "number" ? [{ ...(vault.redact(value, op.profile) as object), count }] : [];
          }),
        }
      : {}),
  };
}

function redactSearch(vault: Vault, v: Record<string, unknown>): unknown {
  // Results first, so the name searched for is known by the time the term is scrubbed.
  const results = Array.isArray(v.results) ? v.results.map((r) => redactValue(vault, "netbird_api", r)) : [];
  const term = typeof v.term === "string" ? v.term : "";
  return { term: vault.scrub(term), ...(typeof v.note === "string" ? { note: v.note } : {}), results };
}

/** A browser tool's result body, tokenised for the agent. Never throws. */
export function redactResult(vault: Vault, toolName: string, content: string): string {
  try {
    const redacted = redactValue(vault, toolName, content);
    return typeof redacted === "string" ? redacted : JSON.stringify(redacted);
  } catch {
    return WITHHELD;
  }
}

// Arguments that name a thing the way a person wrote it, restored to display
// names rather than ids: a log search box, an audit filter, a read's query.
const DISPLAY_ARGS: Record<string, "*" | string[]> = {
  ask_question: "*",
  render_component: ["title", "data", "rows"],
  audit_events: "*",
  account_search: "*",
  dashboard_page_redirect: ["search"],
  netbird_api: ["query"],
};

/** A browser tool call's input with its tokens restored, for the executor to run. */
export function restoreToolInput(vault: Vault, toolName: string, input: unknown): unknown {
  const display = own(DISPLAY_ARGS, toolName);
  if (display === "*") return vault.restoreValue(input, "display");
  if (!input || typeof input !== "object" || Array.isArray(input) || !display) return vault.restoreValue(input, "real");
  return Object.fromEntries(
    Object.entries(input).map(([k, v]) => [k, vault.restoreValue(v, display.includes(k) ? "display" : "real")]),
  );
}

/**
 * The page-context marker, with the entity it names as the token its reads
 * give it; null when the value is not a marker.
 */
export function redactPageContext(vault: Vault, marker: string): string | null {
  const context = parsePageContextMarker(marker);
  if (!context) return null;
  // The ref is an id; a peer's or person's label is their name, and a token like their reads give.
  const personal = context.kind === "peer" || context.kind === "user";
  const label = context.label
    ? { label: personal ? vault.mint(context.kind, context.label) : vault.scrub(context.label) }
    : {};
  return buildPageContextMarker({ ...context, ...label });
}
