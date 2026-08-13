/**
 * Every resource name the dashboard currently has loaded, for the rewriter.
 *
 * Read from SWR's cache rather than fetched, like the context chip: the lists
 * are already there because the user was just looking at them, and the
 * assistant has no business issuing requests of its own to build a lookup
 * table. A resource the dashboard hasn't loaded simply isn't matched.
 *
 * Returned as a getter, not a value — it's read at send time, so it picks up
 * anything loaded since the panel opened without re-rendering the runtime.
 */
"use client";

import { useCallback } from "react";
import { useSWRConfig } from "swr";
import type { PlaceholderType } from "./redaction";
import type { CatalogEntry } from "./rewriteNames";

/** SWR keys the dashboard fetches, and what kind of thing each one holds. */
const SOURCES: { key: string; type: PlaceholderType }[] = [
  { key: "/peers", type: "peer" },
  { key: "/groups", type: "group" },
  { key: "/policies", type: "policy" },
  { key: "/networks", type: "network" },
  { key: "/routes", type: "route" },
  { key: "/dns/nameservers", type: "nsgroup" },
  { key: "/setup-keys", type: "setup_key" },
  { key: "/users?service_user=false", type: "user" },
  { key: "/users?service_user=true", type: "user" },
];

/**
 * Identifying fields that are values in their own right rather than resources.
 *
 * Two jobs. Hostnames and DNS labels have no structure a pattern could catch, so
 * this is the only way they get tokenised at all. Addresses and emails DO get
 * matched structurally by `rewriteNames` (so they work even when the dashboard
 * has nothing loaded) — listing them here adds the thing a pattern can't know:
 * which resource the value belongs to, which becomes the model's attribution
 * note. Same token either way, so the two passes can't disagree.
 */
const SCALAR_FIELDS: Record<
  string,
  { field: string; type: PlaceholderType; label?: string }[]
> = {
  "/peers": [
    { field: "dns_label", type: "dns", label: "DNS label" },
    { field: "hostname", type: "dns" },
    { field: "ip", type: "ip" },
    { field: "ipv6", type: "ip" },
    { field: "connection_ip", type: "ip" },
  ],
  "/users?service_user=false": [{ field: "email", type: "email" }],
  "/users?service_user=true": [{ field: "email", type: "email" }],
};

interface CachedRow {
  id?: unknown;
  name?: unknown;
}

export function useNameCatalog(): () => CatalogEntry[] {
  const { cache } = useSWRConfig();

  return useCallback(() => {
    const entries: CatalogEntry[] = [];

    for (const { key, type } of SOURCES) {
      const rows = cache.get(key)?.data as CachedRow[] | undefined;
      if (!Array.isArray(rows)) continue;

      for (const row of rows) {
        const id = typeof row?.id === "string" ? row.id : undefined;
        const name = typeof row?.name === "string" ? row.name : undefined;
        if (id && name) entries.push({ name, type, id });

        for (const scalar of SCALAR_FIELDS[key] ?? []) {
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
  }, [cache]);
}
