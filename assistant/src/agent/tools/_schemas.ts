// Input schemas shared by more than one tool. Each is a single object handed
// to a dozen tools by reference, so they are frozen all the way down: an
// accidental write here would silently rewrite every sharer's model-facing
// contract.

function deepFreeze<T>(value: T): Readonly<T> {
  if (value !== null && typeof value === "object") {
    for (const nested of Object.values(value)) deepFreeze(nested);
    Object.freeze(value);
  }
  return value;
}

export const emptyInput: Readonly<Record<string, unknown>> = deepFreeze({
  type: "object",
  properties: {},
});

// Shared by every list tool. All three run in the dashboard over the FULL
// list before any truncation, so they are how big accounts stay answerable.
export const listInput: Readonly<Record<string, unknown>> = deepFreeze({
  type: "object",
  properties: {
    filters: {
      type: "object",
      description:
        'Exact-match filters, field → value, tokens allowed: {"activity_code": "user.peer.add"}, {"connected": true}, ' +
        '{"initiator_id": "[USER_2]"}. Array fields match by containment.',
    },
    since: {
      type: "string",
      description:
        "ISO timestamp — keep rows from it onward (an event's `timestamp`, a peer's `last_seen`).",
    },
    until: {
      type: "string",
      description: "ISO timestamp — keep rows up to it.",
    },
    query: {
      type: "string",
      description:
        "Keep only rows containing this value — a token or plain text, matched case-insensitively across all fields.",
    },
    sort_by: {
      type: "string",
      description:
        "Sort the whole list by this field before anything is returned. Dates, numbers and text all work. " +
        "'First/earliest X' is sort_by the time field with order asc — never paged for.",
    },
    order: {
      type: "string",
      enum: ["asc", "desc"],
      description: "Sort direction for `sort_by` (default asc).",
    },
    offset: {
      type: "number",
      description: "Skip this many rows; use `next_offset` from a truncated result to page.",
    },
    limit: {
      type: "number",
      description:
        "Return at most this many rows (max 200). With sort_by, `limit: 1` fetches an extreme in one call.",
    },
    count_by: {
      type: "string",
      description:
        "Return counts grouped by this field instead of rows — the way to answer 'how many … by …' over the whole list. " +
        "Combines with filters/since/until/query.",
    },
  },
});
