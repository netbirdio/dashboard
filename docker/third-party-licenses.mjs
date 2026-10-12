// Prints the third-party terms for the static export in out/ to stdout.
// Package versions come from package-lock.json and the license texts from an
// installed node_modules (run `npm ci` first).
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");

// Build tools whose own code is emitted into out/: tailwindcss generates the
// preflight and utility CSS.
const bundledTooling = new Set(["node_modules/tailwindcss"]);

// Inter ships as a font file rather than a package, so its OFL lives beside it.
const staticTerms = [
  {
    title: "Inter 3.019 (git-0a5106e0b), SIL Open Font License 1.1",
    file: "src/assets/fonts/OFL.txt",
  },
];

const termPattern = /^(licen[cs]e|copying|notice|patents)/i;

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function shippedPackages(lock) {
  return Object.entries(lock.packages)
    .filter(([path, meta]) => path !== "" && (!meta.dev || bundledTooling.has(path)))
    .sort(([a], [b]) => Number(a > b) - Number(a < b));
}

function packageSection(path, meta) {
  const dir = join(rootDir, path);
  const manifest = join(dir, "package.json");
  if (!existsSync(manifest)) {
    // Platform-specific optional binaries (e.g. @next/swc-*) are only
    // installed on their own platform and never end up in out/.
    if (meta.optional) return null;
    fail(`${path} is not installed; run npm ci`);
  }
  const installed = JSON.parse(readFileSync(manifest, "utf8"));
  if (installed.version !== meta.version) {
    fail(`${path} is ${installed.version}, package-lock.json pins ${meta.version}`);
  }

  const name = path.slice(path.lastIndexOf("node_modules/") + "node_modules/".length);
  const terms = readdirSync(dir).filter((name) => termPattern.test(name)).sort();
  if (terms.length === 0) {
    // Some packages ship no license file; record the declared license instead.
    return `=== ${name} ${meta.version} ===\n\nLicense: ${installed.license ?? meta.license ?? "UNKNOWN"}`;
  }

  return terms
    .map((term) => `=== ${name} ${meta.version} (${term}) ===\n\n${readFileSync(join(dir, term), "utf8")}`)
    .join("\n\n");
}

const lock = JSON.parse(readFileSync(join(rootDir, "package-lock.json"), "utf8"));
const sections = shippedPackages(lock)
  .map(([path, meta]) => packageSection(path, meta))
  .filter(Boolean);
for (const { title, file } of staticTerms) {
  sections.push(`=== ${title} ===\n\n${readFileSync(join(rootDir, file), "utf8")}`);
}

process.stdout.write(
  "Third-party terms for the NetBird dashboard static export.\n" +
    "Generated from package-lock.json at build time.\n\n\n" +
    sections.join("\n\n\n") +
    "\n",
);
