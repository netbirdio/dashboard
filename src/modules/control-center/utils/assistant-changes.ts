import type { DraftChange } from "@/modules/control-center/draft/DraftChangesetContext";

/**
 * The ids of the changes the assistant made or touched, carried from one
 * changeset to the next. A change is the assistant's when it appeared or was
 * replaced while the assistant held the canvas. The mark stays when the user
 * edits the change afterwards, since what the assistant put in it still needs
 * checking, and goes when the change leaves the changeset.
 *
 * Text the assistant reads can carry instructions, so the review before deploy
 * has to show which changes came from it rather than from the user.
 */
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
