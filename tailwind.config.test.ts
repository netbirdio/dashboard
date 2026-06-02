/**
 * Tests for the nb-gray colour entries in tailwind.config.ts.
 *
 * The PR migrated nb-gray from hard-coded hex values to CSS-variable-backed
 * `rgb(var(--nb-gray-*) / <alpha-value>)` references so the colour ramp can
 * be redefined per theme in globals.css.  These tests verify:
 *   1. Every expected stop uses the CSS-variable form.
 *   2. No stop still contains a hard-coded hex value.
 *   3. The alpha-value placeholder is present (required for /opacity modifiers).
 *   4. The DEFAULT stop follows the same pattern.
 *
 * Run with: npx tsx tailwind.config.test.ts
 */

import config from "./tailwind.config.js";

type ColorMap = Record<string, string>;

// Extract the nb-gray sub-map from the Tailwind theme config.
// The config uses theme.extend.colors, so we need to unwrap carefully.
const extendedColors = (config.theme?.extend?.colors ?? {}) as Record<
  string,
  ColorMap | string
>;
const nbGray = extendedColors["nb-gray"] as ColorMap | undefined;

type Check = { desc: string; ok: boolean };

const checks: Check[] = [];

// 1. nb-gray entry must exist
checks.push({
  desc: "nb-gray color entry exists in tailwind config",
  ok: nbGray !== undefined,
});

// Only continue the rest if nbGray is actually defined
if (nbGray) {
  const expectedStops = [
    "DEFAULT",
    "50",
    "100",
    "200",
    "250",
    "300",
    "350",
    "400",
    "500",
    "600",
    "700",
    "800",
    "850",
    "900",
    "910",
    "920",
    "925",
    "930",
    "935",
    "940",
    "950",
    "960",
  ] as const;

  // 2. All expected stops are present
  for (const stop of expectedStops) {
    checks.push({
      desc: `nb-gray-${stop} stop is defined`,
      ok: stop in nbGray,
    });
  }

  // 3. Each stop uses the CSS-variable rgb() form
  for (const stop of expectedStops) {
    const value = nbGray[stop] ?? "";
    const cssVarName =
      stop === "DEFAULT" ? "--nb-gray-DEFAULT" : `--nb-gray-${stop}`;
    const usesCssVar = value.includes(`var(${cssVarName})`);
    checks.push({
      desc: `nb-gray-${stop} references CSS variable ${cssVarName}`,
      ok: usesCssVar,
    });
  }

  // 4. Each stop uses the rgb() wrapper (required for Tailwind opacity modifiers)
  for (const stop of expectedStops) {
    const value = nbGray[stop] ?? "";
    const usesRgb = value.startsWith("rgb(");
    checks.push({
      desc: `nb-gray-${stop} uses rgb() wrapper`,
      ok: usesRgb,
    });
  }

  // 5. Alpha-value placeholder is present in every stop
  for (const stop of expectedStops) {
    const value = nbGray[stop] ?? "";
    const hasAlpha = value.includes("<alpha-value>");
    checks.push({
      desc: `nb-gray-${stop} contains <alpha-value> placeholder`,
      ok: hasAlpha,
    });
  }

  // 6. No stop contains a hard-coded hex value (regression: old format was "#181A1D" etc.)
  for (const stop of expectedStops) {
    const value = nbGray[stop] ?? "";
    const hasHex = /#[0-9a-fA-F]{3,6}/.test(value);
    checks.push({
      desc: `nb-gray-${stop} does NOT contain a hard-coded hex colour`,
      ok: !hasHex,
    });
  }

  // 7. DEFAULT stop specifically
  {
    const def = nbGray["DEFAULT"] ?? "";
    checks.push({
      desc: "DEFAULT stop is rgb(var(--nb-gray-DEFAULT) / <alpha-value>)",
      ok: def === "rgb(var(--nb-gray-DEFAULT) / <alpha-value>)",
    });
  }

  // 8. Spot-check a few specific stop values
  const spotChecks: Array<{ stop: string; expected: string }> = [
    {
      stop: "50",
      expected: "rgb(var(--nb-gray-50) / <alpha-value>)",
    },
    {
      stop: "100",
      expected: "rgb(var(--nb-gray-100) / <alpha-value>)",
    },
    {
      stop: "940",
      expected: "rgb(var(--nb-gray-940) / <alpha-value>)",
    },
    {
      stop: "960",
      expected: "rgb(var(--nb-gray-960) / <alpha-value>)",
    },
  ];
  for (const { stop, expected } of spotChecks) {
    const actual = nbGray[stop] ?? "";
    checks.push({
      desc: `nb-gray-${stop} exact value check`,
      ok: actual === expected,
    });
  }
}

// ─── run checks ─────────────────────────────────────────────────────────────

console.log("=== tailwind.config — nb-gray CSS-variable migration ===");
let failures = 0;
for (const { desc, ok } of checks) {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${desc}`);
}

console.log(`\n${failures} test(s) failed`);
process.exit(failures > 0 ? 1 : 0);
