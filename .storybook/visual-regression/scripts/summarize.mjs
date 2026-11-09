// Turns the reg-cli result into something a person or an AI agent can act on
// without opening the HTML report.
//
//   node summarize.mjs <output dir> <storybook-static dir> [causes.json]
//
// Writes <output dir>/summary.json and summary.md. For each changed screenshot
// they name the story and its file, the changed region, the changed source
// files in its import graph, and for each changed region a crop that puts the
// baseline above the current state, so it can be read at a glance.
import * as fs from "node:fs";
import * as path from "node:path";

const [out, storybookDir, causesFile] = process.argv.slice(2);
if (!out || !storybookDir) {
  console.error(
    "usage: summarize.mjs <output dir> <storybook-static dir> [causes.json]",
  );
  process.exit(1);
}

const reg = JSON.parse(fs.readFileSync(path.join(out, "reg.json"), "utf-8"));
const index = JSON.parse(
  fs.readFileSync(path.join(storybookDir, "index.json"), "utf-8"),
);
const causes =
  causesFile && fs.existsSync(causesFile)
    ? JSON.parse(fs.readFileSync(causesFile, "utf-8"))
    : {};

// sharp ships with Next; without it the summary still lists the changes,
// just without regions and crops.
const sharp = await import("sharp")
  .then((m) => m.default)
  .catch(() => null);

const PAD = 24;
const crops = path.join(out, "crops");
fs.mkdirSync(crops, { recursive: true });

const CELL = 16;
const MAX_REGIONS = 5;

/* Groups changed pixels into separate regions: changed 16px cells that touch
   (with one cell of slack) form one region. A banner and a table that both
   changed become two focused crops instead of one that spans the page. */
function regionsOf(changedCells, cols, rows) {
  const seen = new Uint8Array(cols * rows);
  const regions = [];
  for (let start = 0; start < changedCells.length; start++) {
    if (!changedCells[start] || seen[start]) continue;
    const stack = [start];
    seen[start] = 1;
    let [cx0, cy0, cx1, cy1, pixels] = [cols, rows, -1, -1, 0];
    while (stack.length) {
      const c = stack.pop();
      const cx = c % cols;
      const cy = (c - cx) / cols;
      cx0 = Math.min(cx0, cx);
      cx1 = Math.max(cx1, cx);
      cy0 = Math.min(cy0, cy);
      cy1 = Math.max(cy1, cy);
      pixels += changedCells[c];
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
          const n = ny * cols + nx;
          if (changedCells[n] && !seen[n]) {
            seen[n] = 1;
            stack.push(n);
          }
        }
    }
    regions.push({ cx0, cy0, cx1, cy1, pixels });
  }
  return regions.sort((a, b) => b.pixels - a.pixels).slice(0, MAX_REGIONS);
}

async function region(shot) {
  if (!sharp) return undefined;
  const [a, b] = await Promise.all(
    ["baseline", "current"].map((side) =>
      sharp(path.join(out, side, shot))
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true }),
    ),
  );
  if (a.info.width !== b.info.width || a.info.height !== b.info.height) {
    return {
      sizeChanged: `${a.info.width}x${a.info.height} → ${b.info.width}x${b.info.height}`,
    };
  }
  const { width, height } = a.info;
  const cols = Math.ceil(width / CELL);
  const rows = Math.ceil(height / CELL);
  const changedCells = new Uint32Array(cols * rows);
  let changed = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    const delta = Math.max(
      Math.abs(a.data[i] - b.data[i]),
      Math.abs(a.data[i + 1] - b.data[i + 1]),
      Math.abs(a.data[i + 2] - b.data[i + 2]),
    );
    // Below this it's anti-aliasing noise, the same tolerance reg-cli uses.
    if (delta <= 8) continue;
    changed++;
    const p = i / 4;
    const x = p % width;
    const y = (p - x) / width;
    changedCells[Math.floor(y / CELL) * cols + Math.floor(x / CELL)]++;
  }
  if (!changed) return { changedPercent: 0, regions: [] };

  const regions = [];
  for (const [n, r] of regionsOf(changedCells, cols, rows).entries()) {
    const box = {
      left: Math.max(0, r.cx0 * CELL - PAD),
      top: Math.max(0, r.cy0 * CELL - PAD),
    };
    box.width = Math.min(width, (r.cx1 + 1) * CELL + PAD) - box.left;
    box.height = Math.min(height, (r.cy1 + 1) * CELL + PAD) - box.top;
    const [before, after] = await Promise.all(
      ["baseline", "current"].map((side) =>
        sharp(path.join(out, side, shot))
          .extract(box)
          .png()
          .toBuffer(),
      ),
    );
    const crop = path.join("crops", shot.replace(/\.png$/, `--${n + 1}.png`));
    await sharp({
      create: {
        width: box.width,
        height: box.height * 2 + 4,
        channels: 3,
        background: "#ff00ff",
      },
    })
      .composite([
        { input: before, left: 0, top: 0 },
        { input: after, left: 0, top: box.height + 4 },
      ])
      .png()
      .toFile(path.join(out, crop));
    regions.push({
      x: box.left,
      y: box.top,
      width: box.width,
      height: box.height,
      crop,
    });
  }
  return {
    changedPercent: Number(((100 * changed) / (width * height)).toFixed(2)),
    regions,
  };
}

const changes = [];
for (const shot of reg.failedItems) {
  const id = shot.replace(/(--hover|--focus)?\.png$/, "");
  const entry = index.entries[id];
  const storyFile = entry?.importPath.replace(/^\.\//, "");
  changes.push({
    shot,
    story: id,
    title: entry ? `${entry.title} / ${entry.name}` : id,
    state: shot.match(/--(hover|focus)\.png$/)?.[1] ?? "default",
    storyFile,
    images: {
      baseline: path.join("baseline", shot),
      current: path.join("current", shot),
      diff: path.join("diff", shot),
    },
    ...(await region(shot)),
    causes: causes[storyFile] ?? [],
  });
}
changes.sort((a, b) => (b.changedPercent ?? 100) - (a.changedPercent ?? 100));

const summary = {
  changed: changes.length,
  unchanged: reg.passedItems.length,
  onlyInCurrent: reg.newItems,
  onlyInBaseline: reg.deletedItems,
  affectsEverything: causes["*"] ?? [],
  changes,
};
fs.writeFileSync(
  path.join(out, "summary.json"),
  JSON.stringify(summary, null, 2),
);

const md = [
  `# Visual changes`,
  "",
  `${changes.length} changed, ${reg.passedItems.length} unchanged` +
    (reg.newItems.length ? `, ${reg.newItems.length} only in current` : "") +
    (reg.deletedItems.length
      ? `, ${reg.deletedItems.length} only in baseline`
      : "") +
    ".",
];
if (summary.affectsEverything.length) {
  md.push(
    "",
    `Changes that can affect every story: ${summary.affectsEverything
      .map((f) => `\`${f}\``)
      .join(", ")}.`,
  );
}
md.push(
  "",
  "Largest changes first. Crops show the baseline above the current state.",
  "",
);
for (const c of changes) {
  md.push(`## ${c.title}${c.state === "default" ? "" : ` (${c.state})`}`);
  md.push("");
  md.push(`- Story: \`${c.story}\` in \`${c.storyFile ?? "?"}\``);
  if (c.sizeChanged) md.push(`- Screenshot size changed: ${c.sizeChanged}`);
  if (c.regions?.length) {
    md.push(
      `- Changed: ${c.changedPercent}% of the page, ${c.regions.length} region${
        c.regions.length > 1 ? "s" : ""
      }, largest first:`,
    );
    for (const r of c.regions)
      md.push(`  - x=${r.x} y=${r.y} ${r.width}×${r.height}: \`${r.crop}\``);
  }
  md.push(
    `- Full images: \`${c.images.baseline}\`, \`${c.images.current}\`, \`${c.images.diff}\``,
  );
  if (c.causes.length) {
    const shown = c.causes
      .slice(0, 8)
      .map((f) => `\`${f}\``)
      .join(", ");
    md.push(
      `- Changed files in its imports: ${shown}${
        c.causes.length > 8 ? `, and ${c.causes.length - 8} more` : ""
      }`,
    );
  }
  md.push("");
}
const describe = (shot) => {
  const entry = index.entries[shot.replace(/(--hover|--focus)?\.png$/, "")];
  return entry ? `${entry.title} / ${entry.name}` : shot;
};
if (reg.newItems.length) {
  md.push(
    "## New stories",
    "",
    "Stories without a baseline screenshot, usually for components or pages added in this change.",
    "",
    ...reg.newItems.map((shot) => `- ${describe(shot)}: \`current/${shot}\``),
    "",
  );
}
if (reg.deletedItems.length) {
  md.push(
    "## Stories only in the baseline",
    "",
    "Stories that rendered in the baseline but not in this change: removed, renamed, or failing to render now.",
    "",
    ...reg.deletedItems.map(
      (shot) => `- ${describe(shot)}: \`baseline/${shot}\``,
    ),
    "",
  );
}
fs.writeFileSync(path.join(out, "summary.md"), md.join("\n"));
console.log(`summary: ${path.join(out, "summary.md")}`);
