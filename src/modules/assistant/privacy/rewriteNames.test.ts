/**
 * Run with: npx tsx src/modules/assistant/privacy/rewriteNames.test.ts
 *
 * Follows the plain-script style of the other unit tests in this repo (see
 * `src/utils/ip.test.ts`) — no runner to configure, exits non-zero on failure.
 *
 * The rewriter edits what the user typed, so the cases that matter most are the
 * ones where it must NOT fire.
 */
import type { Redactor } from "./redaction";
import { type CatalogEntry, rewriteNames } from "./rewriteNames";

const CATALOG: CatalogEntry[] = [
  { name: "eduards-macbook", type: "peer", id: "p1" },
  { name: "build-runner-01", type: "peer", id: "p2" },
  { name: "build", type: "group", id: "g1" },
  { name: "Contractors", type: "group", id: "g2" },
  { name: "All", type: "group", id: "g3" },
  { name: "db", type: "peer", id: "p3" },
];

/** Enough of a `Redactor` for the rewriter: stable token per (type, id). */
function fakeRedactor(): Redactor {
  const seen = new Map<string, string>();
  const counts = new Map<string, number>();

  return {
    handle(type: string, id: string) {
      const key = `${type} ${id}`;
      const existing = seen.get(key);
      if (existing) return existing;
      const n = (counts.get(type) ?? 0) + 1;
      counts.set(type, n);
      const token = `{${type.toUpperCase()}_${n}}`;
      seen.set(key, token);
      return token;
    },
  } as unknown as Redactor;
}

let failures = 0;

function check(desc: string, input: string, expected: string) {
  const actual = rewriteNames(input, CATALOG, fakeRedactor());
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(
    `${ok ? "ok  " : "FAIL"} ${desc}\n     ${JSON.stringify(
      input,
    )}\n  -> ${JSON.stringify(actual)}${
      ok ? "" : `\n  want ${JSON.stringify(expected)}`
    }`,
  );
}

console.log("=== rewriteNames ===");

check("swaps a peer name", "is eduards-macbook online?", "is {PEER_1} online?");

check(
  "longest name wins over a shorter one it contains",
  "check build-runner-01",
  "check {PEER_1}",
);

check(
  "leaves a longer hostname alone",
  "check build-runner-011",
  "check build-runner-011",
);

check(
  "case-insensitive, keeps the rest of the sentence",
  "can CONTRACTORS reach it?",
  "can {GROUP_1} reach it?",
);

check(
  "skips names too generic to be meant as names",
  "list all peers and all groups",
  "list all peers and all groups",
);

check("skips names under three characters", "is db up?", "is db up?");

check(
  "does not match inside another word",
  "rebuild the buildkite runner",
  "rebuild the buildkite runner",
);

check(
  "already-tokenised text is untouched",
  "is {PEER_1} online?",
  "is {PEER_1} online?",
);

check(
  "two different resources in one sentence",
  "can Contractors reach eduards-macbook?",
  "can {GROUP_1} reach {PEER_1}?",
);

check("empty input", "", "");

console.log(`\n${failures} test(s) failed`);
process.exit(failures > 0 ? 1 : 0);
