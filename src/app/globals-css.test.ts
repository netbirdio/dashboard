/**
 * Tests for globals.css CSS variable definitions.
 *
 * The PR introduced a two-ramp CSS-variable system for nb-gray:
 *   - :root defines the INVERTED ramp (light mode — high numbers = light,
 *     low numbers = dark text)
 *   - .dark defines the ORIGINAL ramp (dark mode — original values)
 *
 * These tests parse the raw CSS file as a string and verify:
 *   1. :root defines every nb-gray custom property.
 *   2. .dark defines every nb-gray custom property.
 *   3. The light and dark ramps are genuinely different (inverted) for key stops.
 *   4. All values are space-separated RGB triples (not hex, not rgb()).
 *   5. h1, h2, p now use theme-agnostic text classes (not dark:-prefixed).
 *
 * Run with: npx tsx src/app/globals-css.test.ts
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dir = dirname(__filename);
const css = readFileSync(join(__dir, "globals.css"), "utf-8");

// ─── helpers ───────────────────────────────────────────────────────────────

/**
 * Extract the value of a CSS custom property from a given block of CSS text.
 * Returns the trimmed raw value string, or null if not found.
 */
function extractVar(cssText: string, varName: string): string | null {
  // matches "--varName: VALUE;"
  const regex = new RegExp(`${varName}\\s*:\\s*([^;]+);`);
  const match = cssText.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Extract the text content between the first occurrence of `selector {` and
 * its matching closing `}`.  Naïve but sufficient for the flat blocks in
 * globals.css.
 */
function extractBlock(cssText: string, selector: string): string {
  const start = cssText.indexOf(selector);
  if (start === -1) return "";
  const brace = cssText.indexOf("{", start);
  if (brace === -1) return "";
  let depth = 1;
  let i = brace + 1;
  while (i < cssText.length && depth > 0) {
    if (cssText[i] === "{") depth++;
    else if (cssText[i] === "}") depth--;
    i++;
  }
  return cssText.slice(brace + 1, i - 1);
}

/**
 * Check that a string looks like a space-separated RGB triple, e.g. "255 255 255".
 */
function isRgbTriple(value: string): boolean {
  return /^\d{1,3}\s+\d{1,3}\s+\d{1,3}$/.test(value.trim());
}

// ─── setup ─────────────────────────────────────────────────────────────────

const rootBlock = extractBlock(css, ":root");
const darkBlock = extractBlock(css, ".dark");

const STOPS = [
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

type Check = { desc: string; ok: boolean };
const checks: Check[] = [];

// ─── 1. :root block exists ─────────────────────────────────────────────────
checks.push({
  desc: ":root block is present in globals.css",
  ok: rootBlock.length > 0,
});

// ─── 2. .dark block exists ─────────────────────────────────────────────────
checks.push({
  desc: ".dark block is present in globals.css",
  ok: darkBlock.length > 0,
});

// ─── 3. :root defines all nb-gray stops as RGB triples ─────────────────────
for (const stop of STOPS) {
  const varName =
    stop === "DEFAULT" ? "--nb-gray-DEFAULT" : `--nb-gray-${stop}`;
  const value = extractVar(rootBlock, varName);
  checks.push({
    desc: `[light/:root] ${varName} is defined as an RGB triple`,
    ok: value !== null && isRgbTriple(value),
  });
}

// ─── 4. .dark defines all nb-gray stops as RGB triples ─────────────────────
for (const stop of STOPS) {
  const varName =
    stop === "DEFAULT" ? "--nb-gray-DEFAULT" : `--nb-gray-${stop}`;
  const value = extractVar(darkBlock, varName);
  checks.push({
    desc: `[dark/.dark] ${varName} is defined as an RGB triple`,
    ok: value !== null && isRgbTriple(value),
  });
}

// ─── 5. Ramps are inverted: light-mode high stops ≠ dark-mode high stops ───
//   e.g. in light mode --nb-gray-900 should be near-white (high channels),
//        in dark mode  --nb-gray-900 should be near-dark  (low channels).
{
  const lightDefault = extractVar(rootBlock, "--nb-gray-DEFAULT");
  const darkDefault = extractVar(darkBlock, "--nb-gray-DEFAULT");
  checks.push({
    desc: "DEFAULT stop differs between light and dark mode",
    ok: lightDefault !== null && darkDefault !== null && lightDefault !== darkDefault,
  });

  // Light mode DEFAULT should be near-white (all channels high)
  if (lightDefault) {
    const channels = lightDefault.split(/\s+/).map(Number);
    checks.push({
      desc: "light mode DEFAULT is near-white (all channels >= 240)",
      ok: channels.every((c) => c >= 240),
    });
  }

  // Dark mode DEFAULT should be near-black (all channels low)
  if (darkDefault) {
    const channels = darkDefault.split(/\s+/).map(Number);
    checks.push({
      desc: "dark mode DEFAULT is near-black (all channels <= 50)",
      ok: channels.every((c) => c <= 50),
    });
  }
}

// ─── 6. Light mode 50-stop is dark text (low channels) ─────────────────────
{
  const light50 = extractVar(rootBlock, "--nb-gray-50");
  if (light50) {
    const channels = light50.split(/\s+/).map(Number);
    checks.push({
      desc: "light mode nb-gray-50 is near-black text (all channels <= 50)",
      ok: channels.every((c) => c <= 50),
    });
  }
}

// ─── 7. Dark mode 50-stop is bright text (high channels) ───────────────────
{
  const dark50 = extractVar(darkBlock, "--nb-gray-50");
  if (dark50) {
    const channels = dark50.split(/\s+/).map(Number);
    checks.push({
      desc: "dark mode nb-gray-50 is near-white text (all channels >= 220)",
      ok: channels.every((c) => c >= 220),
    });
  }
}

// ─── 8. No hex values in the CSS variable declarations ─────────────────────
{
  const hexInRoot = /#[0-9a-fA-F]{3,8}/.test(rootBlock);
  const hexInDark = /#[0-9a-fA-F]{3,8}/.test(darkBlock);
  checks.push({
    desc: ":root block contains no hard-coded hex colour values",
    ok: !hexInRoot,
  });
  checks.push({
    desc: ".dark block contains no hard-coded hex colour values",
    ok: !hexInDark,
  });
}

// ─── 9. h1, h2, p use theme-agnostic nb-gray classes ─────────────────────
{
  checks.push({
    desc: "h1 uses text-nb-gray-100 (not dark:text-nb-gray-100 or text-gray-700)",
    ok:
      css.includes("text-nb-gray-100") &&
      !css.includes("dark:text-nb-gray-100") &&
      !css.match(/h1[^}]*text-gray-700/),
  });
  checks.push({
    desc: "p uses text-nb-gray-200 (not dark:text-zinc-50 or dark:text-gray-700)",
    ok:
      css.includes("text-nb-gray-200") &&
      !css.includes("dark:text-zinc-50") &&
      !css.includes("text-gray-700"),
  });
}

// ─── 10. timescape input focus uses text-nb-gray-50 ────────────────────────
{
  checks.push({
    desc: ".timescape input:focus uses text-nb-gray-50 (not text-white)",
    ok: css.includes("text-nb-gray-50") && !css.match(/timescape[^}]*text-white/),
  });
}

// ─── run ───────────────────────────────────────────────────────────────────

console.log("=== globals.css CSS-variable definitions ===");
let failures = 0;
for (const { desc, ok } of checks) {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${desc}`);
}

console.log(`\n${failures} test(s) failed`);
process.exit(failures > 0 ? 1 : 0);