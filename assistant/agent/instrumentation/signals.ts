import { isToolUIPart, getToolName, type UIMessage } from "ai";
import { countToolFailure, countUserSentiment } from "@/instrumentation/metrics.ts";

export type FailureReason =
  | "bad_reference"
  | "missing_argument"
  | "not_permitted"
  | "surface_unavailable"
  | "version_skew"
  | "api_error"
  | "aborted"
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

export function classifyToolFailure(text: string): FailureReason {
  for (const [pattern, reason] of REASON_PATTERNS) {
    if (pattern.test(text)) return reason;
  }
  return "unknown";
}

export type SentimentKind = "frustration" | "profanity" | "abuse";

const PROFANITY = [
  /\b(fuck\w*|shit\w*|crap|damn|bloody|bullshit|arse|ass|piss|scheiss?e|kacke|verdammt)\b/i,
];
const ABUSE = [
  /\byou'?re (an? )?(idiot|stupid|useless|garbage|trash|dumb|moron)\b/i,
  /\b(stupid|useless) (bot|ai|assistant)\b/i,
  /\b(shut up|idiot|moron|dumbass)\b/i,
];
const FRUSTRATION = [
  /\bstill (not|doesn'?t|does not|isn'?t)\b/i,
  /\b(not working|doesn'?t work|didn'?t work|broken|wrong again|again\?)\b/i,
  /\bi (already )?(told|said)\b/i,
  /\bwhy (is|does|can'?t|won'?t)\b/i,
  /\b(makes no sense|come on|seriously\?|are you kidding)\b/i,
];

const anyMatch = (patterns: RegExp[], text: string): boolean =>
  patterns.some((p) => p.test(text));

export function detectSentiment(text: string): SentimentKind[] {
  if (!text.trim()) return [];
  const kinds: SentimentKind[] = [];
  if (anyMatch(FRUSTRATION, text)) kinds.push("frustration");
  if (anyMatch(PROFANITY, text)) kinds.push("profanity");
  if (anyMatch(ABUSE, text)) kinds.push("abuse");
  return kinds;
}

export interface SignalContext {
  requestId: string;
  conversationId?: string;
  accountId: string;
  userId: string;
  model?: string;
}

// Inspects only the NEWEST message so a replayed transcript can't double-count:
// a trailing user message carries the user's tone; a trailing assistant message
// means the dashboard just fulfilled client tool calls and is resubmitting, so
// its errored tool parts are the failures of this round.
export function collectTurnSignals(messages: UIMessage[], ctx: SignalContext): void {
  try {
    const last = messages.at(-1);
    if (!last) return;

    if (last.role === "user") {
      const text = last.parts.map((p) => (p.type === "text" ? p.text : "")).join("\n");
      for (const kind of detectSentiment(text)) countUserSentiment(kind);
      return;
    }

    if (last.role !== "assistant") return;
    for (const part of last.parts) {
      if (!isToolUIPart(part) || part.state !== "output-error") continue;
      const tool = getToolName(part);
      const reason = classifyToolFailure(part.errorText ?? "");
      countToolFailure(tool, reason);
      // Never include the error payload — tool results carry real account data.
      console.warn(
        JSON.stringify({
          event: "tool_failure",
          requestId: ctx.requestId,
          conversationId: ctx.conversationId,
          accountId: ctx.accountId,
          userId: ctx.userId,
          tool,
          reason,
          model: ctx.model,
        }),
      );
    }
  } catch (err) {
    console.error("turn signal collection failed:", (err as Error).message);
  }
}
