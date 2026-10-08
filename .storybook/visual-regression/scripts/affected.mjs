// Lists the stories whose rendering can differ between the baseline and the
// working tree, so unchanged stories don't have to be captured at all.
//
//   node affected.mjs <storybook-static dir> <preview-stats.json> <base ref> [--all] [--filter text]
//
// Prints the affected story ids, one per line (every story when a change can
// affect all of them, or with --all), narrowed to ids containing --filter.
// A story is affected when a file changed since <base ref> is in its import
// graph (walked backwards through the Vite module graph from --stats-json).
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const [dir, statsFile, baseRef, ...rest] = process.argv.slice(2);
if (!dir || !statsFile || !baseRef) {
  console.error(
    "usage: affected.mjs <storybook-static dir> <preview-stats.json> <base ref> [--all] [--filter text]",
  );
  process.exit(1);
}
const filterAt = rest.indexOf("--filter");
const filter = filterAt === -1 ? "" : rest[filterAt + 1];

const index = JSON.parse(fs.readFileSync(path.join(dir, "index.json"), "utf-8"));
const stories = Object.values(index.entries).filter(
  (e) => e.type === "story" && e.id.includes(filter),
);
const print = (entries) => {
  if (entries.length) console.log(entries.map((e) => e.id).join("\n"));
};
const all = (reason) => {
  console.error(`all stories affected: ${reason}`);
  print(stories);
  process.exit(0);
};
if (rest.includes("--all")) all("--all");

const git = (...args) =>
  execFileSync("git", args, { encoding: "utf-8" }).split("\n").filter(Boolean);

const changed = [
  ...git("diff", "--name-only", baseRef),
  ...git("ls-files", "--others", "--exclude-standard"),
];

// Stories, their helpers and the Storybook config are copied into the
// baseline before it is built, so they are identical on both sides.
const sharedWithBaseline = (file) =>
  file.endsWith(".stories.tsx") ||
  file.startsWith("src/storybook/") ||
  file.startsWith(".storybook/");

// Files that shape every story without being imported by one: build and
// styling config, dependencies, and static assets served from public/.
const global = (file) =>
  /^(package(-lock)?\.json|tsconfig\.json|(tailwind|postcss|next)\.config\.\w+)$/.test(file) ||
  file.startsWith("public/");

const relevant = changed.filter((file) => !sharedWithBaseline(file));
const globalChange = relevant.find(global);
if (globalChange) all(`${globalChange} changed`);

const { modules } = JSON.parse(fs.readFileSync(statsFile, "utf-8"));
const importers = new Map(
  modules.map((m) => [m.id, (m.reasons ?? []).map((r) => r.moduleName)]),
);

const PREVIEW = "./.storybook/preview.tsx";
const previewImports = new Set(
  modules.filter((m) => importers.get(m.id).includes(PREVIEW)).map((m) => m.id),
);

/* Walks from one changed file up to the stories that import it. The preview
   bundle imports half the app (providers pull in buttons, dialogs, …), but
   that alone doesn't change a story's pixels, so the walk stops there. Only
   stylesheets and the preview's own providers count as affecting all stories. */
function storiesReachedFrom(start) {
  const reached = new Set();
  const queue = [start];
  const seen = new Set(queue);
  let global = previewImports.has(start);
  while (queue.length) {
    const id = queue.shift();
    if (id === PREVIEW && start.endsWith(".css")) global = true;
    if (id.startsWith("./.storybook/")) continue;
    if (id.endsWith(".stories.tsx")) reached.add(id);
    for (const importer of importers.get(id) ?? []) {
      if (!seen.has(importer)) {
        seen.add(importer);
        queue.push(importer);
      }
    }
  }
  return { reached, global };
}

const affectedFiles = new Set();
for (const file of relevant) {
  const id = `./${file}`;
  if (!importers.has(id)) continue;
  const { reached, global } = storiesReachedFrom(id);
  if (global) all(`${file} changed`);
  reached.forEach((story) => affectedFiles.add(story));
}

const affected = stories.filter((e) => affectedFiles.has(e.importPath));
console.error(
  `${relevant.length} changed files → ${affectedFiles.size} story files, ${affected.length} stories affected`,
);
print(affected);
