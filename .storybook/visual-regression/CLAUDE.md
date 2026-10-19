# Fixing visual regressions

Instructions for an agent asked to check a change for visual regressions and
fix them. See `README.md` for how the tooling works.

## The loop

1. Run `npm run test:visual` from the repo root. It compares the working tree
   with the merge-base of `origin/main` (set `BASE_REF` for another baseline)
   and only captures stories affected by the changed files.
2. If it prints "no visual differences" or "no story is affected", stop.
3. Read `.storybook/visual-regression/output/summary.md`. Changes are sorted
   largest first. For each one, look at the crop image it names: the
   baseline is on top, the current state below, separated by a magenta line.
   Open the full `baseline`, `current` and `diff` images when the crop isn't
   enough context.
4. Decide for every change whether it is **intended** or a **regression** (see
   below). When you can't tell, ask instead of guessing.
5. Fix regressions in the source, never in the stories, mocks or tooling.
   "Changed files in its imports" in the summary lists the likely causes; the
   change usually sits in one of them. Prefer restoring the old look through
   the design tokens and existing variants over hard-coding colours.
6. Re-run only what you touched, e.g.
   `npm run test:visual -- --filter components-button`. A story id starts with
   its title, lowercased and joined with dashes (`Pages/Core/Peers` becomes
   `pages-core-peers--…`).
7. Repeat until every remaining change is intended, then run once without
   `--filter` to confirm nothing else moved.

New stories (listed under "New stories" in the summary) have no baseline. Look
at their screenshots to check that the new UI renders as intended. "Stories
only in the baseline" either belong to something the change removed or
renamed, or fail to render now; the second is a regression.

## Intended or regression?

A change is **intended** when the task or the diff clearly asks for it: a new
element, a redesign the PR describes, copy that was rewritten on purpose.

A change is a **regression** when nothing in the task asks for it, typically:

- Colours, contrast or opacity shifted on elements the change didn't mean to
  restyle (text getting dimmer or brighter, borders or backgrounds changing).
- Layout moved: spacing, alignment, sizes, wrapping, or a screenshot whose
  height changed.
- Something disappeared, is clipped, overlaps, or a state (hover, focus,
  open menu) no longer looks like it did.
- The same small change repeated across many stories usually points to one
  shared component or token; fix it there once.

## Things not to do

- Don't edit a story, fixture or mock so a difference goes away. Those exist
  identically on both sides, so the difference comes from the app code.
- Don't change the baseline, the thresholds in `run.sh` or the capture script
  to make a diff pass.
- Don't "fix" an intended change back. If a PR redesigns something, its diff is
  expected; report it instead.

## Flaky results

If a story differs between two runs of the same code, it is non-deterministic,
not a regression. Common causes are timers, random values, focus rings and
animations. Fix the story (wait for the element in its `play` function, seed
the randomness) and mention it in your report.

## Report

End with a short list: what you fixed (story, cause, file), what you judged as
intended and why, and anything you couldn't decide.
