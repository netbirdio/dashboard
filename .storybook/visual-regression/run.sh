#!/usr/bin/env bash
# Visual regression for the dashboard, via Storybook.
#
# Renders the same stories (src/**/*.stories.tsx) against the working tree and
# against a baseline ref, screenshots them with one headless Chrome and writes
# an HTML diff report. Only stories whose import graph contains a file changed
# since the baseline are captured, and baseline shots are cached per story.
#
#   npm run test:visual                            baseline = merge-base with origin/main
#   BASE_REF=origin/main npm run test:visual
#   npm run test:visual -- --all                   every story, not only the affected ones
#   npm run test:visual -- --filter button         only stories whose id contains "button"
#   npm run test:visual -- --theme light           light theme instead of dark
#   npm run test:visual -- --concurrency 4         parallel pages (default: CPU count)
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
OUT="$HERE/output"
CACHE="${REGRESSION_CACHE:-$HOME/.cache/netbird-dashboard-regression}"
WORKTREE="$CACHE/src/baseline"
BASE_REF="${BASE_REF:-$(git -C "$REPO" merge-base origin/main HEAD)}"

THEME=dark FILTER="" ALL=false CAPTURE_ARGS=()
while (($#)); do
  case "$1" in
    --all) ALL=true ;;
    --theme) THEME="$2"; shift ;;
    --filter) FILTER="$2"; shift ;;
    --concurrency) CAPTURE_ARGS+=(--concurrency "$2"); shift ;;
    *) echo "unknown option $1" >&2; exit 1 ;;
  esac
  shift
done
CAPTURE_ARGS+=(--theme "$THEME")

started=$SECONDS
step() { echo "› $* ($((SECONDS - started))s)"; }

# --test skips docs and addon UIs; --stats-json writes the module graph the
# affected-story detection walks.
build() {
  local dir="$1" name="$2"
  mkdir -p "$CACHE/stats/$name"
  (cd "$dir" && npx storybook build --test --quiet --disable-telemetry \
    -o "$CACHE/storybook/$name" --stats-json "$CACHE/stats/$name" \
    >"$CACHE/storybook-$name.log" 2>&1) ||
    { echo "✗ $name storybook build failed, see $CACHE/storybook-$name.log"; return 1; }
}

# A story can still fail to build against the baseline when it imports
# something that exists there but not in this form (a named export added on
# the branch). The build error names the story, which is then left out and
# the build retried.
build_baseline() {
  local excluded=0 story
  until build "$WORKTREE" baseline >/dev/null; do
    story=$(grep -oE 'src/[^" ]+\.stories\.tsx' "$CACHE/storybook-baseline.log" | head -1 || true)
    # Stop when the error doesn't point at a story, or after five exclusions
    # (each costs a build); the last exclusion still gets its build attempt.
    if [[ -z "$story" || ! -f "$WORKTREE/$story" || $excluded -ge 5 ]]; then
      echo "✗ baseline storybook build failed, see $CACHE/storybook-baseline.log"
      return 1
    fi
    echo "  not in baseline: $story (doesn't build against it)"
    rm "$WORKTREE/$story"
    excluded=$((excluded + 1))
  done
}

# Stories the baseline build left out have no baseline shot by design. They
# are noted next to the cached shots, so they don't count as missing and
# force a baseline build on every run.
note_not_in_baseline() {
  node -e '
    const fs = require("fs");
    const [current, baseline, out] = process.argv.slice(1);
    const ids = (dir) => Object.values(JSON.parse(fs.readFileSync(`${dir}/index.json`, "utf-8")).entries)
      .filter((e) => e.type === "story").map((e) => e.id);
    const known = new Set(ids(baseline));
    fs.writeFileSync(out, ids(current).filter((id) => !known.has(id)).join("\n"));
  ' "$CACHE/storybook/current" "$CACHE/storybook/baseline" "$SHOTS/.not-in-baseline"
}

rm -rf "$OUT"
mkdir -p "$OUT/current" "$OUT/baseline"

step "baseline $(git -C "$REPO" log --oneline -1 "$BASE_REF")"
if [[ -d "$WORKTREE" ]]; then
  git -C "$WORKTREE" checkout --quiet --detach --force "$BASE_REF"
else
  mkdir -p "$(dirname "$WORKTREE")"
  git -C "$REPO" worktree add --quiet --detach "$WORKTREE" "$BASE_REF"
fi

# Vite refuses to follow a node_modules symlink out of the project, so the
# baseline gets a copy-on-write clone where the filesystem supports it
# (APFS, btrfs), refreshed whenever the working tree's dependencies change.
if ! cmp -s "$REPO/package-lock.json" "$WORKTREE/.regression-lock"; then
  step "cloning node_modules into the baseline worktree"
  rm -rf "$WORKTREE/node_modules"
  cp -cR "$REPO/node_modules" "$WORKTREE/node_modules" 2>/dev/null ||
    cp -R --reflink=auto "$REPO/node_modules" "$WORKTREE/node_modules" 2>/dev/null ||
    cp -R "$REPO/node_modules" "$WORKTREE/node_modules"
  cp "$REPO/package-lock.json" "$WORKTREE/.regression-lock"
fi

# The baseline predates Storybook, so it borrows the config, the story
# helpers and every story file (colocated with its component or page).
# Excluded files are never deleted, so only stale stories get removed.
rsync -a --delete --exclude visual-regression/ "$REPO/.storybook/" "$WORKTREE/.storybook/"
rsync -a --delete "$REPO/src/storybook/" "$WORKTREE/src/storybook/"
rsync -a --delete --include='*/' --include='*.stories.tsx' --exclude='*' \
  "$REPO/src/" "$WORKTREE/src/"
# Stories for components or pages the baseline doesn't have yet can't build
# there; they are left out of the baseline and show up as new in the report.
node "$HERE/scripts/baseline-stories.mjs" "$WORKTREE" | sed 's/^/  not in baseline: /'

# Baseline shots only depend on these inputs, so they are cached per story
# under a key of all of them. The OS is part of it because fonts render
# differently across platforms; the lockfile pins Playwright's Chromium build.
KEY=$(
  {
    git -C "$REPO" rev-parse "$BASE_REF^{commit}"
    (cd "$REPO" && find .storybook src/storybook -type f -not -path "*/visual-regression/*" &&
      find src -name "*.stories.tsx" &&
      echo .storybook/visual-regression/scripts/capture.mjs package-lock.json) | LC_ALL=C sort |
      (cd "$REPO" && xargs shasum)
    uname -sm
    echo "$THEME"
  } | shasum | cut -c1-16
)
SHOTS="$CACHE/baseline-shots/$KEY"
mkdir -p "$SHOTS"
# Keep the three most recent caches.
ls -1t "$CACHE/baseline-shots" | tail -n +4 | sed "s|^|$CACHE/baseline-shots/|" | xargs rm -rf

# A first run for this key builds the baseline alongside the working tree;
# later runs only build it when some needed shot is missing from the cache.
step "building storybook"
build "$REPO" current & current_pid=$!
BASELINE_BUILT=false
if [[ -z "$(ls -A "$SHOTS")" ]]; then
  build_baseline & baseline_pid=$!
  BASELINE_BUILT=true
fi
wait $current_pid
if [[ -n "${baseline_pid:-}" ]]; then
  wait $baseline_pid
  note_not_in_baseline
  unset baseline_pid
fi

AFFECTED_ARGS=(--filter "$FILTER")
$ALL && AFFECTED_ARGS+=(--all)
node "$HERE/scripts/affected.mjs" "$CACHE/storybook/current" "$CACHE/stats/current/preview-stats.json" \
  "$BASE_REF" "${AFFECTED_ARGS[@]}" --causes "$OUT/causes.json" >"$OUT/ids.txt"
if [[ ! -s "$OUT/ids.txt" ]]; then
  echo "✓ no story is affected by the changes since the baseline"
  exit 0
fi

while read -r id; do
  [[ -f "$SHOTS/$id.png" ]] || grep -qxF "$id" "$SHOTS/.not-in-baseline" 2>/dev/null || echo "$id"
done <"$OUT/ids.txt" >"$OUT/missing.txt"
if [[ -s "$OUT/missing.txt" ]]; then
  if ! $BASELINE_BUILT; then
    step "building baseline storybook"
    build_baseline
    note_not_in_baseline
    BASELINE_BUILT=true
  fi
  step "capturing $(wc -l <"$OUT/missing.txt" | tr -d ' ') baseline stories"
  node "$HERE/scripts/capture.mjs" "$CACHE/storybook/baseline" "$SHOTS" \
    --ids "$OUT/missing.txt" "${CAPTURE_ARGS[@]}" || true
else
  echo "  baseline: all $(wc -l <"$OUT/ids.txt" | tr -d ' ') shots cached"
fi
while read -r id; do
  for shot in "$id" "$id--hover" "$id--focus"; do
    [[ -f "$SHOTS/$shot.png" ]] && cp "$SHOTS/$shot.png" "$OUT/baseline/"
  done
done <"$OUT/ids.txt"

step "capturing $(wc -l <"$OUT/ids.txt" | tr -d ' ') current stories"
node "$HERE/scripts/capture.mjs" "$CACHE/storybook/current" "$OUT/current" \
  --ids "$OUT/ids.txt" "${CAPTURE_ARGS[@]}" || true

# -M absorbs sub-pixel anti-aliasing noise; -T lets a story differ by 0.1 % of its pixels.
diff_shots() {
  # reg-cli doesn't truncate an existing reg.json, so a shorter second result
  # would leave the tail of the first one behind.
  rm -rf "$OUT/diff" "$OUT/reg.json"
  npx reg-cli "$OUT/current" "$OUT/baseline" "$OUT/diff" \
    -R "$OUT/report.html" -J "$OUT/reg.json" -M 0.1 -T 0.001 >"$OUT/reg.log" 2>&1
}

step "diffing"
CLEAN=true
if ! diff_shots; then
  # Under full load a story is occasionally screenshotted a moment too early,
  # so every difference is captured again on both sides with little else
  # running before it is reported.
  node -e '
    const r = require(process.argv[1]);
    const ids = new Set([...r.failedItems, ...r.newItems, ...r.deletedItems]
      .map((f) => f.replace(/(--hover|--focus)?\.png$/, "")));
    console.log([...ids].join("\n"));
  ' "$OUT/reg.json" >"$OUT/recheck.txt"
  step "re-checking $(wc -l <"$OUT/recheck.txt" | tr -d ' ') stories that differ"
  if ! $BASELINE_BUILT; then build_baseline && note_not_in_baseline; fi
  # The re-captured baseline only feeds this comparison; the cache keeps its
  # shots, so one unlucky re-check can't replace a good cached screenshot.
  node "$HERE/scripts/capture.mjs" "$CACHE/storybook/baseline" "$OUT/recheck-baseline" \
    --ids "$OUT/recheck.txt" --theme "$THEME" --concurrency 2 || true
  while read -r id; do
    for shot in "$id" "$id--hover" "$id--focus"; do
      [[ -f "$OUT/recheck-baseline/$shot.png" ]] && cp "$OUT/recheck-baseline/$shot.png" "$OUT/baseline/"
    done
  done <"$OUT/recheck.txt"
  node "$HERE/scripts/capture.mjs" "$CACHE/storybook/current" "$OUT/current" \
    --ids "$OUT/recheck.txt" --theme "$THEME" --concurrency 2 || true
  diff_shots || CLEAN=false
fi

# reg-cli passes stories that exist on one side only; they are still worth
# a look (a new component, a removed page), so they go into the report too.
if $CLEAN && node -e 'const r = require(process.argv[1]); process.exit(r.newItems.length + r.deletedItems.length ? 1 : 0)' "$OUT/reg.json"; then
  echo "✓ no visual differences ($((SECONDS - started))s)"
  rm -rf "$OUT/current" "$OUT/baseline" "$OUT/diff" "$OUT/recheck-baseline" "$OUT/report.html"
  exit 0
fi

grep -E "changed|passed|new|deleted" "$OUT/reg.log" | tail -3 || true
node "$HERE/scripts/summarize.mjs" "$OUT" "$CACHE/storybook/current" "$OUT/causes.json"

# Unchanged screenshots are most of the output but nothing to look at, so they
# are dropped and the report is rendered again with only the changed stories.
node -e '
  const fs = require("fs");
  const out = process.argv[1];
  const reg = JSON.parse(fs.readFileSync(`${out}/reg.json`, "utf-8"));
  const keep = new Set([...reg.failedItems, ...reg.newItems, ...reg.deletedItems]);
  for (const dir of ["current", "baseline", "diff"])
    for (const file of fs.existsSync(`${out}/${dir}`) ? fs.readdirSync(`${out}/${dir}`) : [])
      if (!keep.has(file.replace(/\.webp$/, ".png"))) fs.rmSync(`${out}/${dir}/${file}`);
  fs.writeFileSync(`${out}/reg.json`, JSON.stringify({ ...reg, passedItems: [] }));
' "$OUT"
rm -rf "$OUT/recheck-baseline"
# Like a diff, rendering a report with changes in it exits non-zero.
npx reg-cli -F "$OUT/reg.json" -R "$OUT/report.html" >>"$OUT/reg.log" 2>&1 || true
echo "✗ differences found ($((SECONDS - started))s): $OUT/report.html"
[[ -t 1 && "$(uname)" == Darwin ]] && open "$OUT/report.html" || true
