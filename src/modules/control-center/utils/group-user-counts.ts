import { User } from "@/interfaces/User";
import type { DraftChange } from "@/modules/control-center/draft/DraftChangesetContext";

/**
 * Users per group, counted from the DRAFT view of membership rather than the
 * account's. A queued `update-user-groups` carries the user's WHOLE ref list
 * (the PUT replaces it), so it stands in for their live `auto_groups`.
 *
 * Deriving this instead of caching a count is what makes a discard or an undo
 * reach the canvas: a pinned number outlives the change it was taken from.
 *
 * Keyed by REF — a live group's id, a draft group's name — the same union the
 * changeset carries.
 */
export const groupUserCounts = (
  users: User[] | undefined,
  changes: DraftChange[],
  isDraft: boolean,
): Map<string, number> => {
  const pending = new Map<string, string[]>();
  if (isDraft) {
    changes.forEach((c) => {
      if (c.type === "update-user-groups") pending.set(c.userId, c.groupRefs);
    });
  }
  const counts = new Map<string, number>();
  users?.forEach((u) => {
    const refs = (u.id ? pending.get(u.id) : undefined) ?? u.auto_groups ?? [];
    refs.forEach((ref) => counts.set(ref, (counts.get(ref) ?? 0) + 1));
  });
  return counts;
};

/** Stable key for the entries above, so an unrelated draft edit doesn't recompute. */
export const userGroupChangeSignature = (changes: DraftChange[]): string =>
  changes
    .filter((c) => c.type === "update-user-groups")
    .map((c) => `${c.userId}:${c.groupRefs.join("|")}`)
    .join(",");
