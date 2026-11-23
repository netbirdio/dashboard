import { ExitNode } from "@/interfaces/ExitNode";
import type { DraftChange } from "@/modules/control-center/draft/DraftChangesetContext";

/**
 * Exit nodes as the draft sees them: the live ones with pending updates
 * applied and pending deletions left out, plus the ones created in this
 * draft (under their `new-…` client id). Cards, the editor and the panel all
 * read this, so a draft edit shows everywhere at once.
 */
export function applyExitNodeChanges(
  live: ExitNode[] | undefined,
  changes: DraftChange[],
): ExitNode[] {
  const result: ExitNode[] = (live ?? []).map((n) => ({ ...n }));
  const deleted = new Set<string>();

  changes.forEach((c) => {
    if (c.type === "update-exit-node") {
      const index = result.findIndex((n) => n.id === c.exitNodeId);
      if (index >= 0) result[index] = { id: c.exitNodeId, ...c.request };
    }
    if (c.type === "create-exit-node")
      result.push({ id: c.clientId, ...c.request });
    if (c.type === "delete-exit-node") deleted.add(c.exitNodeId);
  });

  return result.filter((n) => !deleted.has(n.id));
}
