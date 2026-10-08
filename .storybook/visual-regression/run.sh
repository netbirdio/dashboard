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
  build "$WORKTREE" baseline & baseline_pid=$!
  BASELINE_BUILT=true
fi
wait $current_pid

AFFECTED_ARGS=(--filter "$FILTER")
$ALL && AFFECTED_ARGS+=(--all)
node "$HERE/scripts/affected.mjs" "$CACHE/storybook/current" "$CACHE/stats/current/preview-stats.json" \
  "$BASE_REF" "${AFFECTED_ARGS[@]}" --causes "$OUT/causes.json" >"$OUT/ids.txt"
if [[ ! -s "$OUT/ids.txt" ]]; then
  [[ -n "${baseline_pid:-}" ]] && wait $baseline_pid
  echo "✓ no story is affected by the changes since the baseline"
  exit 0
fi

while read -r id; do [[ -f "$SHOTS/$id.png" ]] || echo "$id"; done <"$OUT/ids.txt" >"$OUT/missing.txt"
if [[ -s "$OUT/missing.txt" ]]; then
  if [[ -n "${baseline_pid:-}" ]]; then wait $baseline_pid; else
    step "building baseline storybook"
    build "$WORKTREE" baseline
    BASELINE_BUILT=true
  fi
  step "capturing $(wc -l <"$OUT/missing.txt" | tr -d ' ') baseline stories"
  node "$HERE/scripts/capture.mjs" "$CACHE/storybook/baseline" "$SHOTS" \
    --ids "$OUT/missing.txt" "${CAPTURE_ARGS[@]}" || true
else
  [[ -n "${baseline_pid:-}" ]] && wait $baseline_pid
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
  rm -rf "$OUT/diff"
  npx reg-cli "$OUT/current" "$OUT/baseline" "$OUT/diff" \
    -R "$OUT/report.html" -J "$OUT/reg.json" -M 0.1 -T 0.001 --diffFormat png >"$OUT/reg.log" 2>&1
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
  if ! $BASELINE_BUILT; then build "$WORKTREE" baseline; fi
  node "$HERE/scripts/capture.mjs" "$CACHE/storybook/baseline" "$SHOTS" \
    --ids "$OUT/recheck.txt" --theme "$THEME" --concurrency 2 || true
  while read -r id; do
    for shot in "$id" "$id--hover" "$id--focus"; do
      [[ -f "$SHOTS/$shot.png" ]] && cp "$SHOTS/$shot.png" "$OUT/baseline/"
    done
  done <"$OUT/recheck.txt"
  node "$HERE/scripts/capture.mjs" "$CACHE/storybook/current" "$OUT/current" \
    --ids "$OUT/recheck.txt" --theme "$THEME" --concurrency 2 || true
  diff_shots || CLEAN=false
fi

if $CLEAN; then
  echo "✓ no visual differences ($((SECONDS - started))s)"
else
  tail -3 "$OUT/reg.log"
  node "$HERE/scripts/summarize.mjs" "$OUT" "$CACHE/storybook/current" "$OUT/causes.json"
  echo "✗ differences found ($((SECONDS - started))s): $OUT/report.html"
fi
[[ -t 1 && "$(uname)" == Darwin ]] && open "$OUT/report.html" || true
