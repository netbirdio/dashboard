/**
 * Tests for NetBirdLogo component source structure.
 *
 * The PR introduced dual-image theme switching so the logo automatically
 * shows the light-text SVG in light mode and the dark-text SVG in dark mode:
 *
 *   - A <span> wrapping both <Image>s (one per theme) replaces the single
 *     previous <Image>.
 *   - The light-mode image has className="block dark:hidden".
 *   - The dark-mode image has className="hidden dark:block".
 *   - The mobile mark (logomark only) now always has className="md:hidden ml-4"
 *     rather than a conditional cn() call.
 *   - The netbird-full-light.svg asset is imported.
 *
 * Because this is a Next.js component that relies on next/image and SVG
 * asset imports, we verify the source text directly rather than rendering it
 * in Node.
 *
 * Run with: npx tsx src/components/NetBirdLogo.test.ts
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dir = dirname(__filename);
const source = readFileSync(join(__dir, "NetBirdLogo.tsx"), "utf-8");

type Check = { desc: string; ok: boolean };
const checks: Check[] = [];

// 1. Light-mode SVG asset is imported
checks.push({
  desc: "imports netbird-full-light.svg",
  ok: source.includes("netbird-full-light.svg"),
});

// 2. The import alias is used in the JSX
checks.push({
  desc: "NetBirdLogoFullLight is used as an Image src",
  ok: source.includes("NetBirdLogoFullLight") && source.includes("src={NetBirdLogoFullLight}"),
});

// 3. Dark-mode logo is still imported and used
checks.push({
  desc: "imports netbird-full.svg (dark logo)",
  ok: source.includes("netbird-full.svg"),
});
checks.push({
  desc: "NetBirdLogoFull is used as an Image src",
  ok: source.includes("src={NetBirdLogoFull}"),
});

// 4. Light-mode image has the correct visibility toggle class
checks.push({
  desc: "light-logo image has className=\"block dark:hidden\"",
  ok: source.includes("block dark:hidden"),
});

// 5. Dark-mode image has the correct visibility toggle class
checks.push({
  desc: "dark-logo image has className=\"hidden dark:block\"",
  ok: source.includes("hidden dark:block"),
});

// 6. Both images are wrapped in a <span> (the new structure)
checks.push({
  desc: "a wrapping <span> element is present",
  ok: source.includes("<span"),
});

// 7. The wrapping span carries the conditional hidden class for mobile
checks.push({
  desc: "wrapping span uses cn() for responsive hiding",
  ok: source.includes('cn("relative"') || source.includes("cn(\"relative\""),
});

// 8. Mobile logomark uses simple className (no unnecessary conditional)
checks.push({
  desc: "mobile mark className does not use unnecessary mobile-conditional cn",
  ok:
    source.includes('"md:hidden ml-4"') ||
    source.includes("'md:hidden ml-4'"),
});

// 9. Mobile mark still imports NetBirdLogoMark
checks.push({
  desc: "imports netbird.svg (logomark)",
  ok: source.includes("netbird.svg"),
});

// 10. sizes object is still present for both size values
checks.push({
  desc: "sizes.default is defined",
  ok: source.includes("default:"),
});
checks.push({
  desc: "sizes.large is defined",
  ok: source.includes("large:"),
});

// 11. Props still have defaults (size and mobile)
checks.push({
  desc: "size prop defaults to 'default'",
  ok: source.includes("size = \"default\""),
});
checks.push({
  desc: "mobile prop defaults to true",
  ok: source.includes("mobile = true"),
});

// 12. Alt text is preserved on both images
const altMatches = source.match(/alt=\{"NetBird Logo"\}/g);
checks.push({
  desc: "at least two images have alt='NetBird Logo'",
  ok: altMatches !== null && altMatches.length >= 2,
});

// ─── run ───────────────────────────────────────────────────────────────────

console.log("=== NetBirdLogo source checks ===");
let failures = 0;
for (const { desc, ok } of checks) {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${desc}`);
}

console.log(`\n${failures} test(s) failed`);
process.exit(failures > 0 ? 1 : 0);