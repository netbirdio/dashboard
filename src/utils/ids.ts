type IdLike = { id?: string } | string;

/**
 * Map ids or `{ id }` objects to a list of ids, dropping empties. Older
 * management versions return group members and similar lists as objects,
 * newer ones as plain id strings; readers must accept both.
 */
export const toIds = (items?: IdLike[] | null): string[] =>
  (items ?? [])
    .map((i) => (typeof i === "string" ? i : i?.id))
    .filter(Boolean) as string[];
