/**
 * Names the user types → the tokens the model already knows.
 *
 * Pseudonymization is one-way by design: the model sees `{PEER_1}`, never
 * `eduards-macbook`. That's fine until the user *says* "eduards-macbook", at
 * which point the model is holding a word it has never seen and a list of
 * tokens it can't match it to — so it lists everything and asks, or guesses.
 *
 * This closes the loop from the other side. Before a message goes out, any
 * resource name in it is swapped for that resource's token. The name never
 * leaves the browser, the intent does, and the token lines up with whatever a
 * later tool result returns.
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
}

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
 * Swap every known resource name in `text` for its token, minting one only for
 * the names that actually appear. Longest names first, so `build-runner-01`
 * wins over a group that happens to be called `build`.
 *
 * Idempotent: a message that already contains tokens is left alone, since a
 * token contains no name to match.
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
    // `handle` is stable per id, so this is the same token the tools produce.
    out = out.replace(matcher(entry.name.trim()), () =>
      redactor.handle(entry.type, entry.id, entry.name),
    );
  }

  return out;
}
