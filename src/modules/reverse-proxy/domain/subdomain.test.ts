import { isValidSubdomain, sanitizeSubdomain } from "./subdomain.js";

type Case<T> = { input: string; expected: T; desc?: string };

function run<T>(name: string, cases: Case<T>[], fn: (s: string) => T): number {
  console.log(`\n=== ${name} ===`);
  let failures = 0;
  for (const { input, expected, desc } of cases) {
    const actual = fn(input);
    const ok = actual === expected;
    if (!ok) failures++;
    const label = desc
      ? `${JSON.stringify(input)} (${desc})`
      : JSON.stringify(input);
    console.log(
      `${ok ? "✓" : "✗"} ${label.padEnd(40)} → ${JSON.stringify(actual)}` +
        (ok ? "" : ` (expected: ${JSON.stringify(expected)})`),
    );
  }
  return failures;
}

let failures = 0;

failures += run<string>(
  "sanitizeSubdomain",
  [
    { input: "dev.app", expected: "dev.app", desc: "keeps dots (#667)" },
    { input: "a.b.c.d", expected: "a.b.c.d", desc: "deeply nested" },
    { input: "DEV.App", expected: "dev.app", desc: "lowercased" },
    { input: "my-app", expected: "my-app", desc: "keeps hyphens" },
    { input: "dev.app!", expected: "dev.app", desc: "strips punctuation" },
    { input: "dev app", expected: "devapp", desc: "strips spaces" },
    { input: "dev_app", expected: "devapp", desc: "strips underscores" },
    { input: "dev.", expected: "dev.", desc: "in-progress typing survives" },
    { input: "", expected: "" },
  ],
  sanitizeSubdomain,
);

failures += run<boolean>(
  "isValidSubdomain",
  [
    { input: "myapp", expected: true, desc: "single label" },
    { input: "dev.app", expected: true, desc: "multi-label (#667)" },
    { input: "a.b.c.d", expected: true, desc: "deeply nested" },
    { input: "my-app.dev", expected: true, desc: "hyphenated label" },
    { input: "", expected: true, desc: "empty handled by require_subdomain" },
    { input: ".app", expected: false, desc: "leading dot" },
    { input: "dev.", expected: false, desc: "trailing dot" },
    { input: "dev..app", expected: false, desc: "consecutive dots" },
    { input: ".", expected: false, desc: "bare dot" },
    { input: "..", expected: false, desc: "bare dots" },
  ],
  isValidSubdomain,
);

console.log(`\n${failures} test(s) failed`);
process.exit(failures > 0 ? 1 : 0);
