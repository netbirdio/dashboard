// Removes stories from the baseline worktree that can't build there because
// they import a file the baseline doesn't have yet (a component added on the
// branch, for example). Those stories then only exist on the current side and
// the report lists them as new.
//
//   node baseline-stories.mjs <baseline worktree>
//
// Prints each removed story file. Only checks that local imports resolve to a
// file; a missing named export is caught by the build retry in run.sh.
import * as fs from "node:fs";
import * as path from "node:path";

const [root] = process.argv.slice(2);
if (!root) {
  console.error("usage: baseline-stories.mjs <baseline worktree>");
  process.exit(1);
}

const tsconfig = JSON.parse(
  fs.readFileSync(path.join(root, "tsconfig.json"), "utf-8"),
);
const aliases = Object.entries(tsconfig.compilerOptions.paths ?? {}).map(
  ([key, [target]]) => ({
    prefix: key.replace(/\*$/, ""),
    wildcard: key.endsWith("*"),
    target: path.join(root, target.replace(/\*$/, "")),
  }),
);

const EXTENSIONS = [
  "",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  "/index.ts",
  "/index.tsx",
];
const exists = (file) => EXTENSIONS.some((ext) => fs.existsSync(file + ext));

/* Resolves an import to a path inside the worktree, or null for packages. */
function localPath(specifier, from) {
  if (specifier.startsWith("."))
    return path.resolve(path.dirname(from), specifier);
  // Exact aliases first, as tsconfig resolves them.
  const exact = aliases.find((a) => !a.wildcard && specifier === a.prefix);
  if (exact) return exact.target;
  const match = aliases
    .filter((a) => a.wildcard && specifier.startsWith(a.prefix))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];
  return match
    ? path.join(match.target, specifier.slice(match.prefix.length))
    : null;
}

function storyFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory())
      return entry.name === "node_modules" ? [] : storyFiles(full);
    return entry.name.endsWith(".stories.tsx") ? [full] : [];
  });
}

for (const file of storyFiles(path.join(root, "src"))) {
  const source = fs.readFileSync(file, "utf-8");
  const specifiers = [
    ...source.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g),
  ].map((m) => m[1]);
  const missing = specifiers.find((s) => {
    const target = localPath(s, file);
    return target !== null && !exists(target);
  });
  if (missing) {
    fs.rmSync(file);
    console.log(`${path.relative(root, file)} (imports ${missing})`);
  }
}
