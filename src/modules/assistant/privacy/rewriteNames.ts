/**
 * Identifiers the user types → the tokens the model already knows.
 *
 * Pseudonymization is one-way by design: the model sees `{PEER_1}`, never
 * `eduards-macbook`. That's fine until the user *says* "eduards-macbook", at
 * which point the model is holding a word it has never seen and a list of
 * tokens it can't match it to — so it lists everything and asks, or guesses.
 *
 * This closes the loop from the other side. Before a message goes out, any
 * identifier in it is swapped for the token that identifier's data carries. The
 * real value never leaves the browser, the intent does, and the token is the
 * *same* one a later tool result returns — `Redactor.mint` keys on the real
 * value, so minting from what the user typed and minting from a redacted `/peers`
 * row produce one token either way round. That's what makes "where is
 * 100.84.175.167?" answerable: the model looks for `{IP_7}` and finds it on a
 * peer row.
 *
 * Two passes, because identifiers come in two flavours:
 *  - names, which have no structure and so must be recognised from the
 *    dashboard's own loaded data (`catalog`);
 *  - addresses and emails, which are structural and are matched by pattern, so
 *    they work even for values the dashboard hasn't loaded (and for values that
 *    aren't in the account at all — the model gets a token it can pass into a
 *    tool input, and the executor resolves it back).
 *
 * Anything this misses is still caught by the assistant server's own PII vault
 * (`src/guardrails/pii.ts` there, minting a separate `{REDACTED_IP_1}`
 * namespace) — but that backstop is per-request and can't line up with the
 * account data, which is exactly why the matching has to happen here.
 *
 * Pure and unit-testable on purpose: this edits what the user said, which is
 * the one thing in the pipeline that must never surprise them.
 */
import type { PlaceholderType, Redactor } from "./redaction";

export interface CatalogEntry {
  /** The real, human name as it appears in the dashboard. */
  name: string;
  type: PlaceholderType;
  /** Resource id — what the token is keyed on. */
  id: string;
  /**
   * The entry IS its own value (a peer's DNS label, not a resource with an id).
   * Minted as a scalar placeholder, so it collides with the same value coming
   * back from a tool result instead of being keyed on some id.
   */
  scalar?: boolean;
  /**
   * For a scalar: the resource the value belongs to, and the field it sits in.
   * Not used for the rewrite itself — it's what `attributeIdentifiers` turns into
   * a note for the model.
   */
  owner?: { type: PlaceholderType; id: string; name?: string; field: string };
}

/**
 * Structural identifiers, matched without any knowledge of the account. Mirrors
 * the server's backstop patterns deliberately: same shapes, but minted into the
 * frontend's token namespace where they can match real data.
 *
 * CIDR before bare IPv4, so the mask isn't left dangling. IPv6 only in its
 * uncompressed form (3+ hextet groups), so short hex runs in ordinary text
 * don't match.
 */
const SCALAR_PATTERNS: readonly [RegExp, PlaceholderType][] = [
  [/\b(?:\d{1,3}\.){3}\d{1,3}\/\d{1,2}\b/g, "cidr"],
  [/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "ip"],
  [/\b(?:[0-9a-fA-F]{1,4}:){3,}[0-9a-fA-F]{1,4}\b/g, "ip"],
  [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "email"],
];

/**
 * Names too generic to swap. NetBird ships a group called "All", and rewriting
 * the word "all" would turn "list all peers" into nonsense; the rest are words
 * that appear in ordinary sentences about a network far more often than they
 * appear as the name of the thing being discussed.
 *
 * A resource with one of these names simply doesn't get matched — the model
 * falls back to asking, which is what it does today.
 */
const TOO_GENERIC = new Set([
  "all",
  "any",
  "none",
  "peer",
  "peers",
  "group",
  "groups",
  "user",
  "users",
  "network",
  "networks",
  "policy",
  "policies",
  "route",
  "routes",
  "resource",
  "resources",
  "server",
  "servers",
  "client",
  "clients",
  "device",
  "devices",
  "admin",
  "admins",
  "default",
  "new",
  "test",
  "home",
  "office",
  "everyone",
]);

/** Shortest name worth matching: two characters hit far too much prose. */
const MIN_LENGTH = 3;

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * A name is matched as a whole word, where "word" includes the characters
 * hostnames are made of — `build-runner-01` shouldn't match inside
 * `build-runner-011`, and `db` shouldn't match inside `dbx`.
 */
const matcher = (name: string) =>
  new RegExp(`(?<![\\w.-])${escape(name)}(?![\\w.-])`, "gi");

const usable = (entry: CatalogEntry) =>
  entry.name.trim().length >= MIN_LENGTH &&
  !TOO_GENERIC.has(entry.name.trim().toLowerCase());

/**
 * Swap every known identifier in `text` for its token, minting one only for the
 * values that actually appear. Longest names first, so `build-runner-01` wins
 * over a group that happens to be called `build`.
 *
 * Idempotent: a message that already contains tokens is left alone — a token
 * holds no name, no address and no email to match.
 */
export function rewriteNames(
  text: string,
  catalog: readonly CatalogEntry[],
  redactor: Redactor,
): string {
  if (!text) return text;

  const candidates = catalog
    .filter(usable)
    .sort((a, b) => b.name.length - a.name.length);

  let out = text;
  for (const entry of candidates) {
    const pattern = matcher(entry.name.trim());
    if (!pattern.test(out)) continue;
    // Both mints are stable per real value, so this is the same token the tools
    // produce for the same resource / scalar.
    out = out.replace(matcher(entry.name.trim()), () =>
      entry.scalar
        ? redactor.placeholder(entry.type, entry.name)
        : redactor.handle(entry.type, entry.id, entry.name),
    );
  }

  // Runs last: the catalog's values may themselves contain a pattern (a resource
  // addressed by CIDR), and by now those are tokens, which match nothing here.
  for (const [pattern, type] of SCALAR_PATTERNS) {
    out = out.replace(pattern, (match) => redactor.placeholder(type, match));
  }

  return out;
}

/** How many attributions one message may carry (a pasted list is not a question). */
const MAX_NOTES = 20;

/**
 * Say which resource each typed address/hostname belongs to.
 *
 * A token alone only carries a KIND, and the kind is not what the user asked
 * about: told `{DNS_1}`, the model went looking at DNS settings, then guessed the
 * token was a peer id — two wrong turns before it thought to list the peers and
 * match the label itself. The dashboard already knows the answer (the value came
 * off a peer row), so it says so instead of making the model search for it:
 *
 *   `{DNS_1}` is the hostname of peer `{PEER_3}`
 *
 * Both sides are tokens, so this reveals nothing the model didn't already hold.
 * Called with the message as the user typed it, BEFORE the rewrite, and returns
 * the notes for the values that actually appear in it.
 */
export function attributeIdentifiers(
  text: string,
  catalog: readonly CatalogEntry[],
  redactor: Redactor,
): string[] {
  if (!text) return [];

  const notes = new Set<string>();
  for (const entry of catalog) {
    if (!entry.owner || !usable(entry)) continue;
    if (!matcher(entry.name.trim()).test(text)) continue;
    // Both mints are the ones the rewrite/tool results use, so the tokens in the
    // note are the tokens in the message.
    const value = redactor.placeholder(entry.type, entry.name);
    const owner = redactor.handle(
      entry.owner.type,
      entry.owner.id,
      entry.owner.name,
    );
    notes.add(
      `${value} is the ${entry.owner.field} of ${entry.owner.type} ${owner}`,
    );
    if (notes.size >= MAX_NOTES) break;
  }

  return [...notes];
}
