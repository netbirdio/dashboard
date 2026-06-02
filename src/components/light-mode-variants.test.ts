/**
 * Tests for cva variant helpers in Tooltip, InlineLink, and Label components.
 *
 * These tests replicate each component's cva call so they can run in plain
 * Node/tsx without needing the full React/Next.js environment (and without
 * the path-alias shims for @utils/helpers, etc.).
 *
 * The PR switched several components from "dark:text-neutral-50" /
 * "border-neutral-200" to theme-agnostic "text-nb-gray-50" / "border-nb-gray-*"
 * classes. The tests here verify those exact class strings are present (or
 * absent) in the generated output.
 *
 * Run with: npx tsx src/components/light-mode-variants.test.ts
 */

import { cva } from "class-variance-authority";

// ─── replicated variant helpers ─────────────────────────────────────────────

/**
 * Mirrors tooltipVariants from src/components/Tooltip.tsx (post-PR).
 * Key change: "text-neutral-50" → "text-nb-gray-50",
 *             removed "border-neutral-200" from both variants.
 */
const tooltipVariants = cva(
  [
    "z-[9999] overflow-hidden rounded-md border text-sm shadow-md",
    "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
  ],
  {
    variants: {
      variant: {
        default: ["bg-nb-gray-940", "text-nb-gray-50", "border-nb-gray-930"],
        lighter: ["bg-nb-gray-920", "text-nb-gray-50", "border-nb-gray-900"],
      },
    },
  },
);

/**
 * Mirrors linkVariants from src/components/InlineLink.tsx (post-PR).
 * Key change: "hover:text-white" → "hover:text-nb-gray-100" for both
 *             "white" and "dashed" variants.
 */
const linkVariants = cva(
  "underline-offset-4 items-center transition-all duration-200 inline-flex texts-inherit gap-1",
  {
    variants: {
      variant: {
        default: "text-netbird hover:underline font-normal",
        faded: "text-nb-gray-400 hover:text-nb-gray-300 hover:underline",
        white: "text-nb-gray-100 hover:text-nb-gray-100 hover:underline",
        dashed:
          "text-nb-gray-100/90 underline font-normal decoration-dashed hover:text-nb-gray-100",
      },
    },
  },
);

/**
 * Mirrors labelVariants from src/components/Label.tsx (post-PR).
 * Key change: "dark:text-nb-gray-200" → "text-nb-gray-200".
 */
const labelVariants = cva(
  "text-sm font-medium tracking-wider leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-1.5 inline-block text-nb-gray-200 flex items-center gap-2",
);

// ─── runner ────────────────────────────────────────────────────────────────

type Check = { desc: string; classes: string[]; notClasses?: string[] };

function checkVariant(name: string, result: string, checks: Check[]): number {
  console.log(`\n=== ${name} ===`);
  let failures = 0;
  for (const { desc, classes, notClasses = [] } of checks) {
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
// Tooltip variants
// ────────────────────────────────────────────────────────────────────────────

failures += checkVariant(
  "tooltipVariants — default",
  tooltipVariants({ variant: "default" }),
  [
    {
      desc: "uses nb-gray text",
      classes: ["text-nb-gray-50"],
      notClasses: ["text-neutral-50"],
    },
    {
      desc: "uses nb-gray border (not neutral-200)",
      classes: ["border-nb-gray-930"],
      notClasses: ["border-neutral-200"],
    },
    {
      desc: "background unchanged",
      classes: ["bg-nb-gray-940"],
    },
    {
      desc: "base animation classes present",
      classes: ["animate-in", "fade-in-0"],
    },
  ],
);

failures += checkVariant(
  "tooltipVariants — lighter",
  tooltipVariants({ variant: "lighter" }),
  [
    {
      desc: "uses nb-gray text",
      classes: ["text-nb-gray-50"],
      notClasses: ["text-neutral-50"],
    },
    {
      desc: "uses nb-gray border (not neutral-200)",
      classes: ["border-nb-gray-900"],
      notClasses: ["border-neutral-200"],
    },
    {
      desc: "lighter background",
      classes: ["bg-nb-gray-920"],
    },
    {
      desc: "darker background not mixed in",
      notClasses: ["bg-nb-gray-940"],
    },
  ],
);

// ────────────────────────────────────────────────────────────────────────────
// InlineLink variants
// ────────────────────────────────────────────────────────────────────────────

failures += checkVariant(
  "linkVariants — white",
  linkVariants({ variant: "white" }),
  [
    {
      desc: "text colour uses nb-gray-100",
      classes: ["text-nb-gray-100"],
      notClasses: ["text-white"],
    },
    {
      desc: "hover stays on nb-gray-100 (not white)",
      classes: ["hover:text-nb-gray-100"],
      notClasses: ["hover:text-white"],
    },
    {
      desc: "underline on hover",
      classes: ["hover:underline"],
    },
  ],
);

failures += checkVariant(
  "linkVariants — dashed",
  linkVariants({ variant: "dashed" }),
  [
    {
      desc: "text colour uses nb-gray-100/90",
      classes: ["text-nb-gray-100/90"],
    },
    {
      desc: "hover uses nb-gray-100 (not white)",
      classes: ["hover:text-nb-gray-100"],
      notClasses: ["hover:text-white"],
    },
    {
      desc: "decoration style",
      classes: ["decoration-dashed", "underline"],
    },
  ],
);

failures += checkVariant(
  "linkVariants — default (regression)",
  linkVariants({ variant: "default" }),
  [
    {
      desc: "default variant unchanged",
      classes: ["text-netbird", "hover:underline"],
    },
  ],
);

failures += checkVariant(
  "linkVariants — faded (regression)",
  linkVariants({ variant: "faded" }),
  [
    {
      desc: "faded variant unchanged",
      classes: ["text-nb-gray-400", "hover:text-nb-gray-300"],
    },
  ],
);

// ────────────────────────────────────────────────────────────────────────────
// Label variants
// ────────────────────────────────────────────────────────────────────────────

failures += checkVariant(
  "labelVariants — base",
  labelVariants(),
  [
    {
      desc: "text colour is theme-agnostic nb-gray-200",
      classes: ["text-nb-gray-200"],
      notClasses: ["dark:text-nb-gray-200"],
    },
    {
      desc: "typography classes present",
      classes: [
        "text-sm",
        "font-medium",
        "tracking-wider",
        "leading-none",
        "mb-1.5",
        "inline-block",
      ],
    },
    {
      desc: "disabled peer styles present",
      classes: [
        "peer-disabled:cursor-not-allowed",
        "peer-disabled:opacity-70",
      ],
    },
    {
      desc: "flex layout classes present",
      classes: ["flex", "items-center", "gap-2"],
    },
  ],
);

// ────────────────────────────────────────────────────────────────────────────
// Boundary / negative cases
// ────────────────────────────────────────────────────────────────────────────

// tooltip: ensure neither variant leaks the other's background
{
  const def = tooltipVariants({ variant: "default" });
  const lighter = tooltipVariants({ variant: "lighter" });
  const ok1 = !def.includes("bg-nb-gray-920");
  const ok2 = !lighter.includes("bg-nb-gray-940");
  if (!ok1) failures++;
  if (!ok2) failures++;
  console.log(
    `\n=== tooltipVariants — no cross-contamination ===\n` +
      `${ok1 ? "✓" : "✗"} default does not contain bg-nb-gray-920\n` +
      `${ok2 ? "✓" : "✗"} lighter does not contain bg-nb-gray-940`,
  );
}

// linkVariants: calling with no variant falls back to base classes only
{
  const base = linkVariants({});
  const hasBase = base.includes("underline-offset-4");
  if (!hasBase) failures++;
  console.log(
    `\n=== linkVariants — no variant arg ===\n` +
      `${hasBase ? "✓" : "✗"} base classes present when no variant is specified`,
  );
}

console.log(`\n${failures} test(s) failed`);
process.exit(failures > 0 ? 1 : 0);