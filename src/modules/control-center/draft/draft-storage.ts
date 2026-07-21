import { Edge, Node } from "@xyflow/react";
import type { DraftChange } from "@/modules/control-center/draft/DraftChangesetContext";

// localStorage (not IndexedDB) because the draft is a small JSON payload that
// benefits from synchronous reads on mount. Everything is destroyed together
// on Cancel / Deploy / switch-to-live via clearDraftStorage().
const CHANGES_KEY = "netbird-control-center-draft-changes";
const CANVAS_KEY = "netbird-control-center-draft-canvas";

// Kept in sync with the DraftChange union — persisted entries with unknown
// (e.g. outdated) types are dropped on load.
const KNOWN_CHANGE_TYPES = new Set([
  "create-group",
  "update-group",
  "delete-group",
  "create-policy",
  "update-policy",
  "delete-policy",
  "create-network",
  "create-resource",
  "create-router",
  "update-resource",
  "delete-resource",
]);

export function loadDraftChanges(): DraftChange[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CHANGES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((c) => KNOWN_CHANGE_TYPES.has(c?.type));
  } catch {
    return [];
  }
}

export function saveDraftChanges(changes: DraftChange[]) {
  if (typeof window === "undefined") return;
  try {
    if (changes.length === 0) {
      window.localStorage.removeItem(CHANGES_KEY);
    } else {
      window.localStorage.setItem(CHANGES_KEY, JSON.stringify(changes));
    }
  } catch {
    // Storage full/unavailable — draft simply won't survive a reload.
  }
}

type DraftCanvas = { nodes: Node[]; edges: Edge[] };

// Node data can hold a Set (addedMembers) — store it as an array.
const replacer = (_key: string, value: unknown) =>
  value instanceof Set ? Array.from(value) : value;

export function saveDraftCanvas(nodes: Node[], edges: Edge[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CANVAS_KEY,
      JSON.stringify({ nodes, edges }, replacer),
    );
  } catch {
    // Storage full/unavailable — draft simply won't survive a reload.
  }
}

export function loadDraftCanvas(): DraftCanvas | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CANVAS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftCanvas;
    if (!Array.isArray(parsed?.nodes) || !Array.isArray(parsed?.edges)) {
      return null;
    }
    parsed.nodes = parsed.nodes.map((n) => {
      const addedMembers = (n.data as any)?.addedMembers;
      if (Array.isArray(addedMembers)) {
        return {
          ...n,
          data: { ...n.data, addedMembers: new Set(addedMembers) },
        };
      }
      return n;
    });
    return parsed;
  } catch {
    return null;
  }
}

export function clearDraftStorage() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CHANGES_KEY);
    window.localStorage.removeItem(CANVAS_KEY);
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}
