/**
 * What went wrong in a turn, in labels you can group by.
 *
 * Two signals, both read off the transcript the caller already sends — no new
 * endpoint, no extra round trip:
 *
 *  - **Tool failures.** A failed step comes back on the NEXT request as a
 *    `tool_result` with `is_error`, and its text was written by us (the dashboard
 *    executor and the canvas bridge), so it classifies into a bounded set of
 *    reasons. "cc_node failed 40 times this week, 38 of them bad_argument" is the
 *    difference between guessing and knowing — that exact shape was a field the
 *    executor forgot to pass through, invisible in aggregate until it was counted.
 *  - **User sentiment.** Swearing at the assistant is the loudest signal there is
 *    that a turn went wrong, and it's the one users don't file a bug about. Counted
 *    as a KIND, never a quote, and it changes nothing about the answer — this is
 *    measurement, not moderation.
 *
 * Both are deliberately keyword/pattern based: cheap, deterministic, and honest
 * about being approximate. A wrong bucket is a slightly wrong dashboard, which is
 * the right price for zero added latency.
 */

/**
 * Failure reasons, ordered specific → general. Bounded on purpose: these are
 * Prometheus label values, and an unbounded set is a broken metric.
 */
export type FailureReason =
  /** A handle the model passed doesn't resolve — wrong node, wrong kind, gone. */
  | "bad_reference"
  /** A required field was missing or empty in the call. */
  | "missing_argument"
  /** The action isn't allowed here (live mode, wrong node type, not in a draft). */
  | "not_permitted"
  /** The surface the tool needs isn't there (canvas not mounted, page absent). */
  | "surface_unavailable"
  /** Dashboard is older than the server's tool registry. */
  | "version_skew"
  /** The management API said no. */
  | "api_error"
  /** The user (or a timeout) stopped it. */
  | "aborted"
  /** Classified nothing — read the sample text and add a pattern. */
  | "unknown";

const REASON_PATTERNS: readonly [RegExp, FailureReason][] = [
  [/not available in this dashboard version/i, "version_skew"],
  [/isn't (a|the) [\w\s-]*?(node|frame|group|page)|no [\w\s-]*matches|not found|isn't on the canvas|has no id/i, "bad_reference"],
  [/\bneeds?\b|\brequires?\b|is required|\bmissing\b|must (be )?(set|given|provided|passed)/i, "missing_argument"],
  [/only works in a draft|not in a draft|live mode|read-only|can(no|')t be (renamed|removed|deleted)|isn't allowed|refus/i, "not_permitted"],
  [/control cent(er|re) (isn't|is not) (open|mounted)|couldn't open|no canvas/i, "surface_unavailable"],
  [/\b(4\d{2}|5\d{2})\b|api (error|said)|request failed|unauthori[sz]ed|forbidden/i, "api_error"],
  [/abort|cancell?ed|timed out/i, "aborted"],
];

/** Bucket one failed tool result. `text` is what the tool told the model. */
export function classifyToolFailure(text: string): FailureReason {
  for (const [pattern, reason] of REASON_PATTERNS) {
    if (pattern.test(text)) return reason;
  }
  return "unknown";
}

/**
 * How the user is talking to the assistant, when it's worth knowing.
 *
 * `frustration` is the useful one and the easiest to miss: "still not working",
 * "I already told you" is a failed turn reported in the only way most people ever
 * report one. `profanity` and `abuse` are split because they mean different things
 * — swearing at a broken feature is feedback, abuse aimed at the assistant is not.
 */
export type SentimentKind = "frustration" | "profanity" | "abuse";

// Word-boundary matched, lower-cased input. Short lists on purpose: these are
// signals to count, and a long lexicon buys precision nobody reads.
const PROFANITY =
  /\b(fuck\w*|shit\w*|crap|damn|bloody|bullshit|arse|ass|piss|scheiss?e|kacke|verdammt)\b/i;
const ABUSE =
  /\b(you'?re (an? )?(idiot|stupid|useless|garbage|trash|dumb|moron)|stupid (bot|ai|assistant)|useless (bot|ai|assistant)|shut up|idiot|moron|dumbass)\b/i;
const FRUSTRATION =
  /\b(still (not|doesn'?t|does not|isn'?t)|again\?|not working|doesn'?t work|didn'?t work|broken|wrong again|i (already )?(told|said)|why (is|does|can'?t|won'?t)|makes no sense|come on|seriously\?|are you kidding)\b/i;

/**
 * The kinds present in one user message. Both an insult and frustration can be
 * true of the same sentence, and collapsing them would lose the reason.
 */
export function detectSentiment(text: string): SentimentKind[] {
  if (!text.trim()) return [];
  const kinds: SentimentKind[] = [];
  if (FRUSTRATION.test(text)) kinds.push("frustration");
  if (PROFANITY.test(text)) kinds.push("profanity");
  if (ABUSE.test(text)) kinds.push("abuse");
  return kinds;
}
