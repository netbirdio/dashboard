import type { DraftChange } from "@/modules/control-center/draft/DraftChangesetContext";

// Text the assistant reads can carry instructions, so the review must show
// which changes it made. A mark survives the user editing the change afterwards.
export function markAssistantChanges(
  prev: readonly DraftChange[],
  next: readonly DraftChange[],
  marked: ReadonlySet<string>,
  assistantActing: boolean,
): ReadonlySet<string> {
  const present = new Set(next.map((c) => c.id));
  const out = new Set([...marked].filter((id) => present.has(id)));
  if (assistantActing) {
    const before = new Set(prev);
    for (const change of next) if (!before.has(change)) out.add(change.id);
  }
  const unchanged =
    out.size === marked.size && [...out].every((id) => marked.has(id));
  return unchanged ? marked : out;
}
