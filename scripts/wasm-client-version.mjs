// Keeps the default WASM client in src/utils/config.ts from moving backwards.
//
// The default is a URL naming a netbird release. Two things can move it back:
//
//   - bump-netbird.yml, dispatched for every stable netbird tag, including a
//     patch on an older release line (v0.81.6 tagged after v0.82.0). `newest`
//     answers whether a tag is the newest stable netbird release, and the
//     workflow opens a bump only when it is.
//   - an ordinary merge that resolves the line against an older main. `compare`
//     answers whether a pull request lowers the default or points it at a
//     prerelease, and wasm-client-version.yml fails it unless it carries the
//     allow-wasm-downgrade label.
//
// Usage:
//   git ls-remote --tags --refs <netbird> 'v*' | sed 's#.*refs/tags/##' \
//     | node scripts/wasm-client-version.mjs newest v0.82.0      -> bump | skip
//   node scripts/wasm-client-version.mjs compare <base> <head>   -> ok | blocked
//
// The answer goes to stdout and the reasoning to stderr. Anything that keeps
// the script from deciding exits 1 rather than guess.

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const STABLE = /^v(\d+)\.(\d+)\.(\d+)$/;
const VERSION = /^v(\d+)\.(\d+)\.(\d+)(-.+)?$/;
// The whole path segment after /wasm/client/, so a suffix such as -rc.1 is
// read as part of the version rather than cut off.
const WASM_URL = /pkgs\.netbird\.io\/wasm\/client\/([^"'`\s/]+)/g;

export function parse(tag) {
  const m = STABLE.exec(tag);
  return m ? m.slice(1).map(Number) : null;
}

// parseVersion reads a version that may carry a prerelease suffix:
// { core: [major, minor, patch], prerelease: boolean }, or null.
function parseVersion(version) {
  const m = VERSION.exec(version);
  return m ? { core: m.slice(1, 4).map(Number), prerelease: Boolean(m[4]) } : null;
}

export function compare(a, b) {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

// newest decides whether a bump to tag should be opened, given netbird's tags.
// Prereleases never count as newer; tag itself must be among the tags, or the
// list is broken.
export function newest(tag, tags) {
  if (!parse(tag)) {
    throw new Error(`${tag} is not a stable vMAJOR.MINOR.PATCH tag`);
  }
  if (!tags.includes(tag)) {
    throw new Error(`${tag} is not among netbird's tags -- refusing to decide on a broken tag list`);
  }
  const top = tags
    .filter((t) => parse(t))
    .reduce((a, b) => (compare(parse(a), parse(b)) >= 0 ? a : b));
  if (compare(parse(tag), parse(top)) >= 0) {
    return { bump: true, reason: `${tag} is the newest netbird release` };
  }
  return { bump: false, reason: `${tag} is older than ${top} -- not bumping the default backwards` };
}

// wasmVersion returns the version the default WASM client URL names in a
// config.ts source, or null when there is none. More than one URL, or a
// version that isn't vMAJOR.MINOR.PATCH with an optional suffix, is an error:
// the check would not know what it is comparing.
export function wasmVersion(source) {
  const found = [...source.matchAll(WASM_URL)].map((m) => m[1]);
  if (found.length > 1) {
    throw new Error(`found ${found.length} WASM client URLs, expected one: ${found.join(", ")}`);
  }
  if (found.length === 1 && !parseVersion(found[0])) {
    throw new Error(`the WASM client URL names ${found[0]}, not a vMAJOR.MINOR.PATCH version`);
  }
  return found[0] ?? null;
}

// change decides whether a pull request's config.ts may land: it may not
// lower the default WASM client relative to the base branch's, or point it at
// a prerelease. Either can be deliberate, which is what the label is for.
// Against a base that names a prerelease, only the MAJOR.MINOR.PATCH core is
// compared, so moving from an RC to its release passes.
export function change(baseSource, headSource) {
  const head = wasmVersion(headSource);
  if (!head) {
    throw new Error("the pull request's config.ts names no default WASM client -- the check needs updating");
  }
  if (parseVersion(head).prerelease) {
    return { ok: false, reason: `the default WASM client names a prerelease, ${head}` };
  }
  const base = wasmVersion(baseSource);
  if (!base) {
    return { ok: true, reason: `the base names no WASM client; ${head} is new` };
  }
  if (compare(parseVersion(head).core, parseVersion(base).core) < 0) {
    return { ok: false, reason: `the default WASM client moves back from ${base} to ${head}` };
  }
  return { ok: true, reason: `the default WASM client is ${head} (base ${base})` };
}

function main([command, ...args]) {
  if (command === "newest" && args.length === 1) {
    const tags = readFileSync(0, "utf8").split("\n").map((t) => t.trim()).filter(Boolean);
    const { bump, reason } = newest(args[0], tags);
    console.error(reason);
    console.log(bump ? "bump" : "skip");
    return;
  }
  if (command === "compare" && args.length === 2) {
    const { ok, reason } = change(readFileSync(args[0], "utf8"), readFileSync(args[1], "utf8"));
    console.error(reason);
    console.log(ok ? "ok" : "blocked");
    return;
  }
  throw new Error("usage: wasm-client-version.mjs newest <tag> < tags | compare <base-config> <head-config>");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main(process.argv.slice(2));
  } catch (err) {
    console.error(`wasm-client-version: ${err.message}`);
    process.exit(1);
  }
}
