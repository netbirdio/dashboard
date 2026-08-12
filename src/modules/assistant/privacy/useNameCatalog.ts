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
        if (typeof row?.id === "string" && typeof row?.name === "string") {
          entries.push({ name: row.name, type, id: row.id });
        }
      }
    }

    return entries;
  }, [cache]);
}
