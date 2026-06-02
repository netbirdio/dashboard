/**
 * Tests for buttonVariants — the cva variant helper exported from Button.tsx.
 *
 * These tests cover the light-mode additions introduced in the light-mode draft
 * PR. The key changes were:
 *   - danger-outline: added explicit light-mode styles (bg-transparent, text-red-600, etc.)
 *   - danger-text:    made fully theme-agnostic (dropped the dark:-prefixed classes)
 *   - default-outline: made fully theme-agnostic (dropped the dark:-prefixed classes)
 *   - danger:         added explicit light-mode enabled/disabled styles
 *
 * Run with: npx tsx src/components/Button.test.ts
 */

import { buttonVariants } from "./Button.js";

type Case = { desc: string; classes: string[]; notClasses?: string[] };

function run(name: string, cases: Case[], fn: () => string): number {
  console.log(`\n=== ${name} ===`);
  let failures = 0;
  const result = fn();
  for (const { desc, classes, notClasses = [] } of cases) {
    for (const cls of classes) {
      const ok = result.includes(cls);
      if (!ok) failures++;
      console.log(
        `${ok ? "✓" : "✗"} [${desc}] contains "${cls}"` +
          (ok ? "" : `  (actual: "${result}")`),
      );
    }
    for (const cls of notClasses) {
      const ok = !result.includes(cls);
      if (!ok) failures++;
      console.log(
        `${ok ? "✓" : "✗"} [${desc}] does NOT contain "${cls}"` +
          (ok ? "" : `  (actual: "${result}")`),
      );
    }
  }
  return failures;
}

let failures = 0;

// ────────────────────────────────────────────────────────────────────────────
// danger-outline variant
// ────────────────────────────────────────────────────────────────────────────
failures += run(
  "buttonVariants — danger-outline",
  [
    {
      desc: "light-mode base",
      classes: [
        "bg-transparent",
        "text-red-600",
        "border-red-300",
        "hover:bg-red-50",
        "hover:border-red-400",
        "focus:ring-red-500/30",
      ],
    },
    {
      desc: "dark-mode overrides preserved",
      classes: [
        "dark:bg-transparent",
        "dark:text-red-500",
        "dark:border-transparent",
      ],
    },
  ],
  () => buttonVariants({ variant: "danger-outline" }),
);

// ────────────────────────────────────────────────────────────────────────────
// danger-text variant
// ────────────────────────────────────────────────────────────────────────────
failures += run(
  "buttonVariants — danger-text",
  [
    {
      desc: "theme-agnostic text",
      classes: ["text-red-500", "hover:text-red-600"],
    },
    {
      desc: "no padding / shadow",
      classes: ["border-transparent", "!px-0", "!shadow-none", "!py-0"],
    },
    {
      desc: "focus ring",
      classes: ["focus:ring-red-500/30"],
    },
    {
      desc: "ring offset is theme-agnostic (no dark: prefix)",
      classes: ["ring-offset-nb-gray-950/50"],
      notClasses: ["dark:ring-offset-neutral-950/50"],
    },
  ],
  () => buttonVariants({ variant: "danger-text" }),
);

// ────────────────────────────────────────────────────────────────────────────
// default-outline variant
// ────────────────────────────────────────────────────────────────────────────
failures += run(
  "buttonVariants — default-outline",
  [
    {
      desc: "ring offset and focus ring are theme-agnostic",
      classes: ["ring-offset-nb-gray-950/50", "focus:ring-nb-gray-500/20"],
    },
    {
      desc: "light/dark-agnostic base styles",
      classes: [
        "bg-transparent",
        "text-nb-gray-400",
        "border-transparent",
        "hover:text-nb-gray-50",
        "hover:bg-nb-gray-900/30",
        "hover:border-nb-gray-800/50",
      ],
    },
    {
      desc: "data-state=open styles are theme-agnostic",
      classes: [
        "data-[state=open]:text-nb-gray-50",
        "data-[state=open]:bg-nb-gray-900/30",
        "data-[state=open]:border-nb-gray-800/50",
      ],
    },
    {
      desc: "no leftover dark:-only prefix variants for core styles",
      notClasses: [
        "dark:ring-offset-nb-gray-950/50",
        "dark:focus:ring-nb-gray-500/20",
        "dark:bg-transparent",
        "dark:text-nb-gray-400",
        "data-[state=open]:dark:text-nb-gray-50",
      ],
    },
  ],
  () => buttonVariants({ variant: "default-outline" }),
);

// ────────────────────────────────────────────────────────────────────────────
// danger variant
// ────────────────────────────────────────────────────────────────────────────
failures += run(
  "buttonVariants — danger",
  [
    {
      desc: "light-mode enabled state",
      classes: [
        "enabled:bg-red-600",
        "enabled:text-white",
        "enabled:hover:bg-red-700",
        "enabled:focus:bg-red-700",
        "enabled:focus:ring-red-400/50",
      ],
    },
    {
      desc: "light-mode disabled state",
      classes: [
        "disabled:bg-red-300",
        "disabled:text-white",
        "border-red-600",
      ],
    },
    {
      desc: "dark-mode overrides preserved",
      classes: [
        "dark:bg-red-600",
        "dark:text-red-100",
        "hover:dark:bg-red-700",
      ],
    },
  ],
  () => buttonVariants({ variant: "danger" }),
);

// ────────────────────────────────────────────────────────────────────────────
// Unchanged variants — regression check: ensure they still work
// ────────────────────────────────────────────────────────────────────────────
failures += run(
  "buttonVariants — primary (regression)",
  [
    {
      desc: "primary still has netbird colour",
      classes: ["enabled:dark:bg-netbird", "enabled:bg-netbird"],
    },
  ],
  () => buttonVariants({ variant: "primary" }),
);

failures += run(
  "buttonVariants — default (regression)",
  [
    {
      desc: "default variant still renders",
      classes: ["bg-white", "text-gray-900"],
    },
  ],
  () => buttonVariants({ variant: "default" }),
);

// ────────────────────────────────────────────────────────────────────────────
// Size and rounding defaults
// ────────────────────────────────────────────────────────────────────────────
failures += run(
  "buttonVariants — default size and rounding",
  [
    {
      desc: "default size is md",
      classes: ["py-2.5", "px-4"],
    },
    {
      desc: "default rounded is true",
      classes: ["rounded-md"],
    },
  ],
  () => buttonVariants({}),
);

// ────────────────────────────────────────────────────────────────────────────
// Edge: danger-outline with extra className override doesn't lose base classes
// ────────────────────────────────────────────────────────────────────────────
{
  const cls = buttonVariants({ variant: "danger-outline" });
  const ok =
    cls.includes("text-red-600") && cls.includes("border-red-300");
  if (!ok) failures++;
  console.log(
    `\n=== danger-outline boundary ===\n${ok ? "✓" : "✗"} light-mode base classes present when called without extra options`,
  );
}

console.log(`\n${failures} test(s) failed`);
process.exit(failures > 0 ? 1 : 0);