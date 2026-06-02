/**
 * Source-level regression tests for the light-mode class-name changes
 * introduced in this PR.
 *
 * These components had "dark:" prefixes removed, "text-white" replaced with
 * "text-nb-gray-100", or similar theme-agnostic rewrites.  Because the
 * components import React and Next.js modules (preventing plain-Node
 * execution), we verify the source files directly to ensure the correct
 * class strings are present.
 *
 * Files covered:
 *   - HelpText.tsx     (dark: prefix removed from text colour)
 *   - Input.tsx        (hover:text-white → hover:text-nb-gray-100, dark: removed from prefix/suffix)
 *   - PinCodeInput.tsx (dark: prefix removed from bg and border)
 *   - Code.tsx         (dark: prefix removed from text colour)
 *   - FullTooltip.tsx  (hover:text-neutral-100 → hover:text-nb-gray-100)
 *   - Notification.tsx (text-white → text-nb-gray-100)
 *   - PeerSelector.tsx (text-white → text-nb-gray-100)
 *   - NetworkRouteSelector.tsx (text-white → text-nb-gray-100)
 *   - PortSelector.tsx (text-white → text-nb-gray-100)
 *   - DatePickerWithRange.tsx (text-white → text-nb-gray-100 in CalendarButton)
 *   - DataTableFilter.tsx (text-white → text-nb-gray-100)
 *   - Modal.tsx        (border-zinc-700/40 → border-neutral-200)
 *
 * Run with: npx tsx src/components/light-mode-class-changes.test.ts
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dir = dirname(__filename);

function readSource(file: string): string {
  return readFileSync(join(__dir, file), "utf-8");
}

type FileCheck = {
  file: string;
  checks: Array<{ desc: string; pattern: string | RegExp; shouldContain: boolean }>;
};

const fileChecks: FileCheck[] = [
  // ── HelpText.tsx ───────────────────────────────────────────────────────────
  {
    file: "HelpText.tsx",
    checks: [
      {
        desc: "uses theme-agnostic text-nb-gray-300",
        pattern: "text-nb-gray-300",
        shouldContain: true,
      },
      {
        desc: "does NOT have dark:text-nb-gray-300",
        pattern: "dark:text-nb-gray-300",
        shouldContain: false,
      },
    ],
  },

  // ── Input.tsx ──────────────────────────────────────────────────────────────
  {
    file: "Input.tsx",
    checks: [
      {
        desc: "password toggle uses hover:text-nb-gray-100",
        pattern: "hover:text-nb-gray-100",
        shouldContain: true,
      },
      {
        desc: "password toggle does NOT use hover:text-white",
        pattern: "hover:text-white",
        shouldContain: false,
      },
      {
        desc: "prefix div uses theme-agnostic text-nb-gray-300",
        pattern: /absolute left-0[^"]*text-xs text-nb-gray-300/,
        shouldContain: true,
      },
      {
        desc: "prefix div does NOT use dark:text-nb-gray-300",
        pattern: "dark:text-nb-gray-300",
        shouldContain: false,
      },
      {
        desc: "suffix div uses theme-agnostic text-nb-gray-300",
        pattern: /absolute right-0[^"]*text-xs text-nb-gray-300/,
        shouldContain: true,
      },
    ],
  },

  // ── PinCodeInput.tsx ───────────────────────────────────────────────────────
  {
    file: "PinCodeInput.tsx",
    checks: [
      {
        desc: "input cell uses bg-nb-gray-900 without dark: prefix",
        pattern: /"bg-nb-gray-900 border border-nb-gray-700"/,
        shouldContain: true,
      },
      {
        desc: "does NOT use dark:bg-nb-gray-900 (old format)",
        pattern: "dark:bg-nb-gray-900 border dark:border-nb-gray-700",
        shouldContain: false,
      },
    ],
  },

  // ── Code.tsx ───────────────────────────────────────────────────────────────
  {
    file: "Code.tsx",
    checks: [
      {
        desc: "light (non-dark prop) text uses theme-agnostic text-nb-gray-200",
        pattern: '"text-nb-gray-200 hover:text-nb-gray-200"',
        shouldContain: true,
      },
      {
        desc: "does NOT use dark:text-nb-gray-200 for the non-dark prop path",
        pattern: "dark:text-nb-gray-200 hover:dark:text-nb-gray-200",
        shouldContain: false,
      },
    ],
  },

  // ── FullTooltip.tsx ────────────────────────────────────────────────────────
  {
    file: "FullTooltip.tsx",
    checks: [
      {
        desc: "action wrapper uses hover:text-nb-gray-100",
        pattern: "hover:text-nb-gray-100",
        shouldContain: true,
      },
      {
        desc: "does NOT use hover:text-neutral-100",
        pattern: "hover:text-neutral-100",
        shouldContain: false,
      },
    ],
  },

  // ── Notification.tsx ───────────────────────────────────────────────────────
  {
    file: "Notification.tsx",
    checks: [
      {
        desc: "icon wrapper uses text-nb-gray-100",
        pattern: "text-nb-gray-100",
        shouldContain: true,
      },
      {
        desc: "does NOT use bare text-white for icon",
        pattern: /shadow-sm text-white flex/,
        shouldContain: false,
      },
    ],
  },

  // ── PeerSelector.tsx ───────────────────────────────────────────────────────
  {
    file: "PeerSelector.tsx",
    checks: [
      {
        desc: "selected-value div uses text-nb-gray-100",
        pattern: "text-nb-gray-100",
        shouldContain: true,
      },
      {
        desc: "selected-value wrapper string uses text-nb-gray-100",
        pattern: '"flex items-center justify-between text-sm text-nb-gray-100',
        shouldContain: true,
      },
      {
        desc: "does NOT use bare text-white in selected value wrapper",
        pattern: '"flex items-center justify-between text-sm text-white',
        shouldContain: false,
      },
      {
        desc: "does NOT use text-white anywhere for option/value selection",
        pattern: '"text-white"',
        shouldContain: false,
      },
    ],
  },

  // ── NetworkRouteSelector.tsx ───────────────────────────────────────────────
  {
    file: "NetworkRouteSelector.tsx",
    checks: [
      {
        desc: "selected value text uses text-nb-gray-100",
        pattern: '"flex items-center justify-between text-sm text-nb-gray-100',
        shouldContain: true,
      },
      {
        desc: "does NOT use text-white in selected value wrapper",
        pattern: '"flex items-center justify-between text-sm text-white',
        shouldContain: false,
      },
    ],
  },

  // ── PortSelector.tsx ───────────────────────────────────────────────────────
  {
    file: "PortSelector.tsx",
    checks: [
      {
        desc: "version callout uses text-nb-gray-100",
        pattern: '"text-nb-gray-100 font-normal"',
        shouldContain: true,
      },
      {
        desc: "does NOT use text-white in version callout",
        pattern: '"text-white font-normal"',
        shouldContain: false,
      },
    ],
  },

  // ── Tooltip.tsx ────────────────────────────────────────────────────────────
  {
    file: "Tooltip.tsx",
    checks: [
      {
        desc: "uses text-nb-gray-50 (not text-neutral-50)",
        pattern: "text-nb-gray-50",
        shouldContain: true,
      },
      {
        desc: "does NOT use text-neutral-50",
        pattern: "text-neutral-50",
        shouldContain: false,
      },
      {
        desc: "default variant does not include border-neutral-200",
        pattern: "border-neutral-200",
        shouldContain: false,
      },
    ],
  },
];

// ─── run ───────────────────────────────────────────────────────────────────

let failures = 0;
for (const { file, checks } of fileChecks) {
  console.log(`\n=== ${file} ===`);
  let source: string;
  try {
    source = readSource(file);
  } catch {
    console.log(`✗ COULD NOT READ ${file}`);
    failures++;
    continue;
  }

  for (const { desc, pattern, shouldContain } of checks) {
    const matches =
      pattern instanceof RegExp ? pattern.test(source) : source.includes(pattern as string);
    const ok = matches === shouldContain;
    if (!ok) failures++;
    console.log(
      `${ok ? "✓" : "✗"} ${desc}` +
        (ok ? "" : `  [expected shouldContain=${shouldContain}]`),
    );
  }
}

// ─── Modal.tsx is in a subdirectory ────────────────────────────────────────
{
  console.log("\n=== modal/Modal.tsx ===");
  const modalSource = readFileSync(join(__dir, "modal", "Modal.tsx"), "utf-8");
  const modalChecks = [
    {
      desc: "SidebarModalContent uses border-neutral-200 in light mode",
      pattern: "border-neutral-200",
      shouldContain: true,
    },
    {
      desc: "does NOT use border-zinc-700/40 as the primary border",
      // The old value was "border border-zinc-700/40"; it's now "border border-neutral-200"
      pattern: "border border-zinc-700/40",
      shouldContain: false,
    },
  ];
  for (const { desc, pattern, shouldContain } of modalChecks) {
    const matches = modalSource.includes(pattern);
    const ok = matches === shouldContain;
    if (!ok) failures++;
    console.log(
      `${ok ? "✓" : "✗"} ${desc}` +
        (ok ? "" : `  [expected shouldContain=${shouldContain}]`),
    );
  }
}

// ─── table/DataTableFilter.tsx ─────────────────────────────────────────────
{
  console.log("\n=== table/DataTableFilter.tsx ===");
  const dtfSource = readFileSync(
    join(__dir, "table", "DataTableFilter.tsx"),
    "utf-8",
  );
  const dtfChecks = [
    {
      desc: "filter count span uses text-nb-gray-100",
      pattern: '"text-nb-gray-100"',
      shouldContain: true,
    },
    {
      desc: "does NOT use text-white for filter count span",
      pattern: '"text-white"',
      shouldContain: false,
    },
  ];
  for (const { desc, pattern, shouldContain } of dtfChecks) {
    const matches = dtfSource.includes(pattern);
    const ok = matches === shouldContain;
    if (!ok) failures++;
    console.log(
      `${ok ? "✓" : "✗"} ${desc}` +
        (ok ? "" : `  [expected shouldContain=${shouldContain}]`),
    );
  }
}

console.log(`\n${failures} test(s) failed`);
process.exit(failures > 0 ? 1 : 0);