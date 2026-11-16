// The PII boundary: everything the dashboard sends the agent passes through the chat's vault first,
// and only the browser can turn a token back into its value. Tokens live in memory, for one chat.
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

export const TOKEN_PATTERN = /\[[A-Z][A-Z_]*_[a-z2-7]{6,}\]/g;
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

// Not cryptographic: it only lets a repeated credential find its token
// without the vault keeping the credential.
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

const labelKeyOf = (n: Record<string, unknown>): "label" | "name" | undefined => {
  if (typeof n.label === "string") return "label";
  return typeof n.name === "string" ? "name" : undefined;
};

// Only ASCII whitespace ends a destination: `\s` would also stop at a no-break space,
// which a URL may carry, and the `://` before it would go unseen.
function wordBefore(text: string, end: number): string {
  let start = end;
  while (start > 0 && !/[ \t\n\v\f\r]/.test(text[start - 1])) start--;
  return text.slice(start, end);
}

const REFERENCE_DEFINITION = /^\s{0,3}\[[^\]]+\]:\s/;
// With nothing after the colon, markdown reads the destination from the next line.
const REFERENCE_DEFINITION_OPEN = /^\s{0,3}\[[^\]]+\]:[ \t]*$/;

function destinationOpenedAbove(text: string, lineStart: number): boolean {
  if (lineStart === 0) return false;
  const previous = text.slice(text.lastIndexOf("\n", lineStart - 2) + 1, lineStart - 1).trimEnd();
  return previous.endsWith("](") || REFERENCE_DEFINITION_OPEN.test(previous);
}

// Anywhere markdown would read a URL: a value restored there would travel in an href, so it stays a token.
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

const FENCE = /^ {0,3}(?:`{3,}|~{3,})/;

function codeContextAt(text: string, offset: number): "fence" | "span" | null {
  const before = text.slice(0, offset);
  const lines = before.split("\n");
  const fences = lines.slice(0, -1).filter((line) => FENCE.test(line)).length;
  if (fences % 2 === 1) return "fence";
  const runs = lines.at(-1)?.match(/`+/g)?.length ?? 0;
  return runs % 2 === 1 ? "span" : null;
}

const LINE_BREAKS = /[\r\n\u2028\u2029]+/g;
const MARKDOWN_PUNCTUATION = /[!-/:-@[-`{-~]/g;

// Names are written by whoever controls a device or account, so a restored value must never act as markup.
// Inside code only a backtick or a line break could break out.
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
  revision = 0;

  get size(): number {
    return this.entries.size;
  }

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

  redactCanvas(value: unknown): unknown {
    // The first pass mints, so the second can scrub every string against all of it.
    const tokenise = (node: unknown): unknown => {
      if (Array.isArray(node)) return node.map(tokenise);
      if (!node || typeof node !== "object") return node;
      const n = node as Record<string, unknown>;
      const labelKey = labelKeyOf(n);
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

  // Never restores inside a URL: a link or image the model was steered into writing
  // must not carry real values off-site.
  restoreText = (text: string): string =>
    text.replace(TOKEN_PATTERN, (m, offset: number) => {
      const entry = this.entries.get(m);
      if (!entry) return m;
      if (inLinkDestination(text, offset)) return m;
      return ONE_WAY.has(entry.kind) ? "[redacted credential]" : entry.display;
    });

  restoreStreamingText = (text: string): string => this.restoreText(text.replace(PARTIAL_TOKEN, ""));

  restoreMarkdown = (text: string): string =>
    text.replace(TOKEN_PATTERN, (m, offset: number) => {
      const entry = this.entries.get(m);
      if (!entry) return m;
      if (inLinkDestination(text, offset)) return m;
      if (ONE_WAY.has(entry.kind)) return "\\[redacted credential\\]";
      return asMarkdownLiteral(entry.display, text, offset);
    });

  restoreStreamingMarkdown = (text: string): string => this.restoreMarkdown(text.replace(PARTIAL_TOKEN, ""));

  restoreString = (text: string, as: RestoreAs): string =>
    text.replace(TOKEN_PATTERN, (m) => {
      const entry = this.entries.get(m);
      return entry && !ONE_WAY.has(entry.kind) ? entry[as] : m;
    });

  restoreValue(value: unknown, as: RestoreAs): unknown {
    return mapStrings(value, (s) => this.restoreString(s, as));
  }
}

const WITHHELD = "[result withheld: no redaction profile for this data]";

const RESULT_ENVELOPE = new Set([
  "operation", "total", "shown", "status", "statusText", "error", "note", "withheld", "count_by", "distinct", "missing", "other",
]);

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

function redactApiRead(vault: Vault, v: Record<string, unknown>): unknown {
  const op = own(PROFILES, String(v.operation));
  if (!op) return WITHHELD;
  return {
    ...(mapStrings(Object.fromEntries(Object.entries(v).filter(([k]) => RESULT_ENVELOPE.has(k))), vault.scrub) as object),
    ...(v.data === undefined ? {} : { data: vault.redact(v.data, op.profile) }),
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

// Never throws: a result that cannot be redacted is withheld.
export function redactResult(vault: Vault, toolName: string, content: string): string {
  try {
    const redacted = redactValue(vault, toolName, content);
    return typeof redacted === "string" ? redacted : JSON.stringify(redacted);
  } catch {
    return WITHHELD;
  }
}

// Arguments restored to display names; every other argument restores to the real id.
const DISPLAY_ARGS: Record<string, "*" | string[]> = {
  ask_question: "*",
  render_component: ["title", "data", "rows"],
  audit_events: "*",
  account_search: "*",
  dashboard_page_redirect: ["search"],
  netbird_api: ["query"],
};

export function restoreToolInput(vault: Vault, toolName: string, input: unknown): unknown {
  const display = own(DISPLAY_ARGS, toolName);
  if (display === "*") return vault.restoreValue(input, "display");
  if (!input || typeof input !== "object" || Array.isArray(input) || !display) return vault.restoreValue(input, "real");
  return Object.fromEntries(
    Object.entries(input).map(([k, v]) => [k, vault.restoreValue(v, display.includes(k) ? "display" : "real")]),
  );
}

export function redactPageContext(vault: Vault, marker: string): string | null {
  const context = parsePageContextMarker(marker);
  if (!context) return null;
  const personal = context.kind === "peer" || context.kind === "user";
  const label = context.label
    ? { label: personal ? vault.mint(context.kind, context.label) : vault.scrub(context.label) }
    : {};
  return buildPageContextMarker({ ...context, ...label });
}
