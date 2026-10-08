# Visual regression

Catches unintended visual changes by rendering the same Storybook stories
against two versions of the dashboard and diffing a screenshot of every story.

- **Baseline:** the merge-base of the current branch with `origin/main`
  (override with `BASE_REF`), checked out as a git worktree in
  `~/.cache/netbird-dashboard-regression/src/baseline`.
- **Current:** the working tree, uncommitted changes included.

No backend and no credentials: stories render pages and components with
mocked data. Playwright's pinned headless Chromium takes the screenshots and
`reg-cli` writes the diff report.

## Run

```bash
npx playwright install chromium             # once, if it isn't installed yet
npm run test:visual                         # affected stories: build, capture, diff, open the report
npm run test:visual -- --filter pages-core  # only stories whose id contains the text
npm run test:visual -- --all                # every story, affected or not
npm run test:visual -- --theme light        # the light theme instead of dark
npm run storybook                           # browse stories; toolbar switches theme and self-hosted/cloud
```

Only stories whose import graph contains a file changed since the baseline are
captured. Changes to global styles, providers, config or dependencies affect
every story. Baseline screenshots are cached per story, so a second run only
captures the working tree.

Everything lands in `.storybook/visual-regression/output/`:

- `report.html`: side-by-side and slider comparison of every changed story.
- `summary.md` / `summary.json`: the changed stories, largest first, with their
  story file, the changed region and the changed source files in their imports.
- `crops/`: each change cut to its region, baseline above current.
- `current/`, `baseline/`, `diff/`: the full screenshots.

A full run of all ~680 stories takes about 6 minutes on a laptop the first time
and about 3 minutes with a cached baseline. `--filter` brings it down to seconds.

## Let an agent fix it

`CLAUDE.md` in this folder tells an AI agent how to run the check, read
`summary.md` and the crops, tell intended changes from regressions, fix the
regressions in the source and re-run until only intended changes remain.
Claude Code picks it up when it works in this folder; for other agents, point
them at it. A prompt that works:

> Run the visual regression check for my changes and fix any unintended visual
> changes, following `.storybook/visual-regression/CLAUDE.md`.

## In CI

`.github/workflows/visual-regression.yml` runs on every pull request against
the merge-base with the PR's target branch. A line such as
`visual-regression-base: main` in the PR description compares against another
branch instead. The job doesn't fail on differences: it writes `summary.md` to
the job summary and uploads the report, summary and crops as the
`visual-regression-report` artifact. Baseline screenshots are cached between
runs with `actions/cache`.

## How it works

| Piece | Where | What it does |
| --- | --- | --- |
| Stories | `src/**/*.stories.tsx` | Colocated with what they cover: component stories next to the component (`src/components/Button.stories.tsx`), page stories next to the route's `page.tsx` (`src/app/(dashboard)/peers/Peers.stories.tsx`). Interactive states (open menus, modals, tabs) are `play` functions. |
| Story helpers | `src/storybook/*` | Shared play helpers, the `settle()` wait and fixture re-exports, imported as `@/storybook/...`. |
| Login | `.storybook/mocks/react-oidc.tsx` | Aliased in place of `@axa-fr/react-oidc`: always logged in as an owner with every permission. |
| Config | `.storybook/mocks/config.ts` | Replaces the deployment `config.json` (`require()` calls rewritten by a Vite plugin in `main.ts`). The `cloud` story tag or toolbar switch selects the cloud flavour. |
| API | `.storybook/mocks/api.ts`, `.storybook/mocks/fixtures/*` | A `fetch` interceptor answers `/api/*` from fixtures, keyed `"GET /peers/:id"`. A story can override endpoints, and external URLs by their full address, with `parameters.api`. Anything else is answered offline. |
| Affected stories | `scripts/affected.mjs` | Walks the module graph from `storybook build --stats-json` from each changed file to the stories that import it. |
| Capture | `scripts/capture.mjs` | Screenshots each story after render and `play`, with a frozen clock (2026-10-08 12:00 UTC), the `en-US` locale and finished animations. The `capture-hover` / `capture-focus` tags add real hover and keyboard-focus shots of the `[data-capture]` element. Lists API calls that had no fixture. |
| Summary | `scripts/summarize.mjs` | Turns the diff into `summary.md`, `summary.json` and the crops. |
| Pipeline | `run.sh` | Worktree and `node_modules` clone for the baseline, copies `.storybook`, `src/storybook` and every `*.stories.tsx` into it, builds, captures, diffs and summarises. |

Stories must compile against the baseline too, so they only import modules and
props that exist at the merge-base. A story for something new on a branch
breaks the baseline build until it is merged.

## Writing a story

```tsx
// src/components/Callout.stories.tsx
import { Callout } from "@components/Callout";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

const meta: Meta<typeof Callout> = {
  title: "Components/Callout",
  component: Callout,
};
export default meta;

export const Info: StoryObj<typeof Callout> = {
  args: { variant: "info", children: "Peers stay connected while you update." },
};
```

Pages follow the same pattern with `render: () => <DashboardLayout><Page /></DashboardLayout>`,
`parameters.nextjs.navigation` for the route and query, `parameters.api` for
per-story data such as empty states, and a `play` function from
`storybook/test` for open menus and modals. The page stories under
`src/app/**` are working examples.
