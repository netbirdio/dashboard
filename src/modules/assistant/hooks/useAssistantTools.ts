"use client";

import { useNetBirdFetch } from "@utils/api";
import loadNetBirdConfig from "@utils/config";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext } from "react";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import type { ToolOutcome } from "@/interfaces/Assistant";
import {
  CONTROL_CENTER_HREF,
  runControlCenterTool,
} from "@/modules/assistant/tools/control-center-call-tool";
import { navigateToPage } from "@/modules/assistant/tools/navigate-to-page";
import type {
  RedactionConfig,
  Redactor,
} from "@/modules/assistant/utils/redaction";
import { ASSISTANT_TOOLS } from "@/modules/assistant/utils/tools";

const TEXT = {
  navigated: (href: string) => `Navigated to ${href}.`,
  unknownTool: (name: string) =>
    `Tool "${name}" is not available in this dashboard version.`,
  requestFailed: (status: number) => `Request failed with status ${status}.`,
  apiUnreachable: (detail: string) =>
    `Could not reach the management API: ${detail}`,
} as const;

/*
  Large accounts return lists the chat cannot carry. 10k audit events froze
  the tab: every row minted redaction tokens (which every restore-on-render
  regex then has to carry), the payload rode in the transcript, and the
  transcript is resent on every tool round until it tripped the server's
  request-size cap. Rows are capped BEFORE ownership, recording and redaction
  so none of those ever see the excess; the byte budget then bounds the fat-row
  case. The API returns audit events newest first, so slicing from the front
  keeps the rows worth keeping.
*/
const MAX_ROWS = 200;
const MAX_RESULT_BYTES = 32_000;
const MAX_COUNT_KEYS = 50;

export function capRows(value: unknown): { rows: unknown; total: number } {
  if (!Array.isArray(value)) return { rows: value, total: 1 };
  return {
    rows: value.length > MAX_ROWS ? value.slice(0, MAX_ROWS) : value,
    total: value.length,
  };
}

/*
  The truncation envelope is explicit so the model can say "showing 200 of
  10432" instead of presenting a slice as the whole account. The note rides IN
  the result because that is the moment the model decides what to do next —
  system-prompt rules about hypothetical truncation get ignored; a result that
  says "call me again like this" gets followed. Without it the model hedges
  ("there may be earlier ones beyond what's surfaced") instead of fetching the
  real answer.
*/
const TRUNCATION_NOTE =
  "Window only — answer over ALL rows by calling again: filters/since/until/query to narrow, " +
  "count_by to count, sort_by + order + limit for extremes (earliest: sort_by the time field, " +
  "order 'asc', limit 1). Page with offset only as a last resort.";

export function serializeBounded(
  safe: unknown,
  total: number,
  offset = 0,
  applied?: Record<string, unknown>,
): string {
  if (!Array.isArray(safe)) return JSON.stringify(safe);
  let rows = safe;
  let content = JSON.stringify(rows);
  while (content.length > MAX_RESULT_BYTES && rows.length > 1) {
    rows = rows.slice(0, Math.ceil(rows.length / 2));
    content = JSON.stringify(rows);
  }
  if (offset + rows.length < total) {
    return JSON.stringify({
      truncated: true,
      shown: rows.length,
      total,
      next_offset: offset + rows.length,
      // Echoes the parameters that took effect, so the model can SEE that its
      // sort/filter applied instead of concluding the tool is broken.
      ...(applied && Object.keys(applied).length ? { applied } : {}),
      note: TRUNCATION_NOTE,
      rows,
    });
  }
  return content;
}

// `query` narrows over the FULL list, so a filtered fetch beats paging. The
// value arrives token-resolved (a `[PEER_3]` becomes the real id), so it
// matches the real rows the browser holds.
export function filterRows(rows: unknown[], query: string): unknown[] {
  const q = query.toLowerCase();
  return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
}

const LIST_PARAMS = [
  "filters",
  "since",
  "until",
  "query",
  "count_by",
  "sort_by",
  "order",
  "offset",
  "limit",
] as const;

/*
  A silently ignored parameter is the worst failure this executor has: the
  model gets the same window back three times, decides the tool is broken, and
  hedges to the user. An invented parameter name or a misspelled field must
  come back as an error that names the valid options instead. Field names come
  from a raw row — schema, not values, so nothing sensitive leaves.
*/
export function validateListParams(
  name: string,
  input: Record<string, unknown>,
  rows: unknown[],
): string | null {
  if (!name.startsWith("list_")) return null;
  const unknown = Object.keys(input).filter(
    (k) => !(LIST_PARAMS as readonly string[]).includes(k),
  );
  if (unknown.length) {
    return `Unknown parameter ${unknown
      .map((k) => `"${k}"`)
      .join(", ")} — this tool takes: ${LIST_PARAMS.join(", ")}.`;
  }
  const sample = rows[0] as Record<string, unknown> | undefined;
  if (!sample) return null;
  const fields = Object.keys(sample);
  const check = (field: string) =>
    fields.includes(field)
      ? null
      : `Rows have no field "${field}" — the fields are: ${fields.join(", ")}.`;
  if (input.filters && typeof input.filters === "object") {
    for (const field of Object.keys(input.filters)) {
      const err = check(field);
      if (err) return err;
    }
  }
  for (const param of ["sort_by", "count_by"] as const) {
    if (typeof input[param] === "string") {
      const err = check(input[param] as string);
      if (err) return err;
    }
  }
  return null;
}

const same = (a: unknown, b: unknown) =>
  String(a).toLowerCase() === String(b).toLowerCase();

// Exact-match field filters, values token-resolved before they get here.
// Array fields (groups, domains) match by containment; member objects by
// their id or name.
export function applyFilters(
  rows: unknown[],
  filters: Record<string, unknown>,
): unknown[] {
  const wanted = Object.entries(filters);
  return rows.filter((row) => {
    const r = row as Record<string, unknown> | null;
    return wanted.every(([field, want]) => {
      const value = r?.[field];
      if (Array.isArray(value)) {
        return value.some((item) =>
          item && typeof item === "object"
            ? same((item as { id?: unknown }).id, want) ||
              same((item as { name?: unknown }).name, want)
            : same(item, want),
        );
      }
      return same(value, want);
    });
  });
}

/*
  Sorting the FULL list is what makes extremes one call: "first login" is a
  sort ascending on the time field, not fifty pages backwards. Dates compare
  as dates (gated on an ISO-looking value so activity codes and IPs don't
  parse), numbers as numbers, the rest as text; rows missing the field sort
  last either way.
*/
export function sortRows(
  rows: unknown[],
  field: string,
  order: "asc" | "desc" = "asc",
): unknown[] {
  const dir = order === "desc" ? -1 : 1;
  const keyOf = (row: unknown): number | string | undefined => {
    const value = (row as Record<string, unknown> | null)?.[field];
    if (value === null || value === undefined) return undefined;
    if (typeof value === "number" || typeof value === "boolean") {
      return Number(value);
    }
    const s = String(value);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      const t = Date.parse(s);
      if (!Number.isNaN(t)) return t;
    }
    return s.toLowerCase();
  };
  return [...rows].sort((a, b) => {
    const ka = keyOf(a);
    const kb = keyOf(b);
    if (ka === undefined) return kb === undefined ? 0 : 1;
    if (kb === undefined) return -1;
    const cmp =
      typeof ka === "number" && typeof kb === "number"
        ? ka - kb
        : String(ka).localeCompare(String(kb));
    return dir * cmp;
  });
}

// The row's own clock: events carry `timestamp`, peers `last_seen`. Rows
// without a parseable time are dropped once a range is asked for — an
// undatable row can't honestly satisfy "since Monday".
export function applyTimeRange(
  rows: unknown[],
  since?: string,
  until?: string,
): unknown[] {
  const from = since ? Date.parse(since) : Number.NEGATIVE_INFINITY;
  const to = until ? Date.parse(until) : Number.POSITIVE_INFINITY;
  if (Number.isNaN(from) || Number.isNaN(to)) return rows;
  return rows.filter((row) => {
    const r = row as Record<string, unknown> | null;
    const stamp = Date.parse(String(r?.timestamp ?? r?.last_seen ?? ""));
    return !Number.isNaN(stamp) && stamp >= from && stamp <= to;
  });
}

/*
  Aggregation over the whole list — the answer to "how many … by …" that no
  row window can give. Grouped values obey the same whitelist as the rows:
  a kept field counts under its real value, a tokenised field under its token,
  and a field the whitelist would drop cannot be grouped at all.
*/
export function countBy(
  rows: unknown[],
  field: string,
  config: RedactionConfig | undefined,
  redactor: Redactor,
): ToolOutcome {
  const rule = config?.fields[field];
  if (config && rule !== true && typeof rule !== "string") {
    return {
      content: `Can't group by "${field}" — pick a field the tool's rows carry, like a status, type or activity field.`,
      isError: true,
    };
  }
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = (row as Record<string, unknown> | null)?.[field];
    const key =
      typeof rule === "string" && typeof value === "string" && value
        ? redactor.placeholder(rule, value)
        : String(value ?? "(none)");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return {
    content: JSON.stringify({
      count_by: field,
      total: rows.length,
      ...(top.length > MAX_COUNT_KEYS ? { distinct: top.length } : {}),
      counts: Object.fromEntries(top.slice(0, MAX_COUNT_KEYS)),
    }),
    isError: false,
  };
}

// The conversation's fetched rows, keyed by resource id, so `resource_table`
// components can join the ids the model references against real data.
export class ToolResultStore {
  private readonly byId = new Map<string, Record<string, unknown>>();

  // Later writes win, merged so a sparse write can't drop fields.
  record(value: unknown): void {
    if (Array.isArray(value)) {
      for (const item of value) this.record(item);
      return;
    }
    if (value === null || typeof value !== "object") return;

    const row = value as Record<string, unknown>;
    if (typeof row.id === "string") {
      this.byId.set(row.id, { ...this.byId.get(row.id), ...row });
    }
    for (const nested of Object.values(row)) {
      if (nested && typeof nested === "object") this.record(nested);
    }
  }

  field(id: string, column: string): unknown {
    return this.byId.get(id)?.[column];
  }
}

const ToolResultsContext = createContext<ToolResultStore | null>(null);

export const ToolResultsProvider = ToolResultsContext.Provider;

export function useToolResults(): ToolResultStore {
  const toolResults = useContext(ToolResultsContext);
  if (!toolResults) {
    throw new Error(
      "assistant hooks must be used within the assistant provider",
    );
  }
  return toolResults;
}

// "My peers" needs to know which user is at the keyboard.
function markOwnership(
  value: unknown,
  userId?: string,
  kind?: string,
): unknown {
  if (!userId) return value;
  if (Array.isArray(value)) {
    return value.map((row) => markOwnership(row, userId, kind));
  }
  if (value === null || typeof value !== "object") return value;

  const row = value as Record<string, unknown>;
  if (kind === "user" && typeof row.id === "string") {
    return { ...row, yours: row.id === userId };
  }
  if (typeof row.user_id === "string") {
    return { ...row, yours: row.user_id === userId };
  }
  return value;
}

export function useAssistantTools() {
  const { fetch: netbirdFetch } = useNetBirdFetch(true);
  const { loggedInUser } = useLoggedInUser();
  const router = useRouter();
  const pathname = usePathname();
  const currentUserId = loggedInUser?.id;

  return useCallback(
    async (
      name: string,
      rawInput: unknown,
      toolResults: ToolResultStore,
      redactor: Redactor,
    ): Promise<ToolOutcome> => {
      const tool = ASSISTANT_TOOLS[name];
      const input = (rawInput ?? {}) as Record<string, unknown>;

      if (tool?.kind === "control-center") {
        // Its inputs nest, so it resolves them itself (resolveDeep).
        return runControlCenterTool(tool.action, input, {
          redactor,
          navigate: (href) => router.push(href),
          onControlCenterPage: pathname === CONTROL_CENTER_HREF,
        });
      }

      if (tool?.kind === "navigation") {
        // The model's `[PEER_1]` becomes the real id the route needs.
        const target = navigateToPage(redactor.resolveInput(input));
        if ("error" in target) return { content: target.error, isError: true };
        router.push(target.href);
        return { content: TEXT.navigated(target.href), isError: false };
      }

      if (tool?.kind !== "management") {
        // Reaching this means the server's registry is ahead of the dashboard.
        return { content: TEXT.unknownTool(name), isError: true };
      }

      try {
        const origin = `${loadNetBirdConfig().apiOrigin}/api`;
        const resolved = redactor.resolveInput(input);
        const res = await netbirdFetch(
          `${origin}${tool.action.path(resolved)}`,
          { method: "GET" },
        );
        if (!res.ok) {
          return { content: TEXT.requestFailed(res.status), isError: true };
        }

        const raw = await res.json();
        const selected = tool.action.select ? tool.action.select(raw) : raw;

        const paramError = validateListParams(
          name,
          input,
          Array.isArray(selected) ? selected : [],
        );
        if (paramError) return { content: paramError, isError: true };

        let filtered = selected;
        if (Array.isArray(filtered)) {
          if (input.filters && typeof input.filters === "object") {
            filtered = applyFilters(
              filtered,
              redactor.resolveDeep(input.filters) as Record<string, unknown>,
            );
          }
          const since =
            typeof input.since === "string" ? input.since : undefined;
          const until =
            typeof input.until === "string" ? input.until : undefined;
          if (since || until) {
            filtered = applyTimeRange(filtered as unknown[], since, until);
          }
          if (typeof resolved.query === "string") {
            filtered = filterRows(filtered as unknown[], resolved.query);
          }
          if (typeof input.sort_by === "string") {
            filtered = sortRows(
              filtered as unknown[],
              input.sort_by,
              input.order === "desc" ? "desc" : "asc",
            );
          }
        }

        if (Array.isArray(filtered) && typeof resolved.count_by === "string") {
          return countBy(
            filtered,
            resolved.count_by,
            tool.action.redact,
            redactor,
          );
        }

        const offset =
          Array.isArray(filtered) &&
          typeof resolved.offset === "number" &&
          resolved.offset > 0
            ? Math.min(Math.floor(resolved.offset), filtered.length)
            : 0;
        const limit =
          typeof resolved.limit === "number" && resolved.limit >= 1
            ? Math.floor(resolved.limit)
            : undefined;
        const windowed =
          Array.isArray(filtered) && (offset || limit !== undefined)
            ? filtered.slice(
                offset,
                limit !== undefined ? offset + limit : undefined,
              )
            : filtered;
        const grandTotal = Array.isArray(filtered) ? filtered.length : 1;

        const { rows } = capRows(windowed);
        const owned = markOwnership(
          rows,
          currentUserId,
          tool.action.redact?.handle,
        );
        // Real rows for `resource_table` joins; only the redacted copy leaves
        // the browser (and is what every transcript resend replays).
        toolResults.record(owned);
        const safe = tool.action.redact
          ? redactor.redact(owned, tool.action.redact)
          : owned;

        const applied = Object.fromEntries(
          Object.entries(input).filter(([k]) =>
            (LIST_PARAMS as readonly string[]).includes(k),
          ),
        );
        return {
          content: serializeBounded(safe, grandTotal, offset, applied),
          isError: false,
        };
      } catch (err) {
        return {
          content: TEXT.apiUnreachable((err as Error).message),
          isError: true,
        };
      }
    },
    [netbirdFetch, currentUserId, router, pathname],
  );
}
