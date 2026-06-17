// Phase 1 (issue #5989) connection-mode options for the dashboard.
// Two modes are visible in Phase 1; relay-forced and p2p-dynamic remain
// admin-only (settable via API/CLI/env) and are kept out of the dropdown
// to avoid surprising the typical admin.

import { SelectOption } from "@components/select/SelectDropdown";

export type ConnectionModeValue =
  | "p2p"
  | "p2p-lazy"
  | "p2p-dynamic"
  | "relay-forced";

export interface ModeMeta {
  value: ConnectionModeValue;
  label: string;
  visible: boolean;
  showsRelayTimeout: boolean;
  showsP2pTimeout: boolean;
}

export const MODE_META: Record<ConnectionModeValue, ModeMeta> = {
  "p2p": {
    value: "p2p",
    label: "P2P (recommended)",
    visible: true,
    showsRelayTimeout: false,
    showsP2pTimeout: false,
  },
  "p2p-lazy": {
    value: "p2p-lazy",
    label: "P2P Lazy",
    visible: true,
    showsRelayTimeout: true,
    showsP2pTimeout: false,
  },
  "p2p-dynamic": {
    value: "p2p-dynamic",
    label: "P2P Dynamic",
    visible: false, // Phase-1 hides; backend still accepts via API
    showsRelayTimeout: true,
    showsP2pTimeout: true,
  },
  "relay-forced": {
    value: "relay-forced",
    label: "Relay Forced",
    visible: false, // Phase-1 admin-only
    showsRelayTimeout: false,
    showsP2pTimeout: false,
  },
};

export const VISIBLE_MODE_OPTIONS: SelectOption[] = Object.values(MODE_META)
  .filter((m) => m.visible)
  .map((m) => ({ label: m.label, value: m.value }));

// Defaults shown as placeholders when DB value is NULL.
export const DEFAULT_RELAY_TIMEOUT_SECONDS = 5 * 60; // 5 min
export const DEFAULT_P2P_TIMEOUT_SECONDS = 180 * 60; // 180 min

// resolveLegacyLazyBool mirrors the server-side fallback: if the new
// connection_mode field is null/undefined, derive the effective mode from
// the legacy lazy_connection_enabled boolean. Used to seed the dropdown
// state when a user opens an account that has never set the new field.
export function resolveLegacyLazyBool(
  lazyEnabled: boolean | undefined,
): ConnectionModeValue {
  return lazyEnabled ? "p2p-lazy" : "p2p";
}

// modeImpliesLegacyLazy is the inverse: when the user picks a mode in the
// dashboard, we ALSO write the legacy lazy_connection_enabled boolean to
// keep older daemon versions (which only understand the boolean) in sync.
// relay-forced and p2p-dynamic both map to false because the legacy boolean
// cannot express their semantics.
export function modeImpliesLegacyLazy(mode: ConnectionModeValue): boolean {
  return mode === "p2p-lazy";
}
