/**
 * "Thinking…" → what it is actually thinking about.
 *
 * The reasoning stream is the only honest source for this, and it arrives as
 * ordinary prose in first person ("I need to check which peers route that
 * network…"). A status line is one short phrase in a 400px panel, so this takes
 * the sentence being written and compresses it: drop the throat-clearing that
 * starts most reasoning sentences, keep the verb phrase, cap the length.
 *
 * Deliberately dumb — no model call, no second round trip. A status line is worth
 * a regex, not a token budget, and a wrong guess costs nothing: the fallback is
 * the word we showed before.
 *
 * Pure and unit-tested: it renders text the user reads, from text no one wrote
 * for them.
 */

/** Longest phrase the status line can show before it wraps in the panel. */
const MAX_CHARS = 52;

/**
 * Openers that carry no information — every model writes them, and "Let me check
 * which peers…" says nothing more than "…which peers".
 */
const FILLER = [
  /^(ok(ay)?|so|now|alright|right|hmm+|well|actually|but|and|also)\b[\s,:—-]*/i,
  /^(let me|let's|i'll|i will|i need to|i should|i want to|i have to|i must|i can|we need to|we should)\s+/i,
  // "I'm checking the peers" → "checking the peers": the subject is never in
  // doubt, and dropping it makes the line read like a progress label.
  /^(i'?m|i am|we'?re|we are)\s+/i,
  /^(first|next|then|finally|however|therefore|basically|essentially)\b[\s,:—-]*/i,
  /^(the user (is )?(asking|wants|said|says|means|wrote)( for| to| that)?)\s*/i,
  /^(i think|it (looks|seems) like|apparently|presumably)\s+/i,
];

/** Sentence-ish boundaries. Newlines count: reasoning often writes in fragments. */
const BOUNDARY = /[.!?\n]+/;

/**
 * The last sentence the reasoning has started — that's what it's thinking about
 * NOW. A trailing fragment (no terminator yet) is preferred over the completed
 * sentence before it.
 */
function latestClause(text: string): string {
  const parts = text
    .split(BOUNDARY)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

const stripFiller = (text: string): string => {
  let out = text;
  // Repeatedly: "Okay, let me check the peers" sheds two prefixes, not one.
  for (let pass = 0; pass < FILLER.length; pass++) {
    const before = out;
    for (const pattern of FILLER) out = out.replace(pattern, "");
    if (out === before) break;
  }
  return out.trim();
};

/** Cut at a word boundary, never mid-word, and never on a dangling comma. */
const clip = (text: string): string => {
  if (text.length <= MAX_CHARS) return text.replace(/[,;:\s]+$/, "");
  const cut = text.slice(0, MAX_CHARS);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > MAX_CHARS / 2 ? cut.slice(0, lastSpace) : cut)
    .replace(/[,;:\s]+$/, "")
    .concat("…");
};

/**
 * A status line for the reasoning so far, or null when there's nothing worth
 * showing yet — the caller keeps whatever it was showing before.
 *
 * `restore` maps placeholders back to real names, so the line reads "checking
 * eduards-macbook" rather than "checking {PEER_3}". It runs LAST, on the clipped
 * phrase, so a long peer name can't push the line over its budget by much.
 */
export function thinkingStatus(
  reasoning: string,
  restore: (text: string) => string = (t) => t,
): string | null {
  const clause = stripFiller(latestClause(reasoning));
  // Too short to mean anything ("Yes", "Wait") — mid-thought, not a thought.
  if (clause.length < 12) return null;

  const phrase = clip(clause);
  // Sentence case: the fragment usually starts lowercase after the filler cut,
  // and a capital mid-phrase reads like a new sentence.
  return restore(phrase.charAt(0).toUpperCase() + phrase.slice(1));
}
