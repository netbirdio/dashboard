"use client";
import type { UIMessage } from "ai";
import { createContext, useCallback, useContext } from "react";
import { useSWRConfig } from "swr";
import type { PageContextEntry } from "@/interfaces/Assistant";

function formatToken(kind: string, n: number): string {
  return `[${kind.toUpperCase()}_${n}]`;
}

export type FieldRule = true | string | RedactionConfig;

export interface RedactionConfig {
  handle?: string;
  labelled?: boolean;
  fields: Record<string, FieldRule>;
}

interface RealValue {
  real: string;
  display: string;
}

export interface RedactorOptions {
  catalog?: () => readonly CatalogEntry[];
  rules?: Record<string, RedactionConfig>;
  patterns?: readonly (readonly [string, RegExp])[];
}

export interface Detection {
  kind: string;
  value: string;
  token: string;
  note?: string;
}

export interface DetectionResult {
  redacted: string;
  detections: Detection[];
}

export class Redactor {
  private counters = new Map<string, number>();
  private forward = new Map<string, string>();
  private reverse = new Map<string, RealValue>();
  private readonly catalog: () => readonly CatalogEntry[];
  private readonly rules = new Map<string, RedactionConfig>();
  private readonly patterns: { kind: string; pattern: RegExp }[] = [];

  constructor(options: RedactorOptions = {}) {
    this.catalog = options.catalog ?? (() => []);
    for (const [kind, config] of Object.entries(options.rules ?? {})) {
      this.rules.set(kind, config);
    }
    for (const [kind, pattern] of options.patterns ?? []) {
      this.patterns.push({ kind, pattern });
    }
  }

  rule(kind: string, rule: RedactionConfig | RegExp): this {
    if (rule instanceof RegExp) this.patterns.push({ kind, pattern: rule });
    else this.rules.set(kind, rule);
    return this;
  }

  private mint(kind: string, real: string, display: string): string {
    const key = `${kind} ${real}`;
    const existing = this.forward.get(key);
    if (existing) {
      const current = this.reverse.get(existing);
      if (current && current.display === current.real && display !== real) {
        this.reverse.set(existing, { real, display });
      }
      return existing;
    }
    const n = (this.counters.get(kind) ?? 0) + 1;
    this.counters.set(kind, n);
    const token = formatToken(kind, n);
    this.forward.set(key, token);
    this.reverse.set(token, { real, display });
    return token;
  }

  handle(kind: string, id: string, name?: string): string {
    return this.mint(kind, id, name ?? id);
  }

  placeholder(kind: string, value: string): string {
    return this.mint(kind, value, value);
  }

  redact(value: unknown, rule: RedactionConfig | string): unknown {
    const config = typeof rule === "string" ? this.rules.get(rule) : rule;
    if (!config) return undefined;
    return this.redactValue(value, config);
  }

  private redactValue(value: unknown, config: RedactionConfig): unknown {
    if (Array.isArray(value)) {
      return value.map((v) => this.redactValue(v, config));
    }
    if (typeof value === "string") {
      return config.handle ? this.mint(config.handle, value, value) : undefined;
    }
    if (value === null || typeof value !== "object") return value;
    const src = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    if (config.handle) {
      const id = typeof src.id === "string" ? src.id : undefined;
      const name = typeof src.name === "string" ? src.name : undefined;
      const realKey = id ?? name;
      if (realKey) {
        const token = this.mint(config.handle, realKey, name ?? realKey);
        if (id !== undefined) out.id = token;
        if (name !== undefined) out.name = config.labelled ? name : token;
      }
    }
    for (const [key, raw] of Object.entries(src)) {
      if (config.handle && (key === "id" || key === "name")) continue;
      const rule = config.fields[key];
      if (rule !== undefined) out[key] = this.applyRule(rule, raw);
    }
    return out;
  }

  private applyRule(rule: FieldRule, raw: unknown): unknown {
    if (raw === null || raw === undefined || rule === true) return raw;
    if (typeof rule === "string") {
      return Array.isArray(raw)
        ? raw.map((v) => this.scalar(rule, v))
        : this.scalar(rule, raw);
    }
    return this.redactValue(raw, rule);
  }

  private scalar(kind: string, raw: unknown): unknown {
    return typeof raw === "string" && raw.length
      ? this.placeholder(kind, raw)
      : raw;
  }

  restore = (text: string): string => {
    if (this.reverse.size === 0) return text;
    const bodies = [...this.reverse.keys()]
      .map((token) => token.slice(1, -1))
      .sort((a, b) => b.length - a.length);
    const body = `(${bodies.join("|")})`.replace(/_/g, "[ _]");
    const pattern = new RegExp(`\\[\\s*${body}\\s*\\]|\\b${body}\\b`, "gi");
    return text.replace(pattern, (whole, braced?: string, bare?: string) => {
      const matched = braced ?? bare;
      if (!matched) return whole;
      const canonical = `[${matched.replace(/ /g, "_").toUpperCase()}]`;
      return this.reverse.get(canonical)?.display ?? whole;
    });
  };

  resolve = (token: string): string | undefined => {
    const direct = this.reverse.get(token)?.real;
    if (direct !== undefined) return direct;
    const bare = token
      .trim()
      .replace(/^\[|\]$/g, "")
      .toUpperCase();
    return this.reverse.get(`[${bare}]`)?.real;
  };

  resolveInput(input: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      out[key] =
        typeof value === "string" ? this.resolve(value) ?? value : value;
    }
    return out;
  }

  resolveDeep(value: unknown): unknown {
    if (typeof value === "string") {
      const reference = this.resolve(value);
      return reference ?? this.restore(value);
    }
    if (Array.isArray(value)) return value.map((v) => this.resolveDeep(v));
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([k, v]) => [
          k,
          this.resolveDeep(v),
        ]),
      );
    }
    return value;
  }

  detect = (text: string): DetectionResult => {
    const detections: Detection[] = [];
    if (!text) return { redacted: text, detections };
    let redacted = text;
    const candidates = this.catalog()
      .filter(usable)
      .sort((a, b) => b.name.length - a.name.length);
    for (const entry of candidates) {
      const name = entry.name.trim();
      if (!matcher(name).test(redacted)) continue;
      const token = entry.scalar
        ? this.placeholder(entry.type, entry.name)
        : this.handle(entry.type, entry.id, entry.name);
      redacted = redacted.replace(matcher(name), () => token);
      const owner = entry.owner
        ? this.handle(entry.owner.type, entry.owner.id, entry.owner.name)
        : undefined;
      detections.push({
        kind: entry.type,
        value: entry.name,
        token,
        ...(entry.owner && owner
          ? {
              note: `${token} is the ${entry.owner.field} of ${entry.owner.type} ${owner}`,
            }
          : {}),
      });
    }
    for (const { kind, pattern } of this.patterns) {
      redacted = redacted.replace(pattern, (match) => {
        const token = this.placeholder(kind, match);
        detections.push({ kind, value: match, token });
        return token;
      });
    }
    return { redacted, detections };
  };
}

export interface CatalogEntry {
  name: string;
  type: string;
  id: string;
  scalar?: boolean;
  owner?: {
    type: string;
    id: string;
    name?: string;
    field: string;
  };
}

const MIN_NAME_LENGTH = 3;
const MAX_NOTES = 20;

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const matcher = (name: string) =>
  new RegExp(`(?<![\\w.-])${escape(name)}(?![\\w.-])`, "gi");
const usable = (entry: CatalogEntry) =>
  entry.name.trim().length >= MIN_NAME_LENGTH;

export function pseudonymizeMessages(
  messages: UIMessage[],
  redactor: Redactor,
): UIMessage[] {
  return messages.map((message) =>
    message.role !== "user"
      ? message
      : {
          ...message,
          parts: message.parts.map((part) =>
            part.type === "text"
              ? { ...part, text: redactor.detect(part.text).redacted }
              : part,
          ),
        },
  );
}

export function identifierNotes(
  messages: UIMessage[],
  redactor: Redactor,
): string | null {
  const last = [...messages].reverse().find((m) => m.role === "user");
  const text =
    last?.parts
      .map((part) => (part.type === "text" ? part.text : ""))
      .join(" ") ?? "";
  const notes = [
    ...new Set(
      redactor
        .detect(text)
        .detections.map((detection) => detection.note)
        .filter((note): note is string => Boolean(note)),
    ),
  ].slice(0, MAX_NOTES);
  return notes.length
    ? `Identifiers in this message: ${notes.join("; ")}.`
    : null;
}

export function describePageContext(
  entry: PageContextEntry | null,
  redactor: Redactor,
  name?: string,
): string | null {
  if (!entry) return null;
  if (entry.id) {
    return `<page-context kind="${entry.type}" ref="${redactor.handle(
      entry.type,
      entry.id,
      name,
    )}" />`;
  }
  return entry.label
    ? `<page-context kind="${entry.type}" page="${entry.label}" />`
    : null;
}

const RedactorContext = createContext<Redactor | null>(null);
export const RedactorProvider = RedactorContext.Provider;

export function useRedactor(): Redactor {
  const redactor = useContext(RedactorContext);
  if (!redactor) {
    throw new Error(
      "assistant hooks must be used within the assistant provider",
    );
  }
  return redactor;
}

export interface CatalogSource {
  key: string;
  type: string;
}

export interface CatalogScalarField {
  field: string;
  type: string;
  label?: string;
}

interface CachedRow {
  id?: unknown;
  name?: unknown;
}

export function useNameCatalog(
  sources: readonly CatalogSource[],
  scalarFields: Record<string, readonly CatalogScalarField[]>,
): () => CatalogEntry[] {
  const { cache } = useSWRConfig();
  return useCallback(() => {
    const entries: CatalogEntry[] = [];
    for (const { key, type } of sources) {
      const rows = cache.get(key)?.data as CachedRow[] | undefined;
      if (!Array.isArray(rows)) continue;
      for (const row of rows) {
        const id = typeof row?.id === "string" ? row.id : undefined;
        const name = typeof row?.name === "string" ? row.name : undefined;
        if (id && name) entries.push({ name, type, id });
        for (const scalar of scalarFields[key] ?? []) {
          const value = (row as Record<string, unknown>)[scalar.field];
          if (typeof value !== "string" || !value.length || !id) continue;
          entries.push({
            name: value,
            type: scalar.type,
            id: value,
            scalar: true,
            owner: { type, id, name, field: scalar.label ?? scalar.field },
          });
        }
      }
    }
    return entries;
  }, [cache, sources, scalarFields]);
}
