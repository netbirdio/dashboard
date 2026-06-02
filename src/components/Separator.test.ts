/**
 * Tests for Separator component class string.
 *
 * The PR changed the background class from "bg-zinc-700/40" to
 * "bg-nb-gray-800/40" so the separator follows the new theme-aware
 * nb-gray colour system instead of the hard-coded zinc colour.
 *
 * Because Separator is a trivial presentational component (no logic), we
 * verify the component source text directly rather than rendering it.
 *
 * Run with: npx tsx src/components/Separator.test.ts
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dir = dirname(__filename);
const source = readFileSync(join(__dir, "Separator.tsx"), "utf-8");

type Check = { desc: string; pattern: RegExp | string; shouldMatch: boolean };

const checks: Check[] = [
  {
    desc: "uses nb-gray-800/40 background",
    pattern: "bg-nb-gray-800/40",
    shouldMatch: true,
  },
  {
    desc: "does NOT use the old zinc-700/40 background",
    pattern: "bg-zinc-700/40",
    shouldMatch: false,
  },
  {
    desc: "still renders a span element",
    pattern: "<span",
    shouldMatch: true,
  },
  {
    desc: "still includes height and width classes",
    pattern: "h-[1px]",
    shouldMatch: true,
  },
  {
    desc: "w-full present",
    pattern: "w-full",
    shouldMatch: true,
  },
  {
    desc: "block display class present",
    pattern: /\bblock\b/,
    shouldMatch: true,
  },
];

let failures = 0;
console.log("=== Separator source checks ===");

for (const { desc, pattern, shouldMatch } of checks) {
  const matched =
    pattern instanceof RegExp ? pattern.test(source) : source.includes(pattern as string);
  const ok = matched === shouldMatch;
  if (!ok) failures++;
  console.log(
    `${ok ? "✓" : "✗"} ${desc}` +
      (ok ? "" : `  [expected shouldMatch=${shouldMatch}]`),
  );
}

// Boundary: the class attribute should contain exactly the expected string
const classMatch = source.match(/className=\{["']([^"']+)["']\}/);
if (classMatch) {
  const classValue = classMatch[1];
  const ok = classValue.includes("bg-nb-gray-800/40") && !classValue.includes("bg-zinc-700/40");
  if (!ok) failures++;
  console.log(
    `${ok ? "✓" : "✗"} className attribute has bg-nb-gray-800/40 and not bg-zinc-700/40` +
      (ok ? "" : `  (className: "${classValue}")`),
  );
}

console.log(`\n${failures} test(s) failed`);
process.exit(failures > 0 ? 1 : 0);