/**
 * A name and an icon for the context chip.
 *
 * Read out of SWR's cache rather than fetched: whatever page put the user in
 * this context already loaded the list it came from, so the row is sitting
 * there. That keeps the chip free — no request of its own, nothing to fail, and
 * nothing to wait for beyond what the page was waiting for anyway.
 *
 * A miss (deep link, cache evicted) falls back to the resource kind, which is
 * still true and still useful to the model.
 */
"use client";

import { FolderGit2Icon, MonitorSmartphone, NetworkIcon } from "lucide-react";
import { useSWRConfig } from "swr";
import type {
  AssistantContextEntry,
  AssistantContextType,
} from "./AssistantContextProvider";

/** Where each kind's rows live, keyed the way `useFetchApi` keys them. */
const SOURCES: Partial<Record<AssistantContextType, string[]>> = {
  peer: ["/peers"],
  group: ["/groups"],
  network: ["/networks"],
  // Users are fetched split by kind, never as a plain `/users`, so both lists
  // have to be searched — a service user is on the second one.
  user: ["/users?service_user=false", "/users?service_user=true"],
};

/**
 * The icon each surface already uses elsewhere in the dashboard, so the chip
 * names a page the user recognises rather than inventing a symbol for it.
 * `settings` and `integration` are absent: they're drawn by the chip itself
 * from the tab's own icon and the nav's integration mark.
 */
const ICONS: Partial<Record<AssistantContextType, typeof NetworkIcon>> = {
  // Peers fall back to this; a known OS shows its own logo instead.
  peer: MonitorSmartphone,
  group: FolderGit2Icon,
  network: NetworkIcon,
};

/** Human name for the kind itself, when the row can't be found. */
const KINDS: Record<AssistantContextType, string> = {
  peer: "Peer",
  group: "Group",
  network: "Network",
  user: "User",
  settings: "Settings",
  integration: "Integration",
};

interface CachedRow {
  id?: string;
  name?: string;
  email?: string;
  os?: string;
  is_service_user?: boolean;
}

export interface ContextChip {
  /** What the chip shows — falls back to the kind when the row isn't cached. */
  label: string;
  /**
   * The resource's real name, and only that. Separate from `label` because it
   * feeds the placeholder's display value: minting `{PEER_1}` as "Peer" would
   * put that word in the answer wherever the model used the token.
   */
  name?: string;
  kind: string;
  /** Absent for the surfaces the chip draws itself (settings, integrations). */
  Icon?: typeof NetworkIcon;
  /** Peers only — the chip shows what kind of machine it is. */
  os?: string;
  /** Users only — the chip shows the avatar (or icon) from their row. */
  user?: {
    name?: string;
    email?: string;
    id?: string;
    isServiceUser?: boolean;
  };
}

export function useContextChip(entry: AssistantContextEntry): ContextChip {
  const { cache } = useSWRConfig();

  const row = entry.id
    ? (SOURCES[entry.type] ?? [])
        .flatMap(
          (key) => (cache.get(key)?.data as CachedRow[] | undefined) ?? [],
        )
        .find((candidate) => candidate?.id === entry.id)
    : undefined;

  return {
    label: row?.name || row?.email || entry.label || KINDS[entry.type],
    name: row?.name || row?.email,
    kind: KINDS[entry.type],
    Icon: ICONS[entry.type],
    os: row?.os,
    user:
      entry.type === "user"
        ? {
            name: row?.name,
            email: row?.email,
            id: entry.id,
            isServiceUser: row?.is_service_user,
          }
        : undefined,
  };
}
